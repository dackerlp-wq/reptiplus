'use client'
import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Minus, Link2, ImageIcon, Highlighter,
  Undo, Redo, ShoppingBag, X,
} from 'lucide-react'

// TipTap mark for inline product mentions
const ProductMention = Mark.create({
  name: 'productMention',
  addAttributes() {
    return {
      'data-product-id': { default: null, parseHTML: el => el.getAttribute('data-product-id') },
      'data-product-slug': { default: null, parseHTML: el => el.getAttribute('data-product-slug') },
      'data-product-name': { default: null, parseHTML: el => el.getAttribute('data-product-name') },
    }
  },
  parseHTML() { return [{ tag: 'span[data-product-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'product-mention',
      style: 'border-bottom: 2px solid #E8A33D; color: #8B5E00; cursor: pointer; font-weight: 600;',
    }), 0]
  },
})

type ProductOption = { id: string; name_cs: string; slug: string; sku: string; images: string }

interface RichEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  products?: ProductOption[]
  onProductMention?: (product: ProductOption) => void
}

function ToolbarButton({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-cream-dark transition-colors ${active ? 'bg-cream-dark text-forest' : 'text-charcoal'}`}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ value, onChange, placeholder = 'Začněte psát...', products = [], onProductMention }: RichEditorProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      ProductMention,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. AI translate)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Close picker on outside click
  useEffect(() => {
    if (!showProductPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowProductPicker(false)
        setProductSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProductPicker])

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run()
      }
    } catch {
      const reader = new FileReader()
      reader.onload = e => {
        if (e.target?.result) {
          editor.chain().focus().setImage({ src: e.target.result as string }).run()
        }
      }
      reader.readAsDataURL(file)
    }
  }, [editor])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    files.forEach(uploadImage)
  }, [uploadImage])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'))
    if (files.length) {
      e.preventDefault()
      files.forEach(uploadImage)
    }
  }, [uploadImage])

  const setLink = () => {
    if (!editor) return
    const url = window.prompt('URL odkazu:', editor.getAttributes('link').href || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const insertImageFromUrl = () => {
    const url = window.prompt('URL obrázku:')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(uploadImage)
    e.target.value = ''
  }

  const insertProductMention = (product: ProductOption) => {
    if (!editor) return
    editor.chain().focus().setMark('productMention', {
      'data-product-id': product.id,
      'data-product-slug': product.slug,
      'data-product-name': product.name_cs,
    }).run()
    onProductMention?.(product)
    setProductSearch('')
    // keep picker open so user can select more text and mention another product
  }

  const removeMention = () => {
    editor?.chain().focus().unsetMark('productMention').run()
  }

  const filteredProducts = productSearch.length > 0
    ? products.filter(p =>
        p.name_cs.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 8)
    : products.slice(0, 8)

  const isActiveMention = editor?.isActive('productMention') ?? false

  const getFirstImage = (images: string) => {
    try { return JSON.parse(images)?.[0] || null } catch { return null }
  }

  if (!editor) return null

  return (
    <div className="border border-cream-dark rounded-xl overflow-hidden" ref={dropZoneRef}>
      {/* Toolbar */}
      <div className="bg-cream border-b border-cream-dark px-2 py-1.5 flex flex-wrap gap-0.5 items-center">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Zpět"><Undo className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Znovu"><Redo className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Tučně (Ctrl+B)"><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kurzíva (Ctrl+I)"><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Podtržení (Ctrl+U)"><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Přeškrtnutí"><Strikethrough className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Zvýraznit"><Highlighter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Kód"><Code className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Nadpis 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Nadpis 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Nadpis 3"><Heading3 className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Zarovnat vlevo"><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Vycentrovat"><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Zarovnat vpravo"><AlignRight className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Odrážky"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Číslovaný seznam"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citace"><Quote className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontální linka"><Minus className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        <ToolbarButton active={editor.isActive('link')} onClick={setLink} title="Odkaz"><Link2 className="w-4 h-4" /></ToolbarButton>

        <label className="p-1.5 rounded hover:bg-cream-dark transition-colors text-charcoal cursor-pointer" title="Vložit obrázek ze souboru">
          <ImageIcon className="w-4 h-4" />
          <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFileInput} />
        </label>
        <ToolbarButton onClick={insertImageFromUrl} title="Vložit obrázek z URL"><ImageIcon className="w-4 h-4 opacity-50" /></ToolbarButton>

        {products.length > 0 && (
          <>
            <div className="w-px h-5 bg-cream-dark mx-1" />
            {/* Product mention button */}
            <div className="relative" ref={pickerRef}>
              <ToolbarButton
                active={showProductPicker || isActiveMention}
                onClick={() => setShowProductPicker(v => !v)}
                title="Označit text jako zmínku produktu"
              >
                <ShoppingBag className="w-4 h-4" />
              </ToolbarButton>

              {showProductPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white border border-cream-dark rounded-xl shadow-xl overflow-hidden">
                  {isActiveMention && (
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); removeMention(); setShowProductPicker(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-b border-cream-dark font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> Odebrat zmínku produktu
                    </button>
                  )}
                  <div className="p-2 border-b border-cream-dark">
                    <input
                      autoFocus
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Hledat produkt..."
                      className="w-full px-2 py-1.5 text-sm border border-cream-dark rounded-lg focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredProducts.length === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-soft">Žádné produkty</p>
                    )}
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); insertProductMention(p) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cream text-left border-b border-cream-dark last:border-0"
                      >
                        {getFirstImage(p.images) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getFirstImage(p.images)} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded shrink-0" style={{ background: 'var(--color-amber)', opacity: 0.4 }} />
                        )}
                        <div>
                          <div className="text-sm font-medium leading-tight">{p.name_cs}</div>
                          <div className="text-xs text-gray-soft">{p.sku}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-1.5 text-xs text-gray-soft border-t border-cream-dark flex items-center justify-between">
                    <span>Označte text → vyberte produkt</span>
                    <button type="button" onClick={() => { setShowProductPicker(false); setProductSearch('') }}
                      className="text-xs font-bold text-charcoal hover:text-forest ml-2">Hotovo ✓</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drop zone hint when dragging */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onPaste={handlePaste}
        className="relative"
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_a]:text-forest [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-forest [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-gray-soft [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_mark]:bg-gold/40"
        />
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-transparent drag-over:border-forest/50 rounded-b-xl transition-colors" />
      </div>

      <div className="bg-cream border-t border-cream-dark px-3 py-1 text-xs text-gray-soft">
        Přetáhněte obrázky sem nebo je vložte ze schránky (Ctrl+V)
        {products.length > 0 && <> · <ShoppingBag className="inline w-3 h-3 mx-0.5" /> = označit text jako zmínku produktu</>}
      </div>
    </div>
  )
}
