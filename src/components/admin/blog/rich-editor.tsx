"use client";

/**
 * TipTap-based rich text editor for blog post content. Emits semantic
 * HTML that the existing blog/[slug] post renderer already processes
 * (extractFaqs, addHeadingIds, extractHowToSteps) — no special markup,
 * just clean H2/H3/H4/P/UL/OL/LI/BLOCKQUOTE/PRE/CODE/A/IMG.
 */
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link2,
  Image as ImageIcon,
  Heading2,
  Heading3,
  Heading4,
  Minus,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export function RichEditor({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "bg-zinc-900 rounded p-3 text-sm font-mono" } },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener", target: "_blank" },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-lg max-w-full" } }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-600 text-zinc-200 leading-relaxed",
      },
    },
  });

  // Keep editor content in sync when value prop changes externally (e.g.
  // form reset, loading existing post). Comparing HTML strings avoids
  // infinite update loops with onUpdate.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm">
        Loading editor…
      </div>
    );
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/blog/upload-image", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Upload failed: ${err.error ?? res.status}`);
        return;
      }
      const data = await res.json();
      editor?.chain().focus().setImage({ src: data.url }).run();
    } finally {
      setUploading(false);
    }
  }

  function handleAddLink() {
    const url = window.prompt("Enter URL", "https://");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 mb-2 p-2 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <ToolButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          title="Heading 4"
        >
          <Heading4 className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bulleted list"
        >
          <List className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code2 className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          active={editor.isActive("link")}
          onClick={handleAddLink}
          title="Link"
        >
          <Link2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => fileInputRef.current?.click()}
          title="Insert image"
          disabled={uploading}
        >
          <ImageIcon className="w-4 h-4" />
          {uploading && <span className="text-[10px] ml-1">uploading…</span>}
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="w-4 h-4" />
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-zinc-700 text-zinc-100"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-zinc-800 mx-1" />;
}
