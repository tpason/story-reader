"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthorChapter } from "@/lib/author-stories";

type Props = { mode: "new" | "edit" };

export function AuthorChapterEditorClient({ mode }: Props) {
  const params = useParams<{ storyId: string; chapterNumber?: string }>();
  const storyId = params.storyId;
  const chapterNumber = params.chapterNumber ? Number(params.chapterNumber) : null;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !chapterNumber) return;
    void (async () => {
      const res = await fetch(`/api/author/stories/${storyId}/chapters/${chapterNumber}`, {
        credentials: "include"
      });
      const data = (await res.json()) as { chapter?: AuthorChapter; error?: string };
      if (res.status === 401) {
        router.push(`/login?next=/author/${storyId}/chapters/${chapterNumber}`);
        return;
      }
      if (!res.ok || !data.chapter) {
        setError(data.error || "Không tải được chương");
        return;
      }
      setTitle(data.chapter.title);
      setContent(data.chapter.content);
      setPublishStatus(data.chapter.publishStatus);
    })();
  }, [chapterNumber, mode, router, storyId]);

  async function save(nextStatus: "draft" | "published") {
    setBusy(true);
    setError(null);
    try {
      const payload = { title, content, publishStatus: nextStatus };
      const res =
        mode === "new"
          ? await fetch(`/api/author/stories/${storyId}/chapters`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            })
          : await fetch(`/api/author/stories/${storyId}/chapters/${chapterNumber}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
      const data = (await res.json()) as { chapter?: AuthorChapter; error?: string };
      if (!res.ok || !data.chapter) throw new Error(data.error || "Không lưu được");
      router.push(`/author/${storyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (mode !== "edit" || !chapterNumber) return;
    if (!confirm("Xóa chương này?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/author/stories/${storyId}/chapters/${chapterNumber}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Không xóa được");
      }
      router.push(`/author/${storyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
      setBusy(false);
    }
  }

  return (
    <div className="author-studio author-form">
      <div className="author-studio-toolbar">
        <div>
          <p className="eyebrow">Soạn chương</p>
          <h1>{mode === "new" ? "Chương mới" : `Chương ${chapterNumber}`}</h1>
        </div>
        <Link className="author-studio-btn-secondary" href={`/author/${storyId}`}>
          Về studio
        </Link>
      </div>

      <label className="author-field">
        <span>Tiêu đề chương</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </label>
      <label className="author-field">
        <span>Nội dung</span>
        <textarea
          className="author-chapter-body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          required
        />
      </label>

      {error ? <p className="author-studio-error">{error}</p> : null}

      <div className="author-studio-actions">
        <button type="button" className="auth-submit" disabled={busy} onClick={() => void save("draft")}>
          Lưu nháp
        </button>
        <button type="button" className="author-studio-btn-secondary" disabled={busy} onClick={() => void save("published")}>
          Xuất bản chương
        </button>
        {mode === "edit" ? (
          <button type="button" className="author-danger" disabled={busy} onClick={() => void remove()}>
            Xóa
          </button>
        ) : null}
        <span className="muted">Hiện: {publishStatus === "published" ? "đã xuất bản" : "nháp"}</span>
      </div>
    </div>
  );
}
