# Java Switcher

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/JuniverseCoder.java-switcher.svg)](https://marketplace.visualstudio.com/items?itemName=JuniverseCoder.java-switcher)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/JuniverseCoder.java-switcher.svg)](https://marketplace.visualstudio.com/items?itemName=JuniverseCoder.java-switcher)

Easily switch between different JDK and Maven versions on a per-workspace basis. 

## Features

*   **Switch Workspace JDK**: Change the JDK version for your current workspace.
*   **Switch Workspace Maven**: Change the Maven version for your current workspace.
*   **Auto-discovery**: Automatically discovers installed JDKs and Mavens on your system.
*   **Terminal Integration**: Configures integrated terminals to use the selected JDK and Maven versions (`JAVA_HOME`, `M2_HOME`, and `PATH`).
*   **Automatic Configuration**: Updates settings for popular Java-related extensions.

## Usage

1.  Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
2.  Type `Java Switcher` to see the available commands.
3.  Select **Java Switcher: Switch Workspace JDK** to choose a JDK version.
4.  Select **Java Switcher: Switch Workspace Maven** to choose a Maven version.
5.  The extension will update your workspace `settings.json` file with the selected paths.

## Configuration

This extension is designed to be zero-config. It works by dynamically updating your VS Code settings when you switch versions.

### Extension-Managed Settings

When you switch versions, this extension will set the following configuration in your **workspace** `settings.json`:

*   `javaSwitcher.java.home`: Stores the path of the selected JDK.
*   `javaSwitcher.maven.home`: Stores the path of the selected Maven installation.

### Automatically Updated Settings

Based on your selection, the extension will automatically update the following settings for other popular extensions to ensure a consistent environment:

**For JDK selection:**
*   `java.jdt.ls.java.home` (for Red Hat's Java extension)
*   `spring-boot.ls.java.home` (for VMware's Spring Boot extension)
*   `java.import.gradle.java.home` (for Red Hat's Java extension)
*   `zopeneditor.JAVA_HOME` (for IBM's Z Open Editor)
*   `plantuml.java` (for Jebbs' PlantUML extension)
*   `rsp-ui.rsp.java.home` (for Red Hat's RSP UI extension)
*   `salesforcedx-vscode-apex.java.home` (for Salesforce's Apex extension)
*   `metals.javaHome` (for Scalameta's Metals extension)
*   `java.configuration.runtimes` (for Red Hat's Java extension)
*   `maven.terminal.customEnv` (for Red Hat's Java extension)

**For Maven selection:**
*   `maven.executable.path` (for Red Hat's Java extension)

You do not need to manually configure these settings. The extension handles them for you.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
