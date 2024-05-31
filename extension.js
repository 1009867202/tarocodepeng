const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// 递归复制文件夹
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const srcPath = path.join(source, file);
    const destPath = path.join(target, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // code Sinpper
  const provider = vscode.languages.registerCompletionItemProvider(
    { scheme: "file", language: "*" },
    {
      provideCompletionItems(document, position, token, context) {
        // Get the current line
        const linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);
        if (!linePrefix.endsWith("peng")) {
          return undefined;
        }

        // Create completion item
        const completion = new vscode.CompletionItem(
          "peng",
          vscode.CompletionItemKind.Snippet
        );
        completion.insertText = new vscode.SnippetString(
          "Your code snippet here"
        );
        completion.documentation = new vscode.MarkdownString(
          'This will insert a code snippet when you type "peng"'
        );

        return [completion];
      },
    }
  );
  // 注册一个命令，该命令会在文件夹上右键时触发
  const disposable = vscode.commands.registerCommand(
    "extension.createFolderFromTemplate",
    (uri) => {
      vscode.window
        .showInputBox({ prompt: "Enter the name of the new folder" })
        .then((folderName) => {
          if (!folderName) {
            vscode.window.showErrorMessage("Folder name cannot be empty");
            return;
          }

          const newFolderPath = path.join(uri.fsPath, folderName);
          if (fs.existsSync(newFolderPath)) {
            vscode.window.showErrorMessage(
              `Folder already exists: ${newFolderPath}`
            );
            return;
          }

          const templatePath = path.join(
            context.extensionPath,
            "template",
            "taro"
          );
          copyFolderSync(templatePath, newFolderPath);

          vscode.window.showInformationMessage(
            `Folder created from template: ${newFolderPath}`
          );
        });
    }
  );

  context.subscriptions.push(provider);

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
