"use client";

import { Bold, Italic, List, LoaderCircle, Quote, Send, SmilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { FormEvent } from "react";
import type { ChapterComment } from "@/components/comment-types";
import { CommentRulesNote } from "@/components/CommentRulesNote";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/comment-rules";

type CommentEditorFormProps = {
  chapterId: string;
  parentId?: string;
  onCreated: (comment: ChapterComment) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
};

export function CommentEditorForm({ chapterId, parentId, onCreated, onCancel, autoFocus }: CommentEditorFormProps) {
  const [contentText, setContentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false
      })
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "comment-editor-content",
        "aria-label": parentId ? "Hồi đáp đạo hữu này" : "Luận đạo về chương này"
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      setContentText(activeEditor.getText().trim());
    }
  });

  useEffect(() => {
    if (!autoFocus) return;
    editor?.commands.focus("end");
  }, [autoFocus, editor]);

  function insertEmotion(value: string) {
    editor?.chain().focus().insertContent(value).run();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;

    const contentJson = editor.getJSON();
    const text = editor.getText().trim();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/chapters/${chapterId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, contentJson, parentId })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; item?: ChapterComment };

    if (!response.ok || !data.item) {
      setError(data.error ?? "Không gửi được đạo luận.");
      setLoading(false);
      return;
    }

    editor.commands.clearContent();
    setContentText("");
    setLoading(false);
    onCreated(data.item);
    onCancel?.();
  }

  return (
    <form className="comment-form" onSubmit={submit}>
      {!parentId ? <CommentRulesNote variant="list" className="comment-form-rules" /> : (
        <CommentRulesNote variant="compact" className="comment-form-rules" />
      )}
      <div className="comment-editor">
        <div className="comment-editor-toolbar" aria-label="Comment formatting">
          <button type="button" aria-pressed={editor?.isActive("bold") ?? false} title="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold size={15} />
          </button>
          <button type="button" aria-pressed={editor?.isActive("italic") ?? false} title="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic size={15} />
          </button>
          <button type="button" aria-pressed={editor?.isActive("blockquote") ?? false} title="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            <Quote size={15} />
          </button>
          <button type="button" aria-pressed={editor?.isActive("bulletList") ?? false} title="List" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List size={15} />
          </button>
          <span className="comment-editor-divider" />
          {["✨", "🔥", "😂", "🙏", "⚔️"].map((emotion) => (
            <button className="comment-emotion-button" type="button" key={emotion} title={`Emotion ${emotion}`} onClick={() => insertEmotion(emotion)}>
              {emotion}
            </button>
          ))}
          <SmilePlus size={15} className="comment-editor-smile" />
        </div>
        <div className="comment-editor-shell" data-empty={!contentText ? "true" : undefined}>
          {!contentText ? <span className="comment-editor-placeholder">{parentId ? "Hồi đáp đạo hữu này..." : "Luận đạo về chương này..."}</span> : null}
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="comment-form-footer">
        <span>
          {contentText.length}/{MAX_COMMENT_LENGTH}
        </span>
        <div>
          {onCancel ? (
            <button className="comment-ghost-button" type="button" onClick={onCancel}>
              Hủy
            </button>
          ) : null}
          <button
            className="comment-submit"
            type="submit"
            disabled={loading || contentText.length < MIN_COMMENT_LENGTH || contentText.length > MAX_COMMENT_LENGTH}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
            Gửi
          </button>
        </div>
      </div>
      {error ? <p className="comment-error">{error}</p> : null}
    </form>
  );
}
