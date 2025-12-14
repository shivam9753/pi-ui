import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild, AfterViewInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as PMNode } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { toggleMark, setBlockType } from 'prosemirror-commands';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../shared/constants/api.constants';
import { ThemingService } from '../../services/theming.service';

// Define custom schema for poetry
const poetrySchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() { return ['p', 0]; }
    },
    text: { group: 'inline' },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM() { return ['br']; }
    },
    // Images disabled for now
    // Can be re-enabled when NodeViews are implemented
  },
  marks: {
    strong: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
      toDOM() { return ['strong', 0]; }
    },
    em: {
      parseDOM: [{ tag: 'i' }, { tag: 'em' }],
      toDOM() { return ['em', 0]; }
    }
  }
});

@Component({
  selector: 'app-prosemirror-editor',
  standalone: true,
  imports: [],
  template: `
    <div class="prosemirror-editor rounded-xl border transition-all"
         [class.bg-white]="themingService.isLight()"
         [class.bg-gray-800]="themingService.isDark()"
         [class.border-gray-200]="themingService.isLight()"
         [class.border-gray-700]="themingService.isDark()">

      <!-- Toolbar -->
      <div class="flex items-center gap-2 p-3 border-b"
           [class.border-gray-200]="themingService.isLight()"
           [class.border-gray-700]="themingService.isDark()"
           [class.bg-gray-50]="themingService.isLight()"
           [class.bg-gray-700]="themingService.isDark()">

        <!-- Bold -->
        <button type="button" (click)="toggleBold()"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Bold (Ctrl+B)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </button>

        <!-- Italic -->
        <button type="button" (click)="toggleItalic()"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Italic (Ctrl+I)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 4h-9m4 16H5m4-8h6"/>
          </svg>
        </button>

        <div class="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>

        <!-- Text Align Left -->
        <button type="button" (click)="setAlign('left')"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Align Left">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M3 12h12M3 18h18"/>
          </svg>
        </button>

        <!-- Text Align Center -->
        <button type="button" (click)="setAlign('center')"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Align Center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M7 12h10M3 18h18"/>
          </svg>
        </button>

        <!-- Text Align Right -->
        <button type="button" (click)="setAlign('right')"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Align Right">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M9 12h12M3 18h18"/>
          </svg>
        </button>

        <!-- Clear Formatting -->
        <button type="button" (click)="clearFormatting()"
                class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Clear Formatting">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Word Count -->
        <div class="ml-auto text-xs text-gray-500 dark:text-gray-400 font-medium">
          {{ wordCount }} words
        </div>
      </div>

      <!-- Editor -->
      <div #editorContainer class="prose-editor-content min-h-[300px] p-4"></div>
    </div>
  `,
  styles: [`
    .prosemirror-editor {
      font-family: inherit;
    }

    .prose-editor-content {
      outline: none;
    }

    .ProseMirror {
      outline: none;
      min-height: 300px;
      word-wrap: break-word; /* Wrap long lines */
    }

    .ProseMirror p {
      margin: 0;
      line-height: 1.8;
    }

    .ProseMirror strong {
      font-weight: 600;
    }

    .ProseMirror em {
      font-style: italic;
    }

    /* Poetry alignment styles */
    .ProseMirror p.align-left { text-align: left; }
    .ProseMirror p.align-center { text-align: center; }
    .ProseMirror p.align-right { text-align: right; }

    /* Placeholder */
    .ProseMirror p.is-empty:first-child::before {
      content: attr(data-placeholder);
      color: #9ca3af;
      pointer-events: none;
      position: absolute;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ProseMirrorEditorComponent),
      multi: true
    }
  ]
})
export class ProseMirrorEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;

  @Input() placeholder: string = 'Write your poetry here... (Press Enter for single line break)';
  @Output() contentChange = new EventEmitter<string>();

  editorView!: EditorView;
  wordCount: number = 0;
  private currentValue: string = '';
  private isInitialized: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};
  private http = inject(HttpClient);
  public themingService = inject(ThemingService);

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnDestroy(): void {
    this.editorView?.destroy();
  }

  private initializeEditor(): void {
    // Poetry mode keymap - Enter creates hard break (single line)
    const poetryKeymap = keymap({
      'Enter': (state, dispatch) => {
        const { $from } = state.selection;
        const br = poetrySchema.nodes.hard_break.create();

        if (dispatch) {
          const tr = state.tr.replaceSelectionWith(br).scrollIntoView();
          dispatch(tr);
        }
        return true;
      },
      'Mod-b': (state, dispatch) => {
        return toggleMark(poetrySchema.marks.strong)(state, dispatch);
      },
      'Mod-i': (state, dispatch) => {
        return toggleMark(poetrySchema.marks.em)(state, dispatch);
      },
      'Mod-z': undo,
      'Mod-y': redo,
      'Mod-Shift-z': redo
    });

    this.editorView = new EditorView(this.editorContainer.nativeElement, {
      state: EditorState.create({
        schema: poetrySchema,
        plugins: [
          history(),
          poetryKeymap
        ]
      }),
      dispatchTransaction: (transaction: Transaction) => {
        const newState = this.editorView.state.apply(transaction);
        this.editorView.updateState(newState);

        // Emit changes
        if (transaction.docChanged) {
          this.updateContent();
        }
      }
    });

    this.isInitialized = true;

    // If there was a value set before initialization, apply it now
    if (this.currentValue) {
      this.setEditorContent(this.currentValue);
    }
  }

  private updateContent(): void {
    const html = this.getHTML();
    this.currentValue = html;
    this.updateWordCount();
    this.onChange(html);
    this.contentChange.emit(html);
    this.onTouched();
  }

  private getHTML(): string {
    const div = document.createElement('div');
    const fragment = DOMSerializer.fromSchema(poetrySchema).serializeFragment(
      this.editorView.state.doc.content
    );
    div.appendChild(fragment);

    // Convert spaces to &nbsp; for proper storage and display
    let html = div.innerHTML;

    // Convert leading spaces after opening tags (<p>, <strong>, <em>) to &nbsp;
    html = html.replace(/(<(?:p|strong|em)>)(\s+)/gi, (match, tag, spaces) => {
      return tag + '&nbsp;'.repeat(spaces.length);
    });

    // Convert leading spaces after <br> tags to &nbsp;
    html = html.replace(/(<br>)(\s+)/gi, (match, tag, spaces) => {
      return tag + '&nbsp;'.repeat(spaces.length);
    });

    // Convert multiple consecutive spaces (2 or more) anywhere to &nbsp;
    html = html.replace(/(\s{2,})/g, (match) => '&nbsp;'.repeat(match.length));

    return html;
  }

  private updateWordCount(): void {
    const text = this.editorView.state.doc.textContent;
    this.wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Toolbar actions
  toggleBold(): void {
    const { state, dispatch } = this.editorView;
    toggleMark(poetrySchema.marks.strong)(state, dispatch);
    this.editorView.focus();
  }

  toggleItalic(): void {
    const { state, dispatch } = this.editorView;
    toggleMark(poetrySchema.marks.em)(state, dispatch);
    this.editorView.focus();
  }

  setAlign(align: 'left' | 'center' | 'right'): void {
    const { state, dispatch } = this.editorView;
    const { from, to } = state.selection;

    const tr = state.tr;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === poetrySchema.nodes.paragraph) {
        const attrs = { ...node.attrs, class: `align-${align}` };
        tr.setNodeMarkup(pos, null, attrs);
      }
    });

    dispatch(tr);
    this.editorView.focus();
  }

  clearFormatting(): void {
    const { state, dispatch } = this.editorView;
    const { from, to } = state.selection;

    let tr = state.tr;

    // Remove all marks
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.marks.length > 0) {
        node.marks.forEach(mark => {
          tr = tr.removeMark(pos, pos + node.nodeSize, mark);
        });
      }
    });

    dispatch(tr);
    this.editorView.focus();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    const newValue = value || '';

    // Don't update if the value hasn't changed
    if (newValue === this.currentValue) {
      return;
    }

    this.currentValue = newValue;

    // If editor is not initialized yet, just store the value
    if (!this.isInitialized || !this.editorView) {
      return;
    }

    // Update the editor content
    this.setEditorContent(newValue);
  }

  private setEditorContent(value: string): void {
    if (!this.editorView) return;

    try {
      // Don't convert &nbsp; - keep them so leading spaces are visible in the editor
      const parser = DOMParser.fromSchema(poetrySchema);
      const div = document.createElement('div');
      div.innerHTML = value || '<p></p>';
      const doc = parser.parse(div);

      const newState = EditorState.create({
        doc,
        schema: poetrySchema,
        plugins: this.editorView.state.plugins
      });

      this.editorView.updateState(newState);
      this.updateWordCount();
    } catch (error) {
      console.error('Error setting editor content:', error);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.editorView?.setProps({ editable: () => !isDisabled });
  }

  // Public methods
  getPlainText(): string {
    return this.editorView?.state.doc.textContent || '';
  }

  getWordCount(): number {
    return this.wordCount;
  }

  getContent(): string {
    return this.getHTML();
  }
}
