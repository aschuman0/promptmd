/**
 * TipTap-based prompt editor with format bar and custom Placeholder node for {xxx}.
 * Placeholders are only highlighted as "valid" if the variable name is in scope (imported/defined in the file).
 * Bundled for the webview; exposes window.initTiptapEditor.
 */
import { Editor, Node, nodeInputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';
import o200k_base from 'js-tiktoken/ranks/o200k_base';

const tiktokenByModel: Record<string, Tiktoken> = {};
function getTokenCount(text: string, model: string): number {
  const key = model === 'o200k_base' ? 'o200k_base' : 'cl100k_base';
  if (!tiktokenByModel[key]) {
    tiktokenByModel[key] = new Tiktoken(key === 'o200k_base' ? o200k_base : cl100k_base);
  }
  return tiktokenByModel[key].encode(text).length;
}

function placeholderVariableName(raw: string): string {
  if (raw.length >= 2 && raw[0] === '{' && raw[raw.length - 1] === '}') {
    return raw.slice(1, -1).trim();
  }
  return '';
}

function placeholderClass(raw: string, validNames: Set<string>): string {
  const valid = validNames.has(placeholderVariableName(raw));
  return valid ? 'placeholder-inline' : 'placeholder-inline placeholder-invalid';
}

function createPlaceholderExtension(validNames: Set<string>) {
  return Node.create({
    name: 'placeholder',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
      return {
        raw: { default: '{}' },
      };
    },

    parseHTML() {
      return [{ tag: 'span[data-placeholder]' }];
    },

    renderHTML({ node }) {
      const raw = node.attrs.raw ?? '{}';
      return ['span', { class: placeholderClass(raw, validNames), 'data-placeholder': raw }, raw];
    },

    addNodeView() {
      return ({ node }) => {
        const raw = node.attrs.raw ?? '{}';
        const span = document.createElement('span');
        span.className = placeholderClass(raw, validNames);
        span.setAttribute('data-placeholder', raw);
        span.textContent = raw;
        return { dom: span };
      };
    },

    markdownTokenizer: {
      name: 'placeholder',
      level: 'inline',
      start: (src: string) => src.indexOf('{'),
      tokenize(src: string) {
        const match = /^\{[^}]*\}/.exec(src);
        if (!match) return undefined;
        return { type: 'placeholder', raw: match[0] };
      },
    },

    parseMarkdown: (token: { raw: string }) => ({
      type: 'placeholder',
      attrs: { raw: token.raw },
    }),

    renderMarkdown: (node: { attrs: { raw?: string } }) =>
      node.attrs?.raw ?? '{}',

    addInputRules() {
      return [
        nodeInputRule({
          find: /\{[^}]*\}$/,
          type: this.type,
          getAttributes: (match) => ({ raw: match[0] }),
        }),
      ];
    },
  });
}

const DEBOUNCE_MS = 400;

/** True if the current selection is inside a table (cursor in a cell). */
function isCursorInTable(editor: Editor): boolean {
  const { selection } = editor.state;
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') return true;
  }
  return false;
}

export interface InitTiptapEditorOptions {
  toolbarContainer: HTMLElement;
  editorContainer: HTMLElement;
  initialMarkdown: string;
  /** Current variable name (for this tab); reserved for accessibility/display. */
  variableName: string;
  onMarkdownChange: (markdown: string) => void;
  onAddVariable?: () => void;
  /** Trigger "Reopen Editor With..." picker for the current file. */
  onReopenInEditor?: () => void;
  /** Names in scope in the Python file; only these get valid placeholder styling. */
  validPlaceholderNames?: string[];
  /** Tokenizer for count: cl100k_base or o200k_base. */
  tokenCounterModel?: string;
}

