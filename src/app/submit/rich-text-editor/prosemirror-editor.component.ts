import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild, AfterViewInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EditorState, Transaction, NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as PMNode } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { toggleMark, setBlockType } from 'prosemirror-commands';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../shared/constants/api.constants';
import { ThemingService } from '../../services/theming.service';

// Define custom schema for poetry (base schema without images)
const poetrySchemaSpec = {
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() { return ['p', 0] as const; }
    },
    text: { group: 'inline' },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM() { return ['br'] as const; }
    }
  },
  marks: {
    strong: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
      toDOM() { return ['strong', 0] as const; }
    },
    em: {
      parseDOM: [{ tag: 'i' }, { tag: 'em' }],
      toDOM() { return ['em', 0] as const; }
    }
  }
};

// Schema with image support
const richSchemaSpec = {
  nodes: {
    ...poetrySchemaSpec.nodes,
    image: {
      inline: false,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        caption: { default: null },
        imageId: { default: null } // Unique ID for identifying images
      },
      group: 'block',
      draggable: true,
      parseDOM: [
        {
          tag: 'figure.image-figure',
          getAttrs(dom: any) {
            const img = dom.querySelector('img');
            const caption = dom.querySelector('figcaption');
            if (!img) return false;
            return {
              src: img.getAttribute('src'),
              alt: img.getAttribute('alt'),
              title: img.getAttribute('title'),
              caption: caption ? caption.textContent : null,
              imageId: img.getAttribute('data-image-id') || dom.getAttribute('data-image-id') || null
            };
          }
        },
        {
          tag: 'figure.image-wrapper-single',
          getAttrs(dom: any) {
            const img = dom.querySelector('img');
            if (!img) return false;
            return {
              src: img.getAttribute('src'),
              alt: img.getAttribute('alt'),
              title: img.getAttribute('title'),
              caption: null,
              imageId: img.getAttribute('data-image-id') || dom.getAttribute('data-image-id') || null
            };
          }
        },
        {
          tag: 'img[src]',
          getAttrs(dom: any) {
            return {
              src: dom.getAttribute('src'),
              alt: dom.getAttribute('alt'),
              title: dom.getAttribute('title'),
              caption: null,
              imageId: dom.getAttribute('data-image-id') || null
            };
          }
        }
      ],
      toDOM(node: any) {
        const imageId = node.attrs.imageId || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const imgAttrs: any = {
          src: node.attrs.src,
          alt: node.attrs.alt || '',
          title: node.attrs.title || '',
          'data-image-id': imageId,
          class: 'prosemirror-image'
        };

        // Three-dot menu button HTML
        const menuButton = ['button', {
          class: 'image-menu-btn',
          type: 'button',
          'data-image-id': imageId,
          'aria-label': 'Image options',
          contenteditable: 'false'
        }, '⋮'];

        if (node.attrs.caption) {
          return ['figure', {
            class: 'image-figure',
            'data-image-id': imageId,
            contenteditable: 'false'
          },
            ['div', { class: 'image-wrapper', contenteditable: 'false' },
              ['img', imgAttrs],
              menuButton
            ],
            ['figcaption', { class: 'image-caption', contenteditable: 'false' }, node.attrs.caption]
          ] as const;
        }

        return ['figure', {
          class: 'image-wrapper-single',
          'data-image-id': imageId,
          contenteditable: 'false'
        },
          ['img', imgAttrs],
          menuButton
        ] as const;
      }
    }
  },
  marks: poetrySchemaSpec.marks
};

