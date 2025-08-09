import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigUpdater } from './configUpdater';
import { findJdks, IDetectedJdk, resolveJavaVersion } from './jdkExplorer';
import { findMavens } from './mavenExplorer';
import { getMavenVersion } from './mavenExplorer';
import { configureTerminal } from './terminal';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "java-switcher" is now active!');

    const configUpdater = new ConfigUpdater(context);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => configUpdater.update(e)));

    const createSwitcher = (type: 'JDK' | 'Maven') => {
        return vscode.commands.registerCommand(`javaSwitcher.switch${type}`, async () => {
            const stateKey = `javaSwitcher.${type.toLowerCase()}s`;
            let items = context.globalState.get<Array<{ name: string; path: string }>>(stateKey) || [];

            if (type === 'JDK') {
                const discoveredJdks = await findJdks();
                const newJdks = discoveredJdks.filter(discoveredJdk => !items.some(item => item.path === discoveredJdk.path));

                let itemsUpdated = false;
                const allJdks = [...items, ...newJdks].map(item => {
                    const compliant = /^(J2SE|JavaSE)-(\d+(\.\d+)*)$/i.test(item.name);
                    let sanitizedName = item.name;

                    if (!compliant) {
                        const version = resolveJavaVersion(item.path);
                        if (version) {
                            sanitizedName = `JavaSE-${version}`;
                        }
                        vscode.window.showWarningMessage(`JDK path '${item.path}' does not follow the recommended naming convention. It has been added, but consider renaming it for better compatibility.`);
                    }

                    if (item.name !== sanitizedName) {
                        itemsUpdated = true;
                    }

                    return { name: sanitizedName, path: item.path };
                });

                if (itemsUpdated || newJdks.length > 0) {
                    await context.globalState.update(stateKey, allJdks);
                    items = allJdks;
                    if (newJdks.length > 0) {
                        vscode.window.showInformationMessage(`Added ${newJdks.length} new JDK(s) to the list.`);
                    }
                }
            } else if (type === 'Maven') {
                const discoveredMavenPaths = await findMavens();
                const currentMavens = context.globalState.get<Array<{ name: string; path: string }>>(stateKey) || [];
                const newMavenPaths = discoveredMavenPaths.filter(p => !currentMavens.some(item => item.path === p));

                if (newMavenPaths.length > 0) {
                    const newMavens = (await Promise.all(newMavenPaths.map(async p => {
                        const version = await getMavenVersion(p);
                        return version ? { name: `Maven ${version}`, path: p } : null;
                    }))).filter((m): m is { name: string; path: string } => m !== null);

                    if (newMavens.length > 0) {
                        const allMavens = [...currentMavens, ...newMavens];
                        await context.globalState.update(stateKey, allMavens);
                        items = allMavens;
                        vscode.window.showInformationMessage(`Added ${newMavens.length} new Maven(s) to the list.`);
                    }
                }
            }

            if (!items || items.length === 0) {
                vscode.window.showErrorMessage(`No ${type} versions found. Please add them manually or let the extension discover them.`);
                return;
            }

            const versions = items.map(item => ({
                label: item.name,
                description: item.path
            }));
            const selectedVersion = await vscode.window.showQuickPick(versions, {
                placeHolder: `Select a ${type} version to switch to`,
            });

            if (selectedVersion) {
                const configKey = type === 'JDK' ? 'javaSwitcher.java.home' : 'javaSwitcher.maven.home';
                await vscode.workspace.getConfiguration().update(configKey, selectedVersion.description, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`✅ ${type} has been switched to '${selectedVersion.label}'.`);
            }
        });
    };

    context.subscriptions.push(createSwitcher('JDK'));
    context.subscriptions.push(createSwitcher('Maven'));

}

export function deactivate() {}
