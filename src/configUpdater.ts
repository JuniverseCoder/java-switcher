import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { configureTerminal } from './terminal';
import { isValidJdkPath, resolveJavaVersion } from './jdkExplorer';
import { getMavenVersion } from './mavenExplorer';

export class ConfigUpdater {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async update(event?: vscode.ConfigurationChangeEvent) {
        const config = vscode.workspace.getConfiguration('javaSwitcher');
        const jdkPath = config.get<string>('java.home');
        const mavenPath = config.get<string>('maven.home');

        if (event && !event.affectsConfiguration('javaSwitcher.java.home') && !event.affectsConfiguration('javaSwitcher.maven.home')) {
            return;
        }

        const homes: { javaHome?: string, mavenHome?: string } = {};

        if (jdkPath) {
            let jdks = this.context.globalState.get<Array<{ name: string; path: string }>>('javaSwitcher.jdks') || [];
            let selectedJdk = jdks.find(j => j.path === jdkPath);

            if (!selectedJdk) {
                if (isValidJdkPath(jdkPath)) {
                    const version = resolveJavaVersion(jdkPath);
                    const name = version ? `JavaSE-${version}` : `JDK at ${jdkPath}`;
                    selectedJdk = { name, path: jdkPath };
                    jdks.push(selectedJdk);
                    await this.context.globalState.update('javaSwitcher.jdks', jdks);
                    vscode.window.showInformationMessage(`Added new JDK '${name}' from configuration.`);
                } else {
                    vscode.window.showWarningMessage(`The configured JDK path is not valid: ${jdkPath}`);
                }
            }

            if (selectedJdk) {
                await this.updateJdkSettings(selectedJdk.name, selectedJdk.path);
                homes.javaHome = selectedJdk.path;
            }
        }

        if (mavenPath) {
            let mavens = this.context.globalState.get<Array<{ name: string; path: string }>>('javaSwitcher.mavens') || [];
            let selectedMaven = mavens.find(m => m.path === mavenPath);

            if (!selectedMaven) {
                const version = await getMavenVersion(mavenPath);
                if (version) {
                    const name = `Maven ${version}`;
                    selectedMaven = { name, path: mavenPath };
                    mavens.push(selectedMaven);
                    await this.context.globalState.update('javaSwitcher.mavens', mavens);
                    vscode.window.showInformationMessage(`Added new Maven '${name}' from configuration.`);
                } else {
                    vscode.window.showWarningMessage(`The configured Maven path is not valid: ${mavenPath}`);
                }
            }

            if (selectedMaven) {
                await this.updateMavenSettings(selectedMaven.name, selectedMaven.path);
                homes.mavenHome = selectedMaven.path;
            }
        }

        await configureTerminal(this.context, homes);
    }

    private async updateJdkSettings(jdkName: string, jdkPath: string) {
        const config = vscode.workspace.getConfiguration();

        const settingsToUpdate: { [key: string]: { value: any, extensionId: string } } = {
            'java.jdt.ls.java.home': { value: jdkPath, extensionId: 'redhat.java' },
            'spring-boot.ls.java.home': { value: jdkPath, extensionId: 'vmware.vscode-spring-boot' },
            'java.import.gradle.java.home': { value: jdkPath, extensionId: 'redhat.java' },
            'zopeneditor.JAVA_HOME': { value: jdkPath, extensionId: 'ibm.zopeneditor' },
            'plantuml.java': { value: jdkPath, extensionId: 'jebbs.plantuml' },
            'rsp-ui.rsp.java.home': { value: jdkPath, extensionId: 'redhat.rsp-ui' },
            'salesforcedx-vscode-apex.java.home': { value: jdkPath, extensionId: 'salesforce.salesforcedx-vscode-apex' },
            'metals.javaHome': { value: jdkPath, extensionId: 'scalameta.metals' },
            'maven.terminal.customEnv': { value: [{ "environmentVariable": "JAVA_HOME", "value": jdkPath }], extensionId: 'redhat.java' }
        };

        for (const [setting, { value, extensionId }] of Object.entries(settingsToUpdate)) {
            if (vscode.extensions.getExtension(extensionId)) {
                try {
                    await this.updateConfig(config, setting, value);
                } catch (error: any) {
                    console.error(`Failed to update setting '${setting}': ${error.message}`);
                }
            }
        }

        const runtimes = [{ name: jdkName, path: jdkPath, default: true }];
        if (vscode.extensions.getExtension('redhat.java')) {
            await this.updateConfig(config, 'java.configuration.runtimes', runtimes);
        }

    }

    private async updateMavenSettings(mavenName: string, mavenPath: string) {
        const config = vscode.workspace.getConfiguration();
        if (vscode.extensions.getExtension('redhat.java')) {
            await this.updateConfig(config, 'maven.executable.path', path.join(mavenPath, 'bin', 'mvn'));
        }
    }

    private async updateConfig(config: vscode.WorkspaceConfiguration, setting: string, value: any) {
        try {
            await config.update(setting, value, vscode.ConfigurationTarget.Workspace);
        } catch (error) {
            await config.update(setting, value, vscode.ConfigurationTarget.Global);
        }
    }
}