const poetrySchema = new Schema(poetrySchemaSpec as any);
const richSchema = new Schema(richSchemaSpec as any);

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

        <!-- Image Upload (conditional) -->
        @if (allowImages) {
          <div class="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          <button type="button" (click)="triggerImageUpload()"
                  [disabled]="isImageUploading"
                  class="toolbar-btn p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Insert Image">
            @if (!isImageUploading) {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            }
            @if (isImageUploading) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
          </button>
        }

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

    /* Image and Figure styles */
    .ProseMirror img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .ProseMirror figure.image-figure {
      margin: 1rem auto;
      max-width: 100%;
      text-align: center;
      position: relative;
    }

    .ProseMirror figure.image-figure img {
      margin: 0 auto;
    }

    .ProseMirror figcaption.image-caption {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
      font-style: italic;
      text-align: center;
      padding: 0.25rem 0.5rem;
    }

    .ProseMirror img:hover {
      opacity: 0.9;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    /* Selected image styling - single outline only */
    .ProseMirror img.ProseMirror-selectednode {
      outline: none;
    }

    .ProseMirror figure.ProseMirror-selectednode {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
      border-radius: 0.5rem;
      background: rgba(59, 130, 246, 0.05);
    }

    .ProseMirror figure.ProseMirror-selectednode img {
      outline: none;
      box-shadow: none;
    }

    /* Image wrapper for menu button */
    .ProseMirror .image-wrapper,
    .ProseMirror .image-wrapper-single {
      position: relative;
      display: block;
      margin: 1rem auto;
      max-width: 100%;
      user-select: none;
    }

    .ProseMirror .image-wrapper-single {
      width: fit-content;
    }

    /* Three-dot menu button */
    .ProseMirror .image-menu-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 0.375rem;
      width: 32px;
      height: 32px;
      display: flex !important;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.5rem;
      font-weight: bold;
      line-height: 1;
      opacity: 0.9;
      transition: all 0.2s ease;
      z-index: 20;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    /* Always show button clearly */
    .ProseMirror .image-wrapper-single .image-menu-btn,
    .ProseMirror .image-wrapper .image-menu-btn,
    .ProseMirror figure .image-menu-btn {
      opacity: 0.9;
    }

    .ProseMirror .image-wrapper-single:hover .image-menu-btn,
    .ProseMirror .image-wrapper:hover .image-menu-btn,
    .ProseMirror figure:hover .image-menu-btn {
      opacity: 1;
      background: rgba(0, 0, 0, 0.9);
    }

    .ProseMirror .image-menu-btn:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.1);
    }

    .ProseMirror .image-menu-btn:active {
      transform: scale(0.95);
    }

    /* Ensure empty paragraphs after images are visible and clickable */
    .ProseMirror p:empty {
      min-height: 1.8em;
      margin: 0.5rem 0;
      padding: 0.25rem 0;
    }

    .ProseMirror p:empty::before {
      content: '\\200B'; /* Zero-width space to make paragraph clickable */
      display: inline;
    }

    /* Show cursor position hint on empty paragraphs */
    .ProseMirror-focused p:empty {
      position: relative;
    }

    .ProseMirror-focused p:empty::after {
      content: 'Type here...';
      color: #9ca3af;
      font-style: italic;
      position: absolute;
      left: 0;
      pointer-events: none;
    }

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
  @Input() allowImages: boolean = false;
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUpload = new EventEmitter<any>();
  @Output() imageDelete = new EventEmitter<string>(); // Emits image URL to delete from S3

  editorView!: EditorView;
  wordCount: number = 0;
  isImageUploading: boolean = false;
  private currentValue: string = '';
  private isInitialized: boolean = false;
  private currentSchema!: Schema;
  private uploadedImages: Set<string> = new Set(); // Track uploaded image URLs

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
    // Use rich schema if images are allowed, otherwise use poetry schema
    this.currentSchema = this.allowImages ? richSchema : poetrySchema;

    // Keymap - Enter creates hard break (single line)
    const editorKeymap = keymap({
      'Enter': (state, dispatch) => {
        const { $from } = state.selection;
        const br = this.currentSchema.nodes['hard_break'].create();

        if (dispatch) {
          const tr = state.tr.replaceSelectionWith(br).scrollIntoView();
          dispatch(tr);
        }
        return true;
      },
      'Backspace': (state, dispatch) => {
        // Check if selection is on an image node
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
          const imageUrl = selection.node.attrs['src'];

          // Emit delete event if this image was uploaded via this editor
          if (this.uploadedImages.has(imageUrl)) {
            this.imageDelete.emit(imageUrl);
            this.uploadedImages.delete(imageUrl);
          }

          if (dispatch) {
            const tr = state.tr.deleteSelection();
            dispatch(tr);
          }
          return true;
        }
        return false;
      },
      'Delete': (state, dispatch) => {
        // Check if selection is on an image node
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
          const imageUrl = selection.node.attrs['src'];

          // Emit delete event if this image was uploaded via this editor
          if (this.uploadedImages.has(imageUrl)) {
            this.imageDelete.emit(imageUrl);
            this.uploadedImages.delete(imageUrl);
          }

          if (dispatch) {
            const tr = state.tr.deleteSelection();
            dispatch(tr);
          }
          return true;
        }
        return false;
      },
      'Mod-b': (state, dispatch) => {
        return toggleMark(this.currentSchema.marks['strong'])(state, dispatch);
      },
      'Mod-i': (state, dispatch) => {
        return toggleMark(this.currentSchema.marks['em'])(state, dispatch);
      },
      'Mod-z': undo,
      'Mod-y': redo,
      'Mod-Shift-z': redo
    });

    this.editorView = new EditorView(this.editorContainer.nativeElement, {
      state: EditorState.create({
        schema: this.currentSchema,
        plugins: [
          history(),
          editorKeymap
        ]
      }),
      dispatchTransaction: (transaction: Transaction) => {
        const newState = this.editorView.state.apply(transaction);
        this.editorView.updateState(newState);

        // Emit changes
        if (transaction.docChanged) {
          this.updateContent();
        }
      },
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        // Check if clicked on menu button
        const target = event.target as HTMLElement;
        if (target && target.classList.contains('image-menu-btn')) {
          event.preventDefault();
          event.stopPropagation();

          // Find the image node
          if (node.type.name === 'image') {
            this.showImageContextMenu(event as MouseEvent, view, nodePos, node);
            return true;
          }
        }

        // Handle clicks on images to select them
        if (node.type.name === 'image') {
          // Left click to select
          const { state, dispatch } = view;
          const tr = state.tr.setSelection(NodeSelection.create(state.doc, nodePos));
          dispatch(tr);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        click: (view, event) => {
          // Check if clicked on menu button
          const target = event.target as HTMLElement;
          if (target && target.classList.contains('image-menu-btn')) {
            event.preventDefault();
            event.stopPropagation();

            // Find the image node by imageId
            const imageId = target.getAttribute('data-image-id');
            if (imageId) {
              // Find the node position by traversing the document
              let foundNode: any = null;
              let foundPos = -1;

              view.state.doc.descendants((node, pos) => {
                if (node.type.name === 'image' && node.attrs['imageId'] === imageId) {
                  foundNode = node;
                  foundPos = pos;
                  return false; // Stop traversing
                }
                return true; // Continue traversing
              });

              if (foundNode && foundPos >= 0) {
                this.showImageContextMenu(event, view, foundPos, foundNode);
              }
            }
            return true;
          }
          return false;
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
    const fragment = DOMSerializer.fromSchema(this.currentSchema).serializeFragment(
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
    toggleMark(this.currentSchema.marks['strong'])(state, dispatch);
    this.editorView.focus();
  }

  toggleItalic(): void {
    const { state, dispatch } = this.editorView;
    toggleMark(this.currentSchema.marks['em'])(state, dispatch);
    this.editorView.focus();
  }

  setAlign(align: 'left' | 'center' | 'right'): void {
    const { state, dispatch } = this.editorView;
    const { from, to } = state.selection;

    const tr = state.tr;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === this.currentSchema.nodes['paragraph']) {
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
      const parser = DOMParser.fromSchema(this.currentSchema);
      const div = document.createElement('div');
      div.innerHTML = value || '<p></p>';
      const doc = parser.parse(div);

      const newState = EditorState.create({
        doc,
        schema: this.currentSchema,
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

  // Image upload methods
  triggerImageUpload(): void {
    if (!this.allowImages) return;

    const input = document.createElement('input');
    input.type = 'file';
    // Only accept common web-safe image formats
    input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
    input.multiple = false;

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.handleImageUpload(file);
      }
    };

    input.click();
  }

  async handleImageUpload(file: File): Promise<void> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert(`Unsupported image format: ${file.type}\n\nPlease use one of these formats:\n• JPEG/JPG\n• PNG\n• GIF\n• WebP\n\nNote: AVIF, HEIC, and other formats are not supported.`);
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    this.isImageUploading = true;

    try {
      const uploadResult = await this.uploadToS3(file);
      console.log('📸 Upload result:', uploadResult);

      // Handle different response formats
      if (uploadResult && (uploadResult.success || uploadResult.imageUrl || uploadResult.url)) {
        // Extract image URL from various possible response formats
        const imageUrl = uploadResult.image?.url || uploadResult.imageUrl || uploadResult.url;

        if (imageUrl) {
          this.insertImage(imageUrl, file.name);
          this.imageUpload.emit(uploadResult.image || { url: imageUrl });
        } else {
          throw new Error('No image URL in response');
        }
      } else {
        console.error('❌ Unexpected response format:', uploadResult);
        throw new Error(uploadResult.message || 'Upload failed - invalid response format');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to upload image. Please try again.';

      if (error.status === 401) {
        errorMessage = 'You must be logged in to upload images.';
      } else if (error.status === 413) {
        errorMessage = 'Image file is too large. Please try a smaller image.';
      } else if (error.status === 429) {
        errorMessage = 'Too many upload requests. Please wait a moment and try again.\n\nNote: You may be uploading too quickly. Wait 10-15 seconds before trying again.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Image upload error:', error);
      alert(errorMessage);
    } finally {
      this.isImageUploading = false;
    }
  }

  private async uploadToS3(file: File): Promise<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('submissionType', 'article');
    formData.append('alt', '');
    formData.append('caption', '');
    formData.append('temporary', 'true');

    return this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.UPLOADS.IMAGE}`, formData, { headers }).toPromise();
  }

  private insertImage(src: string, alt: string = ''): void {
    if (!this.allowImages || !this.currentSchema.nodes['image']) return;

    const { state, dispatch } = this.editorView;
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const imageNode = this.currentSchema.nodes['image'].create({
      src,
      alt,
      caption: null,
      imageId
    });

    // Track this uploaded image
    this.uploadedImages.add(src);

    // Create TWO empty paragraphs - one immediately after image for spacing
    const paragraph1 = this.currentSchema.nodes['paragraph'].create();
    const paragraph2 = this.currentSchema.nodes['paragraph'].create();

    // Get the current selection position
    const { from, to } = state.selection;

    console.log('📍 Inserting image at position:', from);

    // Build the fragment: image + 2 paragraphs
    const fragment = [imageNode, paragraph1, paragraph2];

    // Replace selection with the fragment
    let tr = state.tr.replaceWith(from, to, fragment);

    // Calculate cursor position - should be in the first paragraph after image
    const cursorPos = from + imageNode.nodeSize + 1;

    console.log('📍 Setting cursor at position:', cursorPos);
    console.log('📄 Document size:', tr.doc.content.size);

    try {
      // Try to set selection
      const $pos = tr.doc.resolve(cursorPos);
      tr = tr.setSelection(TextSelection.near($pos));
      console.log('✅ Cursor set successfully');
    } catch (e) {
      console.error('❌ Failed to set cursor:', e);
      // Fallback: put cursor at the end
      const endPos = tr.doc.content.size - 1;
      const $endPos = tr.doc.resolve(endPos);
      tr = tr.setSelection(TextSelection.near($endPos));
    }

    dispatch(tr);

    // Force focus with delay
    setTimeout(() => {
      this.editorView.focus();
      console.log('🎯 Editor focused');
    }, 50);
  }

  private showImageContextMenu(event: MouseEvent, view: EditorView, nodePos: number, node: any): void {
    // Remove any existing context menu
    const existingMenu = document.getElementById('image-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'image-context-menu';
    menu.className = 'fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 z-50';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const currentCaption = node.attrs.caption || '';

    // Menu items
    const menuItems = [
      {
        label: currentCaption ? '✏️ Edit Caption' : '➕ Add Caption',
        action: () => this.addOrEditCaption(view, nodePos, node)
      },
      {
        label: '🗑️ Remove Image',
        action: () => this.deleteImageNode(view, nodePos, node),
        danger: true
      }
    ];

    menuItems.forEach(item => {
      const button = document.createElement('button');
      button.className = `w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
        item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
      }`;
      button.textContent = item.label;
      button.onclick = () => {
        item.action();
        menu.remove();
      };
      menu.appendChild(button);
    });

    document.body.appendChild(menu);

    // Close menu on click outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  private addOrEditCaption(view: EditorView, nodePos: number, node: any): void {
    const currentCaption = node.attrs.caption || '';
    const newCaption = prompt('Enter image caption (or leave empty to remove):', currentCaption);

    // User cancelled
    if (newCaption === null) return;

    const { state, dispatch } = view;
    const attrs = {
      ...node.attrs,
      caption: newCaption.trim() || null
    };

    const tr = state.tr.setNodeMarkup(nodePos, null, attrs);
    dispatch(tr);
    view.focus();
  }

  private deleteImageNode(view: EditorView, nodePos: number, node: any): void {
    const imageUrl = node.attrs['src'];

    // Confirm deletion
    if (!confirm('Are you sure you want to remove this image?')) {
      return;
    }

    // Emit delete event if this image was uploaded via this editor
    if (this.uploadedImages.has(imageUrl)) {
      this.imageDelete.emit(imageUrl);
      this.uploadedImages.delete(imageUrl);
    }

    const { state, dispatch } = view;
    const tr = state.tr.delete(nodePos, nodePos + node.nodeSize);
    dispatch(tr);
    view.focus();
  }
}
