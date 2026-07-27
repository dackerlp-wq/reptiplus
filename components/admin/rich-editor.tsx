"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  AlignJustify,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  ImagePlus,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/admin/image-compress";
import { uploadEditorImageAction } from "@/lib/admin/actions";

/** Obrázek s možností velikosti (width) a obtékání (float left/right/center). */
const StyledImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.width || null,
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}` } : {},
      },
      align: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-align") || null,
        renderHTML: (attrs) => {
          if (attrs.align === "left")
            return { "data-align": "left", style: "float:left;margin:0 1rem .5rem 0" };
          if (attrs.align === "right")
            return { "data-align": "right", style: "float:right;margin:0 0 .5rem 1rem" };
          if (attrs.align === "center")
            return {
              "data-align": "center",
              style: "display:block;margin-left:auto;margin-right:auto",
            };
          return {};
        },
      },
    };
  },
});

/** Plnohodnotný WYSIWYG editor (Tiptap). Controlled — value je HTML. */
export function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    // KLÍČOVÉ pro Next.js App Router — jinak hydration mismatch a „editor nefunguje".
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      StyledImage.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "rich-content min-h-[10rem] max-h-[28rem] overflow-y-auto rounded-b-lg border border-t-0 border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Synchronizace zvenčí (přepnutí jazyka, AI překlad) → nastavit obsah.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && next !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(next, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[13rem] rounded-lg border border-cream-dark bg-white" />
    );
  }

  return (
    <div>
      <Toolbar editor={editor} />
      {editor.isActive("image") && <ImageControls editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/** Ovládání vybraného obrázku — velikost (zmenšit/zvětšit) a obtékání textem. */
function ImageControls({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes("image");
  const curW = attrs.width as string | undefined;
  const curA = attrs.align as string | undefined;
  const setW = (w: string | null) =>
    editor.chain().focus().updateAttributes("image", { width: w }).run();
  const setA = (a: string | null) =>
    editor.chain().focus().updateAttributes("image", { align: a }).run();

  const pill = (active: boolean) =>
    cn(
      "rounded px-2 py-1 transition-colors",
      active ? "bg-forest text-white" : "text-charcoal hover:bg-white",
    );

  return (
    <div className="flex flex-wrap items-center gap-1 border-x border-cream-dark bg-cream px-2 py-1.5 text-xs">
      <span className="mr-1 font-medium text-gray-soft">Velikost:</span>
      {(["25%", "50%", "75%", "100%"] as const).map((w) => (
        <button
          key={w}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setW(w)}
          className={pill(curW === w)}
        >
          {w}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setW(null)}
        className={pill(!curW)}
      >
        auto
      </button>
      <Divider />
      <span className="mr-1 font-medium text-gray-soft">Obtékání:</span>
      <Btn onClick={() => setA("left")} active={curA === "left"} title="Vlevo, text vpravo">
        <AlignLeft className="size-4" />
      </Btn>
      <Btn onClick={() => setA("center")} active={curA === "center"} title="Na střed">
        <AlignCenter className="size-4" />
      </Btn>
      <Btn onClick={() => setA("right")} active={curA === "right"} title="Vpravo, text vlevo">
        <AlignRight className="size-4" />
      </Btn>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setA(null)}
        className={pill(!curA)}
      >
        bez obtékání
      </button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", await compressImage(file));
      const res = await uploadEditorImageAction(fd);
      if (res.ok && res.url) {
        editor.chain().focus().setImage({ src: res.url }).run();
      } else {
        window.alert("Nahrání obrázku selhalo.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Odkaz (URL):", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-cream-dark bg-paper px-2 py-1.5">
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Tučné"
      >
        <Bold className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Kurzíva"
      >
        <Italic className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Přeškrtnuté"
      >
        <Strikethrough className="size-4" />
      </Btn>
      <Divider />
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Nadpis 2"
      >
        <Heading2 className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Nadpis 3"
      >
        <Heading3 className="size-4" />
      </Btn>
      <Divider />
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Odrážky"
      >
        <List className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Číslovaný seznam"
      >
        <ListOrdered className="size-4" />
      </Btn>
      <Divider />
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Zarovnat vlevo"
      >
        <AlignLeft className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Na střed"
      >
        <AlignCenter className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Zarovnat vpravo"
      >
        <AlignRight className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Do bloku"
      >
        <AlignJustify className="size-4" />
      </Btn>
      <Divider />
      <Btn onClick={setLink} active={editor.isActive("link")} title="Odkaz">
        <Link2 className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
        title="Zrušit odkaz"
      >
        <Link2Off className="size-4" />
      </Btn>
      <Btn
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Vložit obrázek"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
      </Btn>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => addImage(e.target.files?.[0] ?? null)}
      />
      <Divider />
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Zpět"
      >
        <Undo2 className="size-4" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Vpřed"
      >
        <Redo2 className="size-4" />
      </Btn>
    </div>
  );
}

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // preventDefault → neztratit výběr v editoru při kliku na tlačítko
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 transition-colors",
        active ? "bg-forest text-white" : "text-charcoal hover:bg-cream",
        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-cream-dark" />;
}
