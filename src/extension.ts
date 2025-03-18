import * as vscode from 'vscode';
import * as path from 'path';
import { minimatch } from 'minimatch';

const colorMap: Record<string, string> = {
  blue: 'terminal.ansiBlue',
  magenta: 'terminal.ansiBrightMagenta',
  red: 'terminal.ansiBrightRed',
  cyan: 'terminal.ansiBrightCyan',
  green: 'terminal.ansiBrightGreen',
  yellow: 'terminal.ansiBrightYellow',
	custom1: 'folderPathColor.custom1',
	custom2: 'folderPathColor.custom2',
	custom3: 'folderPathColor.custom3',
	custom4: 'folderPathColor.custom4',
	custom5: 'folderPathColor.custom5',
	custom6: 'folderPathColor.custom6',
};

interface FolderConfig {
  path: string;
  color?: string;
  symbol?: string;
  tooltip?: string;
}

interface FolderDecoration extends FolderConfig {
  color: string;  // Make color required
}

class ColorDecorationProvider implements vscode.FileDecorationProvider {
  private readonly _onDidChangeFileDecorations: vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  > = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  public readonly onDidChangeFileDecorations: vscode.Event<
    vscode.Uri | vscode.Uri[] | undefined
  > = this._onDidChangeFileDecorations.event;
  private folders: FolderDecoration[] = [];

  constructFolders(): void {
    this.folders = [];
    const config = vscode.workspace.getConfiguration('folder-path-color');
    const folders: FolderConfig[] = config.get('folders') || [];
    const colors = Object.keys(colorMap).filter(
      (color) => !folders.find((folder) => folder.color === color)
    );
    let i = 0;
    for (const folder of folders) {
      if (!Object.keys(colorMap)[i]) {
        i = 0;
      }
      this.folders.push({
        path: folder.path,
        color: folder.color || colors[i] || Object.keys(colorMap)[i],
        symbol: folder.symbol,
        tooltip: folder.tooltip,
      });
      i++;
    }
  }

  constructor() {
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('folder-path-color.folders')) {
        this.constructFolders();
        this._onDidChangeFileDecorations.fire(undefined);
      }
    });
    this.constructFolders();
  }

  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FileDecoration> {
    if (!vscode.workspace.workspaceFolders) {
      return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return undefined;
    }

    // Get the path relative to the workspace root
    const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');

    for (const folder of this.folders) {
      const colorId = colorMap[folder.color];
      const pattern = folder.path.replace(/\\/g, '/');

      // Use minimatch for glob pattern matching
      if (minimatch(relativePath, pattern, { matchBase: true })) {
        return new vscode.FileDecoration(
          folder.symbol,
          folder.tooltip,
          new vscode.ThemeColor(colorId)
        );
      }
    }

    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ColorDecorationProvider();
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(provider)
  );
}
