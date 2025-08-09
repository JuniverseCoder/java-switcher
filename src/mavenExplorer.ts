import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export interface MavenInstallation {
    name: string;
    path: string;
}

async function findMavenFromEnv(): Promise<string[]> {
    const mavenHomes: string[] = [];
    for (const envVar of ["MAVEN_HOME", "M2_HOME"]) {
        const home = process.env[envVar];
        if (home) {
            const mvnPath = path.join(home, "bin", "mvn");
            if (fs.existsSync(mvnPath)) {
                mavenHomes.push(home);
            }
        }
    }
    return mavenHomes;
}

async function findMavenFromPath(): Promise<string[]> {
    const mavenHomes: string[] = [];
    const paths = process.env.PATH?.split(path.delimiter);
    if (paths) {
        for (const p of paths) {
            const mvnPath = path.join(p, "mvn");
            if (fs.existsSync(mvnPath)) {
                // Found mvn, the parent directory is the bin directory.
                // The maven home is the parent of the bin directory.
                const home = path.dirname(path.dirname(mvnPath));
                mavenHomes.push(home);
            }
        }
    }
    return mavenHomes;
}

async function findMavenFromCommonPaths(): Promise<string[]> {
    const mavenHomes: string[] = [];
    const isWindows = process.platform === 'win32';
    let commonPaths: string[] = [];
    if (isWindows) {
        commonPaths = [
            'C:\\Program Files\\Apache\\maven',
            'C:\\Program Files (x86)\\Apache\\maven',
        ];
        const userProfile = process.env.USERPROFILE;
        if (userProfile) {
            commonPaths.push(path.join(userProfile, '.sdkman', 'candidates', 'maven'));
        }
    } else {
        commonPaths = [
            '/usr/local/apache-maven',
            '/opt/apache-maven',
            '/opt/maven',
            '/usr/share/maven',
            '/usr/local/Cellar/maven', // for Homebrew
        ];
        const home = process.env.HOME;
        if (home) {
            commonPaths.push(path.join(home, 'sdkman', 'candidates', 'maven'));
            commonPaths.push(path.join(home, 'tools'));
        }
    }

    for (const p of commonPaths) {
        if (fs.existsSync(p)) {
            const mvnPath = path.join(p, "bin", "mvn");
            if (fs.existsSync(mvnPath)) {
                mavenHomes.push(p);
            } else {
                // scan subdirectories
                const subdirs = fs.readdirSync(p).map(subdir => path.join(p, subdir));
                for (const subdir of subdirs) {
                    const mvnPath = path.join(subdir, "bin", "mvn");
                    if (fs.existsSync(mvnPath)) {
                        mavenHomes.push(subdir);
                    }
                }
            }
        }
    }
    return mavenHomes;
}

export async function findMavens(): Promise<string[]> {
    const mavenPaths = new Set<string>();

    (await findMavenFromEnv()).forEach(p => mavenPaths.add(p));
    (await findMavenFromPath()).forEach(p => mavenPaths.add(p));
    (await findMavenFromCommonPaths()).forEach(p => mavenPaths.add(p));

    return Array.from(mavenPaths);
}

export function getMavenVersion(mavenHome: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        const mvnPath = path.join(mavenHome, "bin", "mvn");
        exec(`"${mvnPath}" -v`, (err, stdout) => {
            if (err) {
                return resolve(undefined);
            }
            const match = stdout.match(/Apache Maven ([\d.]+)/);
            if (match && match) {
                resolve(match[1]);
            } else {
                resolve(undefined);
            }
        });
    });
}