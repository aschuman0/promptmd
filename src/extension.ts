import * as vscode from 'vscode';
import { PromptEditorProvider } from './promptEditor/provider';

export function activate(context: vscode.ExtensionContext): void {
  const viewType = 'promptmd.promptEditor';
  const provider = new PromptEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(viewType, provider)
  );
}

export function deactivate(): void {}
