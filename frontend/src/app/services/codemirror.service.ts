import { Injectable } from '@angular/core';
import {
  EditorView,
  ViewUpdate,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
} from '@codemirror/view';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import {
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  defaultHighlightStyle,
  indentUnit,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  searchKeymap,
  highlightSelectionMatches,
} from '@codemirror/search';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';

/* ═══════════════════════════════════════════════════════════════
   SyncPad Dark Theme — mapped to CSS variables
   ═══════════════════════════════════════════════════════════════ */
const syncPadDarkTheme = EditorView.theme(
  {
    '&': {
      color: '#e4e1ee',
      backgroundColor: 'transparent',
      fontSize: 'inherit',
      fontFamily: "'JetBrains Mono', monospace",
    },
    '.cm-content': {
      caretColor: '#c3c0ff',
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: '1.75',
      padding: '32px 32px 32px 16px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#c3c0ff',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(79, 70, 229, 0.35)',
      },
    '.cm-panels': {
      backgroundColor: '#1b1b24',
      color: '#e4e1ee',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #464555',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #464555',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(79, 70, 229, 0.3)',
      outline: '1px solid rgba(79, 70, 229, 0.5)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(79, 70, 229, 0.5)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(79, 70, 229, 0.3)',
      outline: '1px solid rgba(195, 192, 255, 0.4)',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(14, 13, 22, 0.3)',
      color: '#918fa1',
      border: 'none',
      borderRight: '1px solid rgba(70, 69, 85, 0.3)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '14px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#c3c0ff',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      border: 'none',
      color: '#c3c0ff',
    },
    '.cm-tooltip': {
      backgroundColor: '#1f1f28',
      border: '1px solid #464555',
      color: '#e4e1ee',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: '#464555',
      borderBottomColor: '#464555',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: '#1f1f28',
      borderBottomColor: '#1f1f28',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(79, 70, 229, 0.3)',
        color: '#e4e1ee',
      },
    },
    '.cm-scroller': {
      overflow: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(70, 69, 85, 0.4) transparent',
    },
  },
  { dark: true },
);

const syncPadDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c3c0ff' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e4e1ee' },
  { tag: [t.function(t.variableName), t.labelName], color: '#ffb695' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#c3c0ff' },
  { tag: [t.definition(t.name), t.separator], color: '#e4e1ee' },
  { tag: [t.brace], color: '#c7c4d8' },
  { tag: [t.annotation], color: '#ffb695' },
  { tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#ffb695' },
  { tag: [t.typeName, t.className], color: '#c3c0ff', fontStyle: 'italic' },
  { tag: [t.operator, t.operatorKeyword], color: '#c3c0ff' },
  { tag: [t.tagName], color: '#c3c0ff' },
  { tag: [t.squareBracket], color: '#c7c4d8' },
  { tag: [t.angleBracket], color: '#c7c4d8' },
  { tag: [t.attributeName], color: '#ffb695' },
  { tag: [t.regexp], color: '#ffb695' },
  { tag: [t.quote], color: '#a8c97f' },
  { tag: [t.string], color: '#a8c97f' },
  { tag: t.link, color: '#a8c97f', textDecoration: 'underline', textUnderlinePosition: 'under' as any },
  { tag: [t.url, t.escape, t.special(t.string)], color: '#ffb695' },
  { tag: [t.meta], color: '#918fa1' },
  { tag: [t.comment], color: '#918fa1', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold', color: '#c3c0ff' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#ffb695' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.heading, fontWeight: 'bold', color: '#c3c0ff' },
  { tag: t.special(t.heading1), fontWeight: 'bold', color: '#c3c0ff' },
  { tag: t.heading1, fontWeight: 'bold', color: '#c3c0ff' },
  { tag: [t.heading2, t.heading3, t.heading4], fontWeight: 'bold', color: '#c3c0ff' },
  { tag: [t.heading5, t.heading6], color: '#c3c0ff' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#ffb695' },
  { tag: [t.processingInstruction, t.inserted], color: '#a8c97f' },
  { tag: [t.contentSeparator], color: '#c3c0ff' },
  { tag: t.invalid, color: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.1)' },
]);

/* ═══════════════════════════════════════════════════════════════
   SyncPad Light Theme
   ═══════════════════════════════════════════════════════════════ */
const syncPadLightTheme = EditorView.theme(
  {
    '&': {
      color: '#1a1c20',
      backgroundColor: 'transparent',
      fontSize: 'inherit',
      fontFamily: "'JetBrains Mono', monospace",
    },
    '.cm-content': {
      caretColor: '#4f46e5',
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: '1.75',
      padding: '32px 32px 32px 16px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#4f46e5',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(79, 70, 229, 0.18)',
      },
    '.cm-panels': {
      backgroundColor: '#f3f4f8',
      color: '#1a1c20',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #c4c6cf',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #c4c6cf',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(79, 70, 229, 0.15)',
      outline: '1px solid rgba(79, 70, 229, 0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(79, 70, 229, 0.3)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(79, 70, 229, 0.12)',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      outline: '1px solid rgba(79, 70, 229, 0.4)',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
      color: '#74777f',
      border: 'none',
      borderRight: '1px solid rgba(0, 0, 0, 0.08)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '14px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#4f46e5',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      border: 'none',
      color: '#4f46e5',
    },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      border: '1px solid #c4c6cf',
      color: '#1a1c20',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(79, 70, 229, 0.15)',
        color: '#1a1c20',
      },
    },
    '.cm-scroller': {
      overflow: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(0, 0, 0, 0.15) transparent',
    },
  },
  { dark: false },
);

const syncPadLightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#4f46e5' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#1a1c20' },
  { tag: [t.function(t.variableName), t.labelName], color: '#b45309' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4f46e5' },
  { tag: [t.definition(t.name), t.separator], color: '#1a1c20' },
  { tag: [t.brace], color: '#44474e' },
  { tag: [t.annotation], color: '#b45309' },
  { tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#b45309' },
  { tag: [t.typeName, t.className], color: '#4f46e5', fontStyle: 'italic' },
  { tag: [t.operator, t.operatorKeyword], color: '#4f46e5' },
  { tag: [t.tagName], color: '#4f46e5' },
  { tag: [t.squareBracket], color: '#44474e' },
  { tag: [t.angleBracket], color: '#44474e' },
  { tag: [t.attributeName], color: '#b45309' },
  { tag: [t.regexp], color: '#b45309' },
  { tag: [t.quote], color: '#16a34a' },
  { tag: [t.string], color: '#16a34a' },
  { tag: t.link, color: '#16a34a', textDecoration: 'underline', textUnderlinePosition: 'under' as any },
  { tag: [t.url, t.escape, t.special(t.string)], color: '#b45309' },
  { tag: [t.meta], color: '#74777f' },
  { tag: [t.comment], color: '#74777f', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold', color: '#4f46e5' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#b45309' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.heading, fontWeight: 'bold', color: '#4f46e5' },
  { tag: t.special(t.heading1), fontWeight: 'bold', color: '#4f46e5' },
  { tag: t.heading1, fontWeight: 'bold', color: '#4f46e5' },
  { tag: [t.heading2, t.heading3, t.heading4], fontWeight: 'bold', color: '#4f46e5' },
  { tag: [t.heading5, t.heading6], color: '#4f46e5' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#b45309' },
  { tag: [t.processingInstruction, t.inserted], color: '#16a34a' },
  { tag: [t.contentSeparator], color: '#4f46e5' },
  { tag: t.invalid, color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)' },
]);

/* ═══════════════════════════════════════════════════════════════
   Service
   ═══════════════════════════════════════════════════════════════ */

export interface CodeMirrorConfig {
  initialContent: string;
  theme: 'dark' | 'light';
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  syntaxLanguage: string;
  onContentChange: (update: ViewUpdate) => void;
}

@Injectable({ providedIn: 'root' })
export class CodeMirrorService {
  private view: EditorView | null = null;

  /* Compartments allow dynamic reconfiguration */
  private languageComp = new Compartment();
  private themeComp = new Compartment();
  private gutterComp = new Compartment();
  private wrapComp = new Compartment();
  private fontSizeComp = new Compartment();
  private updateListenerComp = new Compartment();

  /** The full list of supported language descriptions from CM6 */
  readonly supportedLanguages = languages;

  /** Build sorted, unique display names for the settings UI */
  getLanguageNames(): string[] {
    const names = new Set<string>();
    for (const lang of languages) {
      names.add(lang.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Create a CodeMirror 6 editor inside the given container element.
   */
  createEditor(container: HTMLElement, config: CodeMirrorConfig): void {
    this.destroy(); // Clean up any previous instance

    const state = EditorState.create({
      doc: config.initialContent,
      extensions: [
        // — Core editing —
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        indentUnit.of('  '),

        // — Keymaps —
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),

        // — Dynamic compartments —
        this.themeComp.of(this.buildThemeExtension(config.theme)),
        this.languageComp.of([]), // Loaded asynchronously below
        this.gutterComp.of(
          config.lineNumbers ? [lineNumbers(), foldGutter()] : [],
        ),
        this.wrapComp.of(config.wordWrap ? EditorView.lineWrapping : []),
        this.fontSizeComp.of(this.buildFontSizeTheme(config.fontSize)),

        // — Update listener —
        this.updateListenerComp.of(
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              config.onContentChange(update);
            }
          }),
        ),
      ],
    });

    this.view = new EditorView({ state, parent: container });

    // Load the language asynchronously
    this.setLanguage(config.syntaxLanguage);
  }

  /** Dynamically switch syntax language */
  async setLanguage(languageName: string): Promise<void> {
    if (!this.view) return;

    const langDesc = languages.find(
      (l) => l.name.toLowerCase() === languageName.toLowerCase(),
    );
    if (!langDesc) {
      // Fallback: clear the language extension
      this.view.dispatch({
        effects: this.languageComp.reconfigure([]),
      });
      return;
    }

    const langSupport = await langDesc.load();
    this.view.dispatch({
      effects: this.languageComp.reconfigure(langSupport),
    });
  }

  /** Switch between dark and light theme */
  setTheme(theme: 'dark' | 'light'): void {
    if (!this.view) return;
    this.view.dispatch({
      effects: this.themeComp.reconfigure(this.buildThemeExtension(theme)),
    });
  }

  /** Update font size */
  setFontSize(px: number): void {
    if (!this.view) return;
    this.view.dispatch({
      effects: this.fontSizeComp.reconfigure(this.buildFontSizeTheme(px)),
    });
  }

  /** Toggle line numbers + fold gutter */
  setLineNumbers(show: boolean): void {
    if (!this.view) return;
    this.view.dispatch({
      effects: this.gutterComp.reconfigure(
        show ? [lineNumbers(), foldGutter()] : [],
      ),
    });
  }

  /** Toggle word wrap */
  setWordWrap(enabled: boolean): void {
    if (!this.view) return;
    this.view.dispatch({
      effects: this.wrapComp.reconfigure(
        enabled ? EditorView.lineWrapping : [],
      ),
    });
  }

  /** Get the current document text */
  getContent(): string {
    return this.view?.state.doc.toString() ?? '';
  }

  /**
   * Replace the entire document content (e.g. on CRDT snapshot load).
   * Tries to preserve cursor position.
   */
  replaceContent(newText: string): void {
    if (!this.view) return;

    const currentText = this.view.state.doc.toString();
    if (currentText === newText) return;

    const cursorPos = this.view.state.selection.main.head;

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: newText,
      },
      selection: {
        anchor: Math.min(cursorPos, newText.length),
      },
    });
  }

  /** Focus the editor */
  focus(): void {
    this.view?.focus();
  }

  /** Clean up */
  destroy(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  /* ── Private helpers ────────────────────────────────────── */

  private buildThemeExtension(theme: 'dark' | 'light'): Extension {
    if (theme === 'dark') {
      return [syncPadDarkTheme, syntaxHighlighting(syncPadDarkHighlight)];
    }
    return [syncPadLightTheme, syntaxHighlighting(syncPadLightHighlight)];
  }

  private buildFontSizeTheme(px: number): Extension {
    return EditorView.theme({
      '&': { fontSize: `${px}px` },
      '.cm-gutters': { fontSize: `${Math.max(px - 1, 12)}px` },
    });
  }
}