export function initTiptapEditor(options: InitTiptapEditorOptions): () => void {
  const {
    toolbarContainer,
    editorContainer,
    initialMarkdown,
    variableName,
    onMarkdownChange,
    onAddVariable,
    onReopenInEditor,
    validPlaceholderNames = [],
    tokenCounterModel = 'cl100k_base',
  } = options;

  const validNames = new Set(validPlaceholderNames);
  const Placeholder = createPlaceholderExtension(validNames);

  const editor = new Editor({
    element: editorContainer,
    extensions: [
      StarterKit,
      Placeholder,
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({ markedOptions: { gfm: true } }),
    ],
    content: initialMarkdown || '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'promptmd-tiptap-editor',
        'data-placeholder': 'Enter markdown...',
      },
    },
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  editor.on('update', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      try {
        const md = typeof (editor as unknown as { getMarkdown: () => string }).getMarkdown === 'function'
          ? (editor as unknown as { getMarkdown: () => string }).getMarkdown()
          : undefined;
        if (md !== undefined) {
          onMarkdownChange(md);
          updateTokenCount(md);
        }
      } catch {
        // Markdown extension may not be ready; ignore.
      }
    }, DEBOUNCE_MS);
  });

  function updateToolbarState() {
    const bold = toolbarContainer.querySelector('[data-format="bold"]');
    const italic = toolbarContainer.querySelector('[data-format="italic"]');
    const h1 = toolbarContainer.querySelector('[data-format="h1"]');
    const h2 = toolbarContainer.querySelector('[data-format="h2"]');
    const h3 = toolbarContainer.querySelector('[data-format="h3"]');
    const bullet = toolbarContainer.querySelector('[data-format="bulletList"]');
    const ordered = toolbarContainer.querySelector('[data-format="orderedList"]');
    const blockquote = toolbarContainer.querySelector('[data-format="blockquote"]');
    const code = toolbarContainer.querySelector('[data-format="code"]');
    const codeBlock = toolbarContainer.querySelector('[data-format="codeBlock"]');
    if (bold) bold.classList.toggle('active', editor.isActive('bold'));
    if (italic) italic.classList.toggle('active', editor.isActive('italic'));
    if (h1) h1.classList.toggle('active', editor.isActive('heading', { level: 1 }));
    if (h2) h2.classList.toggle('active', editor.isActive('heading', { level: 2 }));
    if (h3) h3.classList.toggle('active', editor.isActive('heading', { level: 3 }));
    if (bullet) bullet.classList.toggle('active', editor.isActive('bulletList'));
    if (ordered) ordered.classList.toggle('active', editor.isActive('orderedList'));
    if (blockquote) blockquote.classList.toggle('active', editor.isActive('blockquote'));
    if (code) code.classList.toggle('active', editor.isActive('code'));
    if (codeBlock) codeBlock.classList.toggle('active', editor.isActive('codeBlock'));
    const inTable = isCursorInTable(editor);
    const tableTrigger = toolbarContainer.querySelector('.format-table-trigger');
    if (tableTrigger) tableTrigger.classList.toggle('active', inTable);
    const tableInTableButtons = toolbarContainer.querySelectorAll('.format-table-in-table');
    tableInTableButtons.forEach((el) => {
      (el as HTMLButtonElement).disabled = !inTable;
    });
  }

  editor.on('selectionUpdate', updateToolbarState);
  editor.on('transaction', updateToolbarState);
  updateToolbarState();

  toolbarContainer.innerHTML = '';
  toolbarContainer.className = 'format-bar';

  const size = 18;
  const icon = (path: string, viewBox = '0 0 24 24') => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = path;
    return svg;
  };
  const icons = {
    bold: icon('<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>'),
    italic: icon('<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>'),
    quote: icon('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>'),
    code: icon('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>'),
    codeBlock: icon('<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/>'),
    bulletList: icon('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
    orderedList: icon('<path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>'),
    table: icon('<path d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z"/>'),
  };
  const btn = (content: string | SVGSVGElement, format: string, title: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'format-btn';
    b.setAttribute('data-format', format);
    b.setAttribute('title', title);
    if (typeof content === 'string') {
      b.textContent = content;
    } else {
      b.appendChild(content);
    }
    b.addEventListener('click', () => {
      editor.chain().focus().run();
      fn();
      updateToolbarState();
    });
    return b;
  };

  const sel = document.createElement('select');
  sel.className = 'format-select';
  sel.innerHTML = '<option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>';
  sel.addEventListener('change', () => {
    const level = parseInt(sel.value, 10);
    editor.chain().focus().run();
    if (level === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level }).run();
    updateToolbarState();
  });

  toolbarContainer.appendChild(sel);
  toolbarContainer.appendChild(btn(icons.bold, 'bold', 'Bold', () => editor.chain().focus().toggleBold().run()));
  toolbarContainer.appendChild(btn(icons.italic, 'italic', 'Italic', () => editor.chain().focus().toggleItalic().run()));
  toolbarContainer.appendChild(btn(icons.quote, 'blockquote', 'Quote', () => editor.chain().focus().toggleBlockquote().run()));
  toolbarContainer.appendChild(btn(icons.code, 'code', 'Inline code', () => editor.chain().focus().toggleCode().run()));
  toolbarContainer.appendChild(btn(icons.codeBlock, 'codeBlock', 'Code block', () => editor.chain().focus().toggleCodeBlock().run()));
  toolbarContainer.appendChild(btn(icons.bulletList, 'bulletList', 'Bullet list', () => editor.chain().focus().toggleBulletList().run()));
  toolbarContainer.appendChild(btn(icons.orderedList, 'orderedList', 'Numbered list', () => editor.chain().focus().toggleOrderedList().run()));

  const tableWrap = document.createElement('div');
  tableWrap.className = 'format-table-wrap';
  const tableTrigger = document.createElement('button');
  tableTrigger.type = 'button';
  tableTrigger.className = 'format-table-trigger';
  tableTrigger.setAttribute('title', 'Table');
  tableTrigger.setAttribute('data-format', 'table');
  const tableIcon = icon('<path d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z"/>');
  tableTrigger.appendChild(tableIcon);
  const tableChevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  tableChevron.setAttribute('viewBox', '0 0 24 24');
  tableChevron.setAttribute('fill', 'currentColor');
  tableChevron.setAttribute('aria-hidden', 'true');
  tableChevron.setAttribute('class', 'format-table-chevron');
  tableChevron.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
  tableTrigger.appendChild(tableChevron);
  const tableDropdown = document.createElement('div');
  tableDropdown.className = 'format-table-dropdown';
  const addTableItem = (label: string, inTableOnly: boolean, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (inTableOnly) b.classList.add('format-table-in-table');
    b.addEventListener('click', () => {
      editor.chain().focus().run();
      fn();
      updateToolbarState();
      tableDropdown.classList.remove('open');
    });
    return b;
  };
  const sep = () => {
    const div = document.createElement('div');
    div.className = 'format-table-sep';
    return div;
  };
  tableDropdown.appendChild(addTableItem('Insert table', false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()));
  tableDropdown.appendChild(sep());
  tableDropdown.appendChild(addTableItem('Add row above', true, () => editor.chain().focus().addRowBefore().run()));
  tableDropdown.appendChild(addTableItem('Add row below', true, () => editor.chain().focus().addRowAfter().run()));
  tableDropdown.appendChild(addTableItem('Delete row', true, () => editor.chain().focus().deleteRow().run()));
  tableDropdown.appendChild(sep());
  tableDropdown.appendChild(addTableItem('Add column left', true, () => editor.chain().focus().addColumnBefore().run()));
  tableDropdown.appendChild(addTableItem('Add column right', true, () => editor.chain().focus().addColumnAfter().run()));
  tableDropdown.appendChild(addTableItem('Delete column', true, () => editor.chain().focus().deleteColumn().run()));
  tableTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    editor.chain().focus().run();
    tableDropdown.classList.toggle('open');
    updateToolbarState();
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Node).closest?.('.format-table-wrap')) tableDropdown.classList.remove('open');
  });
  tableWrap.appendChild(tableTrigger);
  tableWrap.appendChild(tableDropdown);
  toolbarContainer.appendChild(tableWrap);
  updateToolbarState();

  const tokenCountEl = document.createElement('span');
  tokenCountEl.className = 'token-count';
  tokenCountEl.setAttribute('title', 'Approximate token count for OpenAI-style models (e.g. GPT-4)');
  tokenCountEl.textContent = '— tokens';
  toolbarContainer.appendChild(tokenCountEl);

  function updateTokenCount(markdown: string): void {
    const n = getTokenCount(markdown, tokenCounterModel);
    tokenCountEl.textContent = `${n.toLocaleString()} tokens`;
  }
  updateTokenCount(initialMarkdown || '');

  if (onReopenInEditor || onAddVariable) {
    const spacer = document.createElement('div');
    spacer.className = 'format-bar-spacer';
    spacer.style.flex = '1';
    toolbarContainer.appendChild(spacer);
    if (onAddVariable) {
      const plusIcon = icon('<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>');
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'format-btn format-add-btn';
      addBtn.setAttribute('title', 'Add new prompt variable');
      addBtn.appendChild(plusIcon);
      addBtn.addEventListener('click', () => onAddVariable());
      toolbarContainer.appendChild(addBtn);
    }
    if (onReopenInEditor) {
      const reopenIcon = icon('<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>');
      const reopenBtn = document.createElement('button');
      reopenBtn.type = 'button';
      reopenBtn.className = 'format-btn format-reopen-btn';
      reopenBtn.setAttribute('title', 'Reopen in another editor');
      reopenBtn.appendChild(reopenIcon);
      reopenBtn.addEventListener('click', () => onReopenInEditor());
      toolbarContainer.appendChild(reopenBtn);
    }
  }

  function syncSelect() {
    if (editor.isActive('heading', { level: 1 })) sel.value = '1';
    else if (editor.isActive('heading', { level: 2 })) sel.value = '2';
    else if (editor.isActive('heading', { level: 3 })) sel.value = '3';
    else sel.value = '0';
  }
  editor.on('selectionUpdate', syncSelect);
  editor.on('transaction', syncSelect);
  syncSelect();

  return () => {
    editor.destroy();
  };
}

declare global {
  interface Window {
    initTiptapEditor: typeof initTiptapEditor;
  }
}
window.initTiptapEditor = initTiptapEditor;
