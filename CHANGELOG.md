# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Theme change handling** — When you switch the VS Code color theme (Light, Dark, or High Contrast), the Prompt Editor and Markdown Editor webviews update their styling immediately. No need to reopen the tab; both providers subscribe to `onDidChangeActiveColorTheme` and post `themeChanged` to all open panels.
- **Tables (GFM)** — GitHub Flavored Markdown tables are fully supported in both editors. TipTap table extensions (Table, TableRow, TableCell, TableHeader) are enabled; Markdown is configured with `markedOptions: { gfm: true }` so table syntax parses and round-trips. An **Insert table** button in the format bar inserts a 3×3 table with a header row. Table styling matches VS Code’s markdown preview (borders, padding, theme-aware colors).
- **VS Code markdown preview CSS alignment** — Editor content styling (typography, headings, blockquote, code, pre, lists, links, hr, tables) is aligned with VS Code’s built-in markdown preview (`markdown.css`). All rules are scoped under `.promptmd-tiptap-editor`; theme-dependent borders use `body.vscode-light`, `body.vscode-dark`, and `body.vscode-high-contrast` so borders update when the theme changes.
- **Editor typeface setting** — `promptmd.editorTypeface` lets you choose the content font: `sansSerif` (default), `serif`, or `monospace`. Sans serif uses the VS Code UI font stack; serif uses Georgia/Times; monospace uses the editor font stack. Reopen the editor tab to apply changes.
- **F-string placeholder highlight options** (Prompt Editor)
  - **Placeholder highlight style:** `promptmd.placeholderHighlightStyle` — choose how placeholders are highlighted: background only, left border only, or both (default).
  - **Valid placeholder color:** `promptmd.placeholderValidColor` — accent for valid placeholders: default (theme), blue, green, or purple.
  - **Invalid placeholder color:** `promptmd.placeholderInvalidColor` — accent for invalid/unknown placeholders: default (theme), amber, red, or orange.

### Changed

- **Editor base font size** — Content in the Prompt and Markdown editors uses a slightly smaller base font (0.92em) for readability.

- **Default editor settings** — `promptmd.markdownEditorDefault` and `promptmd.promptEditorDefault` are now fully applied: the extension activates on startup (`onStartupFinished`) and syncs `workbench.editorAssociations` so that when enabled, `.md` and `*prompt*.py` files open in the Markdown Editor and Prompt Editor by default. Settings are re-applied when you change them (no reload required). Writes to `workbench.editorAssociations` only when the effective association for these patterns actually changes.

## [0.1.0] - 2026-02-15

### Added

- **Prompt Editor** for `*prompt*.py` files
  - Custom editor with one tab per top-level triple-quoted (or f-string) prompt variable
  - WYSIWYG Markdown editing: headings (H1–H3), bold, italic, blockquote, inline code, code blocks, bullet and ordered lists
  - F-string placeholder highlighting: `{name}` styled as valid when the name is in scope (imported or defined), warning style when not
  - Placeholder recognition as you type (closing `}` turns the span into a placeholder node immediately)
  - Add new prompt variable via **+** button (Python identifier validation)
  - Rename variables via pencil icon on tabs
  - Save and revert; autosave respects VS Code’s Files: Auto Save setting
- **Markdown Editor** for `*.md` files
  - Same rich editor and format bar as the prompt editor
  - Single-document view (no tabs)
  - Placeholders `{...}` supported; no scope validation (all shown with same style)
- **Shared editor UX**
  - Constrained max-width (122ch) for the format bar and content, centered in the panel
  - Format bar: formatting controls left-aligned; **+** (add variable, prompt only) and **Reopen in editor** (sync icon) right-aligned
  - **Reopen in editor** button opens the “Reopen Editor With…” picker to switch to another editor (e.g. default text editor)
- **Development**
  - `npm run dev` runs TypeScript and webview watchers; F5 launches Extension Development Host
  - Packaging and local install instructions in README (VSIX, install/upgrade for VS Code and Cursor)

### Fixed

- Webview init race: “webviewReady” handshake so the editor receives initial state after the script loads
- Python scope: aliased imports (e.g. `import os.path as p`) now contribute the alias (`p`) to valid placeholder names

[0.1.0]: https://github.com/aschuman0/promptmd/releases/tag/v0.1.0
