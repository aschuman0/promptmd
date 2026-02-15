/**
 * Parses a Python file and returns all top-level assignments whose value
 * is a triple-quoted string ("""...""" or '''...''') or f-string (f"""...""").
 * Only module-level assignments are considered (no indented blocks).
 */

export interface PromptVariable {
  /** Variable name (e.g. SYSTEM_PROMPT) */
  name: string;
  /** Raw string content (without quotes) */
  rawValue: string;
  /** True if assignment was f"""...""" or f'''...''' */
  isFString: boolean;
  /** Start offset of variable name in file */
  nameStart: number;
  /** End offset of variable name in file (after last character of name) */
  nameEnd: number;
  /** Start offset in file (start of the opening quote) */
  startOffset: number;
  /** End offset in file (after closing quote) */
  endOffset: number;
}

const TRIPLE_DQ = '"""';
const TRIPLE_SQ = "'''";

export function parsePromptVariables(source: string): PromptVariable[] {
  const results: PromptVariable[] = [];
  let i = 0;
  const len = source.length;

  function skipWhitespace(): void {
    while (i < len && /[\t \r\n]/.test(source[i])) i++;
  }

  function skipComment(): void {
    if (source[i] === '#') {
      while (i < len && source[i] !== '\n') i++;
    }
  }

  function isIdentifierStart(ch: string): boolean {
    return /[a-zA-Z_]/.test(ch);
  }
  function isIdentifierPart(ch: string): boolean {
    return /[a-zA-Z0-9_]/.test(ch);
  }

  function readIdentifier(): string | null {
    if (!isIdentifierStart(source[i])) return null;
    const start = i;
    i++;
    while (i < len && isIdentifierPart(source[i])) i++;
    return source.slice(start, i);
  }

  /** Skip until we're at module level (column 0, no leading indent) or end of file. */
  function ensureModuleLevel(): void {
    while (i < len) {
      if (source[i] === '\n' || source[i] === '\r') {
        i++;
        continue;
      }
      if (source[i] === ' ' || source[i] === '\t') {
        const nextNewline = source.indexOf('\n', i);
        i = nextNewline === -1 ? len : nextNewline + 1;
        continue;
      }
      if (source[i] === '#') {
        skipComment();
        continue;
      }
      break;
    }
  }

  while (i < len) {
    ensureModuleLevel();
    if (i >= len) break;

    const nameStart = i;
    const name = readIdentifier();
    const nameEnd = i;
    if (name === null) {
      i = nameStart;
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }

    skipWhitespace();
    if (source[i] !== '=') {
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }
    i++;

    skipWhitespace();

    const literalStart = i;
    const isFString = source.slice(i, i + 2) === 'f"' || source.slice(i, i + 2) === "f'";
    if (isFString) i++;

    const isDouble = source[i] === '"';
    const triple = isDouble ? TRIPLE_DQ : TRIPLE_SQ;
    if (source.slice(i, i + 3) !== triple) {
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }

    const valueStart = i + 3;
    i = valueStart;
    const closeTriple = triple;
    let content = '';

    while (i < len) {
      const rest = source.slice(i);
      const closeIdx = rest.indexOf(closeTriple);
      if (closeIdx === -1) {
        content += rest;
        i = len;
        break;
      }
      content += rest.slice(0, closeIdx);
      i += closeIdx + 3;
      break;
    }

    const rawValue = isFString ? content.replace(/\{\{/g, '{').replace(/\}\}/g, '}') : content;
    results.push({
      name,
      rawValue,
      isFString,
      nameStart,
      nameEnd,
      startOffset: literalStart,
      endOffset: i,
    });
  }

  return results;
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*/;
/** Matches "x as alias" or "module.path as alias"; capture is the alias (simple identifier). */
const AS_ALIAS_PATTERN = /.+\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;

/** Parse "a, b as c, os.path as p" style list and add the brought-into-scope names to the set. */
function addImportNames(names: Set<string>, importListStr: string): void {
  const parts = importListStr.split(',').map((s) => s.trim());
  for (const part of parts) {
    const asMatch = part.match(AS_ALIAS_PATTERN);
    if (asMatch) {
      names.add(asMatch[1]);
    } else {
      const idMatch = part.match(IDENT);
      if (idMatch) names.add(idMatch[0]);
    }
  }
}

/**
 * Returns names that are in module scope: imported, assigned, or defined (def/class).
 * Used to validate f-string placeholders so only {name} with a real name get highlighted.
 */
export function getNamesInScope(source: string): string[] {
  const names = new Set<string>();
  const lines = source.split(/\r\n|\r|\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    if (indent > 0) continue;

    const rest = trimmed;

    if (rest.startsWith('import ')) {
      addImportNames(names, rest.slice(7));
      continue;
    }

    if (rest.startsWith('from ')) {
      const importIdx = rest.indexOf(' import ');
      if (importIdx === -1) continue;
      addImportNames(names, rest.slice(importIdx + 8));
      continue;
    }

    const defMatch = rest.match(new RegExp(`^def\\s+(${IDENT.source})\\s*\\(`));
    if (defMatch) {
      names.add(defMatch[1]);
      continue;
    }

    const classMatch = rest.match(new RegExp(`^class\\s+(${IDENT.source})\\s*[\\(:]`));
    if (classMatch) {
      names.add(classMatch[1]);
      continue;
    }

    const assignMatch = rest.match(new RegExp(`^(${IDENT.source})\\s*=`));
    if (assignMatch) {
      names.add(assignMatch[1]);
    }
  }

  return Array.from(names);
}
