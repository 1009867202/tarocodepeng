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
// 添加文件夹
function addPageEntryToConfig(configContent, newPageEntry) {
  const pagesMatch = configContent.match(/pages\s*:\s*\[([^\]]*)\]/);

  if (pagesMatch) {
    const pagesArray = pagesMatch[1].trim();

    // Ensure no duplicate entries
    const pagesArrayUpdated = pagesArray.includes(newPageEntry)
      ? pagesArray
      : pagesArray.length > 0
      ? `${pagesArray}, ${newPageEntry}`
      : newPageEntry;

    return configContent.replace(
      /pages\s*:\s*\[[^\]]*\]/,
      `pages: [${pagesArrayUpdated}]`
    );
  } else {
    // If pages array not found, append it (this handles cases where the structure might be different)
    const insertionPoint = configContent.indexOf("{") + 1;
    const insertionContent = `\npages: [${newPageEntry}],`;
    return (
      configContent.slice(0, insertionPoint) +
      insertionContent +
      configContent.slice(insertionPoint)
    );
  }
}

// 获取第一个工作区文件夹的路径
function getWorkspaceFolder() {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } else {
    vscode.window.showErrorMessage("No workspace folder is opened.");
    return null;
  }
}

// code Sinppets item
function getSinppetsItem(linePrefix, key, sinppet, md) {
  let codeSinppets = "code";
  return () => {
    if (!linePrefix.endsWith(`${codeSinppets}${key}`)) {
      console.log(`Line does not end with "${key}"`);
      return undefined;
    }
    // Create completion item
    const completion = new vscode.CompletionItem(
      key,
      vscode.CompletionItemKind.Snippet
    );
    completion.insertText = new vscode.SnippetString(sinppet);
    completion.documentation = new vscode.MarkdownString(md);
    return completion;
  };
}

// 递归遍历文件夹并读取指定文件
function traverseFolder(folderPath) {
  const results = [];

  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath);
    files.forEach((file) => {
      const fullPath = path.join(currentPath, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        traverse(fullPath); // 递归遍历子文件夹
      } else {
        if (file === "index.md" || file === "key.txt" || file === "index.txt") {
          const content = fs.readFileSync(fullPath, "utf8");
          results.push({ file: fullPath, content });
        }
      }
    });
  }

  traverse(folderPath);
  return results;
}

let rootPath = getWorkspaceFolder();
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // code sinppets
  const provider = vscode.languages.registerCompletionItemProvider(
    { scheme: "file", language: "*" },
    {
      provideCompletionItems(document, position, token, context) {
        // src path

        // Get the current line
        const linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);
        // 添加日志输出
        console.log(`Line prefix: "${linePrefix}"`); // 添加日志输出
        // 读取文件
        const srcPath = path.join(workspaceFolder, "md");
        // 调用递归遍历函数并读取文件
        // const results = traverseFolder(srcPath);

        // if (!linePrefix.endsWith("peng")) {
        //   console.log('Line does not end with "peng"');
        //   return undefined;
        // }
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
    "extension.createFolderFromTemplatetaro",
    (uri) => {
      const srcPath = path.join(rootPath, "src/pages");
      const source = path.join(rootPath, "src");
      const appConfigTemplatePath = path.join(
        context.extensionPath,
        "template",
        "appConfig",
        "app.config.ts"
      );
      const appConfigPath = path.join(source, "app.config.ts");

      // if (!uri.fsPath.startsWith(srcPath)) {
      //   vscode.window.showErrorMessage(
      //     "You must be inside the 'src/pages' folder to use this command."
      //   );
      //   return;
      // }
      // 检查 app.config.ts 文件是否存在，如果不存在则从模板复制
      if (!fs.existsSync(appConfigPath)) {
        if (!fs.existsSync(source)) {
          fs.mkdirSync(source, { recursive: true });
        }
        fs.copyFileSync(appConfigTemplatePath, appConfigPath);
        console.log("app.config.ts 文件不存在，已从模板复制。");
      }

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

          const appConfigPath = path.join(source, "app.config.ts");
          let appConfigContent = fs.readFileSync(appConfigPath, "utf8");
          let newPagePath = `/pages/${folderName}/index`;
          // 匹配 pages 字段并添加新页面路由地址
          const pagesMatch = appConfigContent.match(/pages\s*:\s*\[([^\]]*)\]/);
          if (pagesMatch) {
            // 提取现有的页面路由
            const pagesArrayString = pagesMatch[1].trim();
            const pagesArray =
              pagesArrayString.length > 0
                ? pagesArrayString
                    .split(",")
                    .map((page) => page.trim().replace(/['"]+/g, ""))
                    .filter(Boolean)
                : [];

            // 检查是否已存在
            if (!pagesArray.includes(newPagePath)) {
              pagesArray.push(newPagePath);
            }

            // 替换 pages 数组内容
            appConfigContent = appConfigContent.replace(
              pagesMatch[0],
              `pages: [${pagesArray
                .map((page, index) => page && `'${page}'`)
                .join(", ")}]`
            );
          }

          // 将更新后的内容写入文件
          fs.writeFileSync(appConfigPath, appConfigContent);
          // 将更新后的内容写入文件
          fs.writeFileSync(appConfigPath, appConfigContent);
          // 自动保存 app.config.ts 文件
          vscode.workspace.openTextDocument(appConfigPath).then((document) => {
            document.save().then(() => {
              vscode.window.showInformationMessage(
                `Folder created from template and app.config.ts updated: ${newFolderPath}`
              );
            });
          });
          vscode.window.showInformationMessage(
            `Folder created from template add appconfig.ts prettier appconfig.ts: ${newFolderPath}`
          );
        });
    }
  );
  // 注册一个命令，该命令会在文件夹上右键时触发
  const disposableUmi = vscode.commands.registerCommand(
    "extension.createFolderFromTemplateumi",
    (uri) => {
      const srcPath = path.join(rootPath, "src/pages");
      // if (!uri.fsPath.startsWith(srcPath)) {
      //   vscode.window.showErrorMessage(
      //     "You must be inside the 'src/pages' folder to use this command."
      //   );
      //   return;
      // }
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
            "umi"
          );
          copyFolderSync(templatePath, newFolderPath);
          vscode.window.showInformationMessage(
            `Folder created from umi template : ${newFolderPath}`
          );
        });
    }
  );
  // 注册一个命令，该命令会在文件夹上右键时触发
  const disposablevscode = vscode.commands.registerCommand(
    "extension.createFolderFromTemplatevscode",
    (uri) => {
      const srcPath = path.join(rootPath, "md");
      // if (!uri.fsPath.startsWith(srcPath)) {
      //   vscode.window.showErrorMessage(
      //     "You must be inside the 'md' folder to use this command."
      //   );
      //   return;
      // }
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
            "vscode"
          );
          copyFolderSync(templatePath, newFolderPath);
          vscode.window.showInformationMessage(
            `Folder created from umi template : ${newFolderPath}`
          );
        });
    }
  );
  context.subscriptions.push(provider);
  context.subscriptions.push(disposable);
  context.subscriptions.push(disposableUmi);
  context.subscriptions.push(disposablevscode);
}

function deactivate() {
  // Clean up resources, such as event listeners, subscriptions, etc.
  console.log('Your extension "your-extension-name" is now deactivated!');
}
module.exports = {
  activate,
  deactivate,
};
