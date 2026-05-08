import { Injectable, inject } from '@angular/core';
import { CodeMirrorService } from './codemirror.service';

/**
 * Maps SyncPad language names → Prettier parser names.
 * Only languages that Prettier supports are listed here.
 */
const PRETTIER_PARSER_MAP: Record<string, { parser: string; plugins: string[] }> = {
  'javascript':  { parser: 'babel',      plugins: ['babel'] },
  'jsx':         { parser: 'babel',      plugins: ['babel'] },
  'typescript':  { parser: 'typescript', plugins: ['typescript'] },
  'tsx':         { parser: 'typescript', plugins: ['typescript'] },
  'html':        { parser: 'html',       plugins: ['html'] },
  'css':         { parser: 'css',        plugins: ['postcss'] },
  'less':        { parser: 'less',       plugins: ['postcss'] },
  'scss':        { parser: 'scss',       plugins: ['postcss'] },
  'json':        { parser: 'json',       plugins: ['babel'] },
  'markdown':    { parser: 'markdown',   plugins: ['markdown'] },
  'yaml':        { parser: 'yaml',       plugins: ['yaml'] },
  'graphql':     { parser: 'graphql',    plugins: ['graphql'] },
  'xml':         { parser: 'xml',        plugins: ['xml'] },
};

/**
 * Languages that use C-style brace syntax and can be formatted
 * with the built-in brace-based formatter.
 */
const BRACE_STYLE_LANGUAGES = new Set([
  'java', 'c', 'c++', 'objective-c', 'objective-c++',
  'c#', 'kotlin', 'swift', 'dart', 'scala',
  'go', 'rust', 'php',
  'perl', 'lua', 'r',
  'groovy', 'd', 'haxe',
  'processing', 'arduino',
  'solidity', 'move',
  'cuda c++', 'hlsl', 'glsl',
  'wgsl', 'zig', 'odin', 'v',
  'protobuf',
]);

/** Lazily loaded Prettier modules */
let prettierCore: any = null;
const loadedPlugins: Record<string, any> = {};

/**
 * Lazily load the Prettier core (ESM).
 */
async function loadPrettierCore(): Promise<any> {
  if (!prettierCore) {
    prettierCore = await import('prettier/standalone');
  }
  return prettierCore;
}

/**
 * Lazily load a Prettier plugin by key.
 */
async function loadPrettierPlugin(pluginKey: string): Promise<any> {
  if (loadedPlugins[pluginKey]) return loadedPlugins[pluginKey];

  let mod: any;
  switch (pluginKey) {
    case 'babel':
      mod = await import('prettier/plugins/babel');
      // babel also needs estree
      const estree = await import('prettier/plugins/estree');
      loadedPlugins['estree'] = estree.default ?? estree;
      break;
    case 'typescript':
      mod = await import('prettier/plugins/typescript');
      // typescript also needs estree
      if (!loadedPlugins['estree']) {
        const es = await import('prettier/plugins/estree');
        loadedPlugins['estree'] = es.default ?? es;
      }
      break;
    case 'html':
      mod = await import('prettier/plugins/html');
      break;
    case 'postcss':
      mod = await import('prettier/plugins/postcss');
      break;
    case 'markdown':
      mod = await import('prettier/plugins/markdown');
      break;
    case 'yaml':
      mod = await import('prettier/plugins/yaml');
      break;
    case 'graphql':
      mod = await import('prettier/plugins/graphql');
      break;
    case 'xml':
      mod = await import('@prettier/plugin-xml');
      break;
    default:
      return null;
  }

  loadedPlugins[pluginKey] = mod.default ?? mod;
  return loadedPlugins[pluginKey];
}

/* ═══════════════════════════════════════════════════════════════
   Built-in Brace-based Code Formatter
   Handles Java, C, C++, C#, Go, Rust, Kotlin, Swift, etc.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Format C-style code by properly handling braces, semicolons,
 * and indentation. This provides clean, readable output for
 * languages that Prettier doesn't support.
 */
