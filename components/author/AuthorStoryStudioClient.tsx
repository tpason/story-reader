"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AuthorChapter, AuthorStory } from "@/lib/author-stories";

export function AuthorStoryStudioClient() {
  const params = useParams<{ storyId: string }>();
  const storyId = params.storyId;
  const router = useRouter();
  const [story, setStory] = useState<AuthorStory | null>(null);
  const [chapters, setChapters] = useState<AuthorChapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/author/stories/${storyId}`, { credentials: "include" });
    const data = (await res.json()) as { story?: AuthorStory; chapters?: AuthorChapter[]; error?: string };
    if (res.status === 401) {
      router.push(`/login?next=/author/${storyId}`);
      return;
    }
    if (!res.ok || !data.story) {
      setError(data.error || "Không tải được");
      return;
    }
    setStory(data.story);
    setChapters(data.chapters ?? []);
  }, [router, storyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMeta(patch: Partial<AuthorStory> & { publishStatus?: AuthorStory["publishStatus"] }) {
    if (!story) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/author/stories/${storyId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = (await res.json()) as { story?: AuthorStory; error?: string };
      if (!res.ok || !data.story) throw new Error(data.error || "Không lưu được");
      setStory(data.story);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function removeStory() {
    if (!confirm("Xóa truyện và mọi chương?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/author/stories/${storyId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Không xóa được");
      }
      router.push("/author");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
      setBusy(false);
    }
  }

  if (!story && !error) return <p className="muted">Đang tải studio…</p>;
  if (!story) return <p className="author-studio-error">{error}</p>;

  return (
    <div className="author-studio">
      <div className="author-studio-toolbar">
        <div>
          <p className="eyebrow">Studio</p>
          <h1>{story.title}</h1>
          <p className="muted">
            {story.publishStatus === "published" ? "Đã xuất bản" : story.publishStatus === "hidden" ? "Đã ẩn" : "Bản nháp"}
          </p>
        </div>
        <div className="author-studio-actions">
          <Link className="author-studio-btn-secondary" href="/author">
            Danh sách
          </Link>
          <Link className="author-studio-btn-secondary" href={`/author/${storyId}/import`}>
            Import
          </Link>
          <Link className="auth-submit author-studio-btn" href={`/author/${storyId}/chapters/new`}>
            Thêm chương
          </Link>
        </div>
      </div>

      <section className="author-form">
        <label className="author-field">
          <span>Tiêu đề</span>
          <input
            value={story.title}
            onChange={(e) => setStory({ ...story, title: e.target.value })}
            maxLength={200}
          />
        </label>
        <label className="author-field">
          <span>Tóm tắt</span>
          <textarea
            value={story.description ?? ""}
            onChange={(e) => setStory({ ...story, description: e.target.value })}
            rows={5}
            maxLength={5000}
          />
        </label>
        <div className="author-studio-actions">
          <button type="button" className="auth-submit" disabled={busy} onClick={() => void saveMeta({ title: story.title, description: story.description })}>
            Lưu meta
          </button>
          {story.publishStatus !== "published" ? (
            <button type="button" className="author-studio-btn-secondary" disabled={busy} onClick={() => void saveMeta({ publishStatus: "published" })}>
              Xuất bản truyện
            </button>
          ) : (
            <button type="button" className="author-studio-btn-secondary" disabled={busy} onClick={() => void saveMeta({ publishStatus: "draft" })}>
              Về bản nháp
            </button>
          )}
          {story.publishStatus === "published" ? (
            <Link href={`/stories/${story.id}`}>Xem trang truyện</Link>
          ) : null}
          <button type="button" className="author-danger" disabled={busy} onClick={() => void removeStory()}>
            Xóa truyện
          </button>
        </div>
      </section>

      {error ? <p className="author-studio-error">{error}</p> : null}

      <h2>Chương</h2>
      <ul className="author-story-list">
        {chapters.map((ch) => (
          <li key={ch.id} className="author-story-card">
            <div>
              <Link href={`/author/${storyId}/chapters/${ch.chapterNumber}`} className="author-story-title">
                {ch.chapterNumber}. {ch.title}
              </Link>
              <p className="muted">
                {ch.publishStatus === "published" ? "Đã xuất bản" : "Nháp"} · {ch.wordCount} từ
              </p>
            </div>
            <Link href={`/author/${storyId}/chapters/${ch.chapterNumber}`}>Sửa</Link>
          </li>
        ))}
      </ul>
      {chapters.length === 0 ? <p className="muted">Chưa có chương.</p> : null}
    </div>
  );
}
