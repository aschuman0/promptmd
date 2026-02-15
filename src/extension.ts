import * as vscode from 'vscode';
import { PromptEditorProvider } from './promptEditor/provider';

/** Registers the custom editor for *prompt*.py files. */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('promptmd.promptEditor', new PromptEditorProvider(context))
  );
}

export function deactivate(): void {}