function formatBraceStyle(code: string, tabWidth: number = 2): string {
  const indent = ' '.repeat(tabWidth);

  // Step 1: Normalize whitespace — collapse runs of spaces/tabs to single space
  // but preserve string literals and comments
  const tokens = tokenize(code);

  // Step 2: Rebuild with proper formatting
  let result = '';
  let indentLevel = 0;
  let needsNewline = true; // Start at beginning of line
  let lastNonWhitespaceChar = '';
  let inForParens = 0; // Track parentheses depth inside for(;;) to avoid breaking on ;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'string' || token.type === 'comment') {
      // Preserve strings and comments verbatim
      if (needsNewline) {
        result += indent.repeat(indentLevel);
        needsNewline = false;
      }
      result += token.value;
      if (token.type === 'comment' && token.value.startsWith('//')) {
        result += '\n';
        needsNewline = true;
      }
      continue;
    }

    // Process code characters
    const chars = token.value;
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j];

      // Skip existing whitespace/newlines — we regenerate them
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        // Add a single space if we need separation between tokens
        if (!needsNewline && result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
          const nextChar = findNextNonWhitespace(chars, j + 1, tokens, i);
          if (nextChar && nextChar !== ';' && nextChar !== ',' && nextChar !== ')' && nextChar !== '}'
              && lastNonWhitespaceChar !== '(' && lastNonWhitespaceChar !== '{') {
            result += ' ';
          }
        }
        continue;
      }

      // Track 'for' parentheses to avoid line-breaking on semicolons inside for(;;)
      if (ch === '(') {
        if (lastTokenWord(result) === 'for') {
          inForParens = 1;
        } else if (inForParens > 0) {
          inForParens++;
        }
      } else if (ch === ')' && inForParens > 0) {
        inForParens--;
      }

      // Opening brace
      if (ch === '{') {
        // Ensure space before opening brace
        if (!needsNewline && result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
          result += ' ';
        }
        if (needsNewline) {
          result += indent.repeat(indentLevel);
          needsNewline = false;
        }
        result += '{\n';
        indentLevel++;
        needsNewline = true;
        lastNonWhitespaceChar = ch;
        continue;
      }

      // Closing brace
      if (ch === '}') {
        indentLevel = Math.max(0, indentLevel - 1);
        // Trim trailing whitespace on current line
        result = result.replace(/[ \t]+$/, '');
        if (!needsNewline) {
          result += '\n';
        }
        result += indent.repeat(indentLevel) + '}';

        // Check if next non-whitespace is 'else', 'catch', 'finally', etc.
        const nextWord = peekNextWord(chars, j + 1, tokens, i);
        if (nextWord === 'else' || nextWord === 'catch' || nextWord === 'finally'
            || nextWord === 'while') {
          result += ' ';
          needsNewline = false;
        } else {
          result += '\n';
          needsNewline = true;
        }
        lastNonWhitespaceChar = ch;
        continue;
      }

      // Semicolon
      if (ch === ';' && inForParens === 0) {
        if (needsNewline) {
          result += indent.repeat(indentLevel);
          needsNewline = false;
        }
        result += ';\n';
        needsNewline = true;
        lastNonWhitespaceChar = ch;
        continue;
      }

      // Regular character
      if (needsNewline) {
        result += indent.repeat(indentLevel);
        needsNewline = false;
      }
      result += ch;
      lastNonWhitespaceChar = ch;
    }
  }

  // Clean up: remove excessive blank lines, trim trailing whitespace
  return result
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

/** Token types for the simple tokenizer */
interface Token {
  type: 'code' | 'string' | 'comment';
  value: string;
}

/**
 * Simple tokenizer that separates code, string literals, and comments.
 * This ensures we don't mess up formatting inside strings or comments.
 */
