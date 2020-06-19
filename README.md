# VS Code JSDocs Deprecated 🚨

Fork from [https://github.com/balajmarius/vscode-jsdocs-deprecated](https://github.com/balajmarius/vscode-jsdocs-deprecated)

> Leverage the power of JSDocs. Show deprecated usages in the editor, as you type.

<img src="https://raw.githubusercontent.com/moesuiga/vscode-jsdocs-deprecated/master/static/tutorial.gif" alt="VS Code JSDocs Deprecated" />

# Installation

In the command palette (CMD + SHIFT + P) select “Install Extension” and choose "VS Code JSDocs Deprecated".

# Usage

We detect when you open a file, when you change something in it, when you switch editors. So there is no command to run, just install the extension and work as you normally would. We will mark any deprecated usages in the editor.

<img src="https://raw.githubusercontent.com/moesuiga/vscode-jsdocs-deprecated/master/static/banner.png" alt="VS Code JSDocs Deprecated" />

# Behind the scenes

We plug into VSCode and use the hover functionality to find deprecated identifiers. So if your project is configured properly and the VS Code hover shows you that tiny deprecated warning, we will show it, too.
