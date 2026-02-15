"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTiptapEditor = initTiptapEditor;
/**
 * TipTap-based prompt editor with format bar and custom Placeholder node for {xxx}.
 * Bundled for the webview; exposes window.initTiptapEditor.
 */
const core_1 = require("@tiptap/core");
const starter_kit_1 = __importDefault(require("@tiptap/starter-kit"));
const markdown_1 = require("@tiptap/markdown");
const core_2 = require("@tiptap/core");
const Placeholder = core_2.Node.create({
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
        return [
            'span',
            { class: 'placeholder-inline', 'data-placeholder': node.attrs.raw },
            node.attrs.raw,
        ];
    },
    markdownTokenizer: {
        name: 'placeholder',
        level: 'inline',
        start: (src) => src.indexOf('{'),
        tokenize(src) {
            const match = /^\{[^}]*\}/.exec(src);
            if (!match)
                return undefined;
            return { type: 'placeholder', raw: match[0] };
        },
    },
    parseMarkdown: (token) => ({
        type: 'placeholder',
        attrs: { raw: token.raw },
    }),
    renderMarkdown: (node) => node.attrs?.raw ?? '{}',
});
const DEBOUNCE_MS = 400;
function initTiptapEditor(options) {
    const { toolbarContainer, editorContainer, initialMarkdown, variableName, onMarkdownChange, } = options;
    const editor = new core_1.Editor({
        element: editorContainer,
        extensions: [starter_kit_1.default, Placeholder, markdown_1.Markdown],
        content: initialMarkdown || '',
        contentType: 'markdown',
        editorProps: {
            attributes: {
                class: 'promptmd-tiptap-editor',
                'data-placeholder': 'Enter markdown...',
            },
        },
    });
    let debounceTimer = null;
    editor.on('update', () => {
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            try {
                const md = typeof editor.getMarkdown === 'function'
                    ? editor.getMarkdown()
                    : undefined;
                if (md !== undefined)
                    onMarkdownChange(md);
            }
            catch (_) { }
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
        if (bold)
            bold.classList.toggle('active', editor.isActive('bold'));
        if (italic)
            italic.classList.toggle('active', editor.isActive('italic'));
        if (h1)
            h1.classList.toggle('active', editor.isActive('heading', { level: 1 }));
        if (h2)
            h2.classList.toggle('active', editor.isActive('heading', { level: 2 }));
        if (h3)
            h3.classList.toggle('active', editor.isActive('heading', { level: 3 }));
        if (bullet)
            bullet.classList.toggle('active', editor.isActive('bulletList'));
        if (ordered)
            ordered.classList.toggle('active', editor.isActive('orderedList'));
    }
    editor.on('selectionUpdate', updateToolbarState);
    editor.on('transaction', updateToolbarState);
    updateToolbarState();
    toolbarContainer.innerHTML = '';
    toolbarContainer.className = 'format-bar';
    const btn = (label, format, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'format-btn';
        b.setAttribute('data-format', format);
        b.textContent = label;
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
        if (level === 0)
            editor.chain().focus().setParagraph().run();
        else
            editor.chain().focus().toggleHeading({ level }).run();
        updateToolbarState();
    });
    toolbarContainer.appendChild(sel);
    toolbarContainer.appendChild(btn('B', 'bold', () => editor.chain().focus().toggleBold().run()));
    toolbarContainer.appendChild(btn('I', 'italic', () => editor.chain().focus().toggleItalic().run()));
    toolbarContainer.appendChild(btn('• List', 'bulletList', () => editor.chain().focus().toggleBulletList().run()));
    toolbarContainer.appendChild(btn('1. List', 'orderedList', () => editor.chain().focus().toggleOrderedList().run()));
    function syncSelect() {
        if (editor.isActive('heading', { level: 1 }))
            sel.value = '1';
        else if (editor.isActive('heading', { level: 2 }))
            sel.value = '2';
        else if (editor.isActive('heading', { level: 3 }))
            sel.value = '3';
        else
            sel.value = '0';
    }
    editor.on('selectionUpdate', syncSelect);
    editor.on('transaction', syncSelect);
    syncSelect();
    return () => {
        editor.destroy();
    };
}
window.initTiptapEditor = initTiptapEditor;
//# sourceMappingURL=editor.js.map