function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let currentCode = '';

  function flushCode() {
    if (currentCode) {
      tokens.push({ type: 'code', value: currentCode });
      currentCode = '';
    }
  }

  while (i < code.length) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    // Single-line comment
    if (ch === '/' && next === '/') {
      flushCode();
      let comment = '';
      while (i < code.length && code[i] !== '\n') {
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Multi-line comment
    if (ch === '/' && next === '*') {
      flushCode();
      let comment = '/*';
      i += 2;
      while (i < code.length) {
        if (code[i] === '*' && i + 1 < code.length && code[i + 1] === '/') {
          comment += '*/';
          i += 2;
          break;
        }
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // String literal (double quote)
    if (ch === '"') {
      flushCode();
      let str = '"';
      i++;
      while (i < code.length) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        str += code[i];
        if (code[i] === '"') { i++; break; }
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // String literal (single quote)
    if (ch === "'") {
      flushCode();
      let str = "'";
      i++;
      while (i < code.length) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        str += code[i];
        if (code[i] === "'") { i++; break; }
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Backtick template literal
    if (ch === '`') {
      flushCode();
      let str = '`';
      i++;
      while (i < code.length) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        str += code[i];
        if (code[i] === '`') { i++; break; }
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    currentCode += ch;
    i++;
  }

  flushCode();
  return tokens;
}

/**
 * Look ahead for the next non-whitespace character in the remaining code.
 */
function findNextNonWhitespace(currentChars: string, startJ: number, tokens: Token[], tokenIdx: number): string | null {
  // Check rest of current token
  for (let j = startJ; j < currentChars.length; j++) {
    const c = currentChars[j];
    if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') return c;
  }
  // Check subsequent tokens
  for (let t = tokenIdx + 1; t < tokens.length; t++) {
    const val = tokens[t].value;
    for (let j = 0; j < val.length; j++) {
      const c = val[j];
      if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') return c;
    }
  }
  return null;
}

/**
 * Extract the last word from the result string (for detecting 'for', 'if', etc.)
 */
function lastTokenWord(result: string): string {
  const match = result.trimEnd().match(/([a-zA-Z_]\w*)$/);
  return match ? match[1] : '';
}

/**
 * Peek at the next word in the remaining tokens (for detecting 'else', 'catch', etc.)
 */
function peekNextWord(currentChars: string, startJ: number, tokens: Token[], tokenIdx: number): string | null {
  let buf = '';
  let started = false;

  // Check rest of current token's chars
  for (let j = startJ; j < currentChars.length; j++) {
    const c = currentChars[j];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      if (started) return buf;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      started = true;
      buf += c;
    } else {
      return started ? buf : null;
    }
  }

  // Check subsequent tokens
  for (let t = tokenIdx + 1; t < tokens.length; t++) {
    if (tokens[t].type !== 'code') return started ? buf : null;
    const val = tokens[t].value;
    for (let j = 0; j < val.length; j++) {
      const c = val[j];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        if (started) return buf;
        continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        started = true;
        buf += c;
      } else {
        return started ? buf : null;
      }
    }
  }

  return started ? buf : null;
}


/* ═══════════════════════════════════════════════════════════════
   Service
   ═══════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class FormatterService {
  private cmService = inject(CodeMirrorService);

  /**
   * Check if formatting is supported for the given language.
   * Returns true for Prettier-supported AND brace-style languages.
   */
  isFormattingSupported(languageName: string): boolean {
    const key = languageName.toLowerCase();
    return key in PRETTIER_PARSER_MAP || BRACE_STYLE_LANGUAGES.has(key);
  }

  /**
   * Format the given code string.
   * Uses Prettier for supported languages, falls back to brace-based formatter
   * for C-style languages.
   */
  async formatCode(code: string, languageName: string): Promise<string> {
    const key = languageName.toLowerCase();

    // Try Prettier first
    const prettierConfig = PRETTIER_PARSER_MAP[key];
    if (prettierConfig) {
      return this.formatWithPrettier(code, prettierConfig);
    }

    // Try brace-based formatter
    if (BRACE_STYLE_LANGUAGES.has(key)) {
      return formatBraceStyle(code, 2);
    }

    // Unsupported — return original
    return code;
  }

  /**
   * Format using Prettier.
   */
  private async formatWithPrettier(
    code: string,
    config: { parser: string; plugins: string[] },
  ): Promise<string> {
    try {
      const prettier = await loadPrettierCore();

      // Load all required plugins
      const plugins: any[] = [];
      for (const pluginKey of config.plugins) {
        const p = await loadPrettierPlugin(pluginKey);
        if (p) plugins.push(p);
      }
      // Always include estree if loaded (needed by babel/typescript)
      if (loadedPlugins['estree'] && !plugins.includes(loadedPlugins['estree'])) {
        plugins.push(loadedPlugins['estree']);
      }

      const result = await prettier.format(code, {
        parser: config.parser,
        plugins,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'all',
        printWidth: 80,
      });

      return result;
    } catch (err) {
      console.warn('[Formatter] Prettier formatting failed:', err);
      return code;
    }
  }
}
