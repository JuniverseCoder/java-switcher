import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

// You will need to define these interfaces and classes.
export interface IDetectedJdk {
	name: string;
	path: string;
}

class DetectedJdkArray extends Array<IDetectedJdk> {
	pushJdk(source: string, jdk: IDetectedJdk | undefined) {
		if (jdk) {
			this.push({ ...jdk, name: `${jdk.name} (${source})` });
		}
	}
	async pushByReadingDir(source: string, ...dirPaths: string[]) {
		for (const dirPath of dirPaths) {
			try {
				const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.isDirectory()) {
						const fullPath = path.join(dirPath, entry.name);
						if (isValidJdkPath(fullPath)) {
							this.pushJdk(source, { path: fullPath, name: path.basename(fullPath) });
						}
					}
				}
			} catch (error) {
				// Ignore errors if the directory doesn't exist
			}
		}
	}
}

export function getJavaVersionFromName(name: string): string {
    const match = name.match(/\d+(\.\d+)*$/);
    return match ? match[0] : name;
}

export function isValidJdkPath(jdkPath: string): boolean {
    if (!fs.existsSync(jdkPath)) {
        return false;
    }
    const javaExecutable = os.platform() === 'win32' ? 'bin\\java.exe' : 'bin/java';
    return fs.existsSync(path.join(jdkPath, javaExecutable));
}

export function resolveJavaVersion(jdkPath: string): string | undefined {
    // Try to parse from the 'release' file first
    const releaseFile = path.join(jdkPath, 'release');
    if (fs.existsSync(releaseFile)) {
        const content = fs.readFileSync(releaseFile, 'utf-8');
        const match = content.match(/^JAVA_VERSION="((1\.)?\d+).+"/m);
        if (match) {
            return match[1];
        }
    }

    // Fallback to executing 'java -version'
    const javaExecutable = os.platform() === 'win32' ? 'bin\\java.exe' : 'bin/java';
    const javaCommand = `"${path.join(jdkPath, javaExecutable)}" -version`;
    try {
        const output = execSync(javaCommand, { encoding: 'utf-8' });
        const match = output.match(/version\s+"(\d+(\.\d+)*)[^"]*"/);
        return match ? match[1] : undefined;
    } catch (error) {
        console.error(`Error executing '${javaCommand}':`, error);
        return undefined;
    }
}


const system = {
	readString: (filePath: string) => {
		try {
			return fs.readFileSync(filePath, 'utf-8');
		} catch (e) {
			return '';
		}
	}
}

const OS = {
	isWindows: os.platform() === 'win32',
	isMac: os.platform() === 'darwin',
	isLinux: os.platform() === 'linux'
};

export async function findJdks(): Promise<IDetectedJdk[]> {
	const jdks: DetectedJdkArray = new DetectedJdkArray();
	const env = process.env;
	const promises = [
		async () => {
			// Windows distributors not supported by jdk-utils
			// https://github.com/Eskibear/node-jdk-utils/blob/main/src/from/windows.ts
			if (!OS.isWindows) { return; }
			for (const programDir of [env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean) as string[]) {
				const dists = ['BellSoft', 'OpenJDK', 'RedHat', 'Semeru'];
				const patterns = dists.map(s => path.join(programDir, s));
				await jdks.pushByReadingDir('Windows', ...patterns);
			}
		},
		async () => {
			// Scoop (Windows)
			// e.g. C:\ProgramData\scoop\apps\sapmachine18-jdk\18.0.2.1\bin
			// C:\Users\<UserName>\scoop\apps\sapmachine18-jdk\18.0.2.1\bin
			if (!OS.isWindows) { return; }
			const userDir = env.SCOOP ?? path.join(os.homedir(), 'scoop');
			const globalDir = env.SCOOP_GLOBAL ?? path.join(env.ProgramData ?? '', 'scoop');
			const patterns = [userDir, globalDir].map(s => path.join(s, 'apps'));
			await jdks.pushByReadingDir('Scoop', ...patterns);
		},
		async () => {
			// mise (Linux, Mac)
			// e.g. Linux ~/.local/share/mise/installs/java/21.0.1-open/bin
			// e.g. Mac   ~/.local/share/mise/installs/java/21.0.1-open/Contents/Home/bin
			if (OS.isWindows) { return; }
			let pattern = os.homedir() + '/.local/share/mise/installs/java';
			if (OS.isMac) { pattern += '/*/Contents'; }
			await jdks.pushByReadingDir('mise', pattern);
		},
		async () => {
			// vfox (Multi-Platform)
			// e.g. C:\Users\<UserName>\.version-fox\cache\java\v-22+36\java-22+36\bin
			await jdks.pushByReadingDir('vfox', path.join(os.homedir(), '.version-fox', 'cache', 'java'));
		},
		async () => {
			// Maven Toolchains
			// https://maven.apache.org/guides/mini/guide-using-toolchains.html
			const xml = system.readString(path.join(os.homedir(), '.m2', 'toolchains.xml')) || '';
			for (const match of xml.matchAll(/<jdkHome>([^<].+)<\/jdkHome>/g)) {
				const jdkPath = match[0].trim();
				if (isValidJdkPath(jdkPath)) {
					jdks.pushJdk('Maven', { path: jdkPath, name: path.basename(jdkPath) });
				}
			}
		},
		async () => {
			// IntelliJ (Windows, Linux)
			// e.g. C:\Users\<UserName>\.jdks\openjdk-20.0.1\bin
			if (OS.isMac) { return; } // Supported jdk-utils Mac.ts: /Library/Java/JavaVirtualMachines
			const pattern = path.join(os.homedir(), '.jdks');
			await jdks.pushByReadingDir('IntelliJ', pattern);
		},
		async () => {
			// Pleiades (Windows, Mac)
			if (OS.isWindows) {
				// e.g.    C:\pleiades\java\17\bin
				// C:\pleiades\2023-03\java\17\bin
				const patterns = ['c', 'd'].flatMap(drive => ['', '20*/'].map(p => `${drive}:/pleiades*/${p}java`));
				await jdks.pushByReadingDir('Pleiades', ...patterns);
			} else if (OS.isMac) {
				// Pleiades 2024+ aarch64 new path format (21/Home/bin -> 21/bin)
				// e.g. /Applications/Eclipse_2024-12.app/Contents/java/21/bin
				// This path still contains a glob pattern, which pushByReadingDir cannot handle.
				// For now, we will skip this until a more robust solution is implemented.
				// await jdks.pushByGlob('Pleiades', '/Applications/Eclipse_20*.app/Contents/java');
			}
		},
		async () => {
			// Common (Windows)
			// e.g. C:\Java\jdk21.0.2\bin
			if (!OS.isWindows) { return; }
			const patterns = ['c', 'd'].map(drive => `${drive}:/java`);
			await jdks.pushByReadingDir('Common', ...patterns);
		},
	];

    // Look for common environment variables
    const javaHome = env.JAVA_HOME;
    if (javaHome) {
        promises.push(async () => {
            if (isValidJdkPath(javaHome)) {
                jdks.pushJdk('JAVA_HOME', { path: javaHome, name: path.basename(javaHome) });
            }
        });
    }

 await Promise.allSettled(promises.map(p => p()));
	return jdks;
}