import * as vscode from 'vscode';
import * as path from 'path';

export async function configureTerminal(context: vscode.ExtensionContext, homes: { javaHome?: string, mavenHome?: string }) {
    const config = vscode.workspace.getConfiguration();
    const platform = process.platform;

    if (platform === 'win32') {
        await configureWindowsTerminal(homes);
    } else if (platform === 'darwin') {
        await configureMacTerminal(homes);
    } else {
        await configureLinuxTerminal(context, homes);
    }

    await config.update('terminal.integrated.enablePersistentSessions', false, vscode.ConfigurationTarget.Workspace);
    await config.update('terminal.integrated.tabs.hideCondition', 'never', vscode.ConfigurationTarget.Workspace);
}

async function configureWindowsTerminal(homes: { javaHome?: string, mavenHome?: string }) {
    const config = vscode.workspace.getConfiguration();
    const profiles = config.get<{ [key: string]: any }>('terminal.integrated.profiles.windows', {});

    const profileName = "Java Switcher";
    const env: { [key: string]: string } = {};
    let pathVar = '${env:PATH}';

    if (homes.javaHome) {
        env.JAVA_HOME = homes.javaHome;
        pathVar = `${path.join(homes.javaHome, 'bin')};${pathVar}`;
    }

    if (homes.mavenHome) {
        env.MAVEN_HOME = homes.mavenHome;
        env.M2_HOME = homes.mavenHome;
        pathVar = `${path.join(homes.mavenHome, 'bin')};${pathVar}`;
    }
    env.PATH = pathVar;

    profiles[profileName] = {
        path: 'cmd.exe',
        args: ['/K', 'chcp 65001 > nul'],
        env,
        overrideName: true,
        icon: 'terminal-cmd',
    };

    await config.update('terminal.integrated.profiles.windows', profiles, vscode.ConfigurationTarget.Workspace);
    await config.update('terminal.integrated.defaultProfile.windows', profileName, vscode.ConfigurationTarget.Workspace);
}

async function configureMacTerminal(homes: { javaHome?: string, mavenHome?: string }) {
    const config = vscode.workspace.getConfiguration();
    const profiles = config.get<{ [key: string]: any }>('terminal.integrated.profiles.osx', {});

    const profileName = "Java Switcher";
    const env: { [key: string]: string } = {};
    let pathVar = '${env:PATH}';

    if (homes.javaHome) {
        env.JAVA_HOME = homes.javaHome;
        pathVar = `${path.join(homes.javaHome, 'bin')}:${pathVar}`;
    }

    if (homes.mavenHome) {
        env.MAVEN_HOME = homes.mavenHome;
        env.M2_HOME = homes.mavenHome;
        pathVar = `${path.join(homes.mavenHome, 'bin')}:${pathVar}`;
    }
    env.PATH = pathVar;

    profiles[profileName] = {
        path: 'zsh',
        env,
        overrideName: true,
        icon: 'terminal-bash',
    };

    await config.update('terminal.integrated.profiles.osx', profiles, vscode.ConfigurationTarget.Workspace);
    await config.update('terminal.integrated.defaultProfile.osx', profileName, vscode.ConfigurationTarget.Workspace);
}

async function configureLinuxTerminal(context: vscode.ExtensionContext, homes: { javaHome?: string, mavenHome?: string }) {
    const config = vscode.workspace.getConfiguration();
    const profiles = config.get<{ [key: string]: any }>('terminal.integrated.profiles.linux', {});
    const bashrcPath = path.join(context.extensionPath, 'bin', '.bashrc');

    const profileName = "Java Switcher";
    const env: { [key: string]: string } = {};

    let pathVar = '${env:PATH}';

    if (homes.javaHome) {
        env.JAVA_HOME = homes.javaHome;
        pathVar = `${path.join(homes.javaHome, 'bin')}:${pathVar}`;
    }

    if (homes.mavenHome) {
        env.MAVEN_HOME = homes.mavenHome;
        env.M2_HOME = homes.mavenHome;
        pathVar = `${path.join(homes.mavenHome, 'bin')}:${pathVar}`;
    }
    env.PATH = pathVar;

    profiles[profileName] = {
        path: 'bash',
        args: ['--rcfile', bashrcPath],
        env,
        overrideName: true,
        icon: 'terminal-bash',
    };

    await config.update('terminal.integrated.profiles.linux', profiles, vscode.ConfigurationTarget.Workspace);
    await config.update('terminal.integrated.defaultProfile.linux', profileName, vscode.ConfigurationTarget.Workspace);
}