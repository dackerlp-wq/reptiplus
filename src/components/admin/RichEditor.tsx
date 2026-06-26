'use client'
import { useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
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
  Undo, Redo
} from 'lucide-react'

interface RichEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
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

export default function RichEditor({ value, onChange, placeholder = 'Začněte psát...' }: RichEditorProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null)

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
      // fallback: use base64
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

  if (!editor) return null

  return (
    <div className="border border-cream-dark rounded-xl overflow-hidden" ref={dropZoneRef}>
      {/* Toolbar */}
      <div className="bg-cream border-b border-cream-dark px-2 py-1.5 flex flex-wrap gap-0.5 items-center">
        {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Zpět"><Undo className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Znovu"><Redo className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        {/* Text style */}
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Tučně (Ctrl+B)"><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kurzíva (Ctrl+I)"><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Podtržení (Ctrl+U)"><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Přeškrtnutí"><Strikethrough className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Zvýraznit"><Highlighter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Kód"><Code className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        {/* Headings */}
        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Nadpis 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Nadpis 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Nadpis 3"><Heading3 className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        {/* Align */}
        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Zarovnat vlevo"><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Vycentrovat"><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Zarovnat vpravo"><AlignRight className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        {/* Lists */}
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Odrážky"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Číslovaný seznam"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citace"><Quote className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontální linka"><Minus className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-5 bg-cream-dark mx-1" />

        {/* Links & images */}
        <ToolbarButton active={editor.isActive('link')} onClick={setLink} title="Odkaz"><Link2 className="w-4 h-4" /></ToolbarButton>

        {/* Image upload via file picker or URL */}
        <label className="p-1.5 rounded hover:bg-cream-dark transition-colors text-charcoal cursor-pointer" title="Vložit obrázek ze souboru">
          <ImageIcon className="w-4 h-4" />
          <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFileInput} />
        </label>
        <ToolbarButton onClick={insertImageFromUrl} title="Vložit obrázek z URL"><ImageIcon className="w-4 h-4 opacity-50" /></ToolbarButton>
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
      </div>
    </div>
  )
}
