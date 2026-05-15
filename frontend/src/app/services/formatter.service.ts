import { Injectable, inject } from '@angular/core';
import { CodeMirrorService } from './codemirror.service';

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

let prettierCore: any = null;
const loadedPlugins: Record<string, any> = {};

async function loadPrettierCore(): Promise<any> {
  if (!prettierCore) {
    prettierCore = await import('prettier/standalone');
  }
  return prettierCore;
}

async function loadPrettierPlugin(pluginKey: string): Promise<any> {
  if (loadedPlugins[pluginKey]) return loadedPlugins[pluginKey];

  let mod: any;
  switch (pluginKey) {
    case 'babel':
      mod = await import('prettier/plugins/babel');
      const estree = await import('prettier/plugins/estree');
      loadedPlugins['estree'] = estree.default ?? estree;
      break;
    case 'typescript':
      mod = await import('prettier/plugins/typescript');
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

// --- Built-in brace-based formatter for C-style languages ---

function formatBraceStyle(code: string, tabWidth: number = 2): string {
  const indent = ' '.repeat(tabWidth);
  const tokens = tokenize(code);

  let result = '';
  let indentLevel = 0;
  let needsNewline = true;
  let lastNonWhitespaceChar = '';
  let inForParens = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'string' || token.type === 'comment') {
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

    const chars = token.value;
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j];

      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        if (!needsNewline && result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
          const nextChar = findNextNonWhitespace(chars, j + 1, tokens, i);
          if (nextChar && nextChar !== ';' && nextChar !== ',' && nextChar !== ')' && nextChar !== '}'
              && lastNonWhitespaceChar !== '(' && lastNonWhitespaceChar !== '{') {
            result += ' ';
          }
        }
        continue;
      }

      // Track for() parentheses to avoid breaking on internal semicolons
      if (ch === '(') {
        if (lastTokenWord(result) === 'for') {
          inForParens = 1;
        } else if (inForParens > 0) {
          inForParens++;
        }
      } else if (ch === ')' && inForParens > 0) {
        inForParens--;
      }

      if (ch === '{') {
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

      if (ch === '}') {
        indentLevel = Math.max(0, indentLevel - 1);
        result = result.replace(/[ \t]+$/, '');
        if (!needsNewline) {
          result += '\n';
        }
        result += indent.repeat(indentLevel) + '}';

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

      if (needsNewline) {
        result += indent.repeat(indentLevel);
        needsNewline = false;
      }
      result += ch;
      lastNonWhitespaceChar = ch;
    }
  }

  return result
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

interface Token {
  type: 'code' | 'string' | 'comment';
  value: string;
}

/** Tokenize code into code, string, and comment segments */
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

function findNextNonWhitespace(currentChars: string, startJ: number, tokens: Token[], tokenIdx: number): string | null {
  for (let j = startJ; j < currentChars.length; j++) {
    const c = currentChars[j];
    if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') return c;
  }
  for (let t = tokenIdx + 1; t < tokens.length; t++) {
    const val = tokens[t].value;
    for (let j = 0; j < val.length; j++) {
      const c = val[j];
      if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') return c;
    }
  }
  return null;
}

function lastTokenWord(result: string): string {
  const match = result.trimEnd().match(/([a-zA-Z_]\w*)$/);
  return match ? match[1] : '';
}

function peekNextWord(currentChars: string, startJ: number, tokens: Token[], tokenIdx: number): string | null {
  let buf = '';
  let started = false;

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

@Injectable({ providedIn: 'root' })
export class FormatterService {
  private cmService = inject(CodeMirrorService);

  isFormattingSupported(languageName: string): boolean {
    const key = languageName.toLowerCase();
    return key in PRETTIER_PARSER_MAP || BRACE_STYLE_LANGUAGES.has(key);
  }

  async formatCode(code: string, languageName: string): Promise<string> {
    const key = languageName.toLowerCase();

    const prettierConfig = PRETTIER_PARSER_MAP[key];
    if (prettierConfig) {
      return this.formatWithPrettier(code, prettierConfig);
    }

    if (BRACE_STYLE_LANGUAGES.has(key)) {
      return formatBraceStyle(code, 2);
    }

    return code;
  }

  private async formatWithPrettier(
    code: string,
    config: { parser: string; plugins: string[] },
  ): Promise<string> {
    try {
      const prettier = await loadPrettierCore();

      const plugins: any[] = [];
      for (const pluginKey of config.plugins) {
        const p = await loadPrettierPlugin(pluginKey);
        if (p) plugins.push(p);
      }
      if (loadedPlugins['estree'] && !plugins.includes(loadedPlugins['estree'])) {
        plugins.push(loadedPlugins['estree']);
      }

      return await prettier.format(code, {
        parser: config.parser,
        plugins,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'all',
        printWidth: 80,
      });
    } catch (err) {
      console.warn('[Formatter] Prettier failed:', err);
      return code;
    }
  }
}
