"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type PreviewChapter = {
  title: string;
  wordCount: number;
  charCount: number;
  preview: string;
};

export function AuthorImportClient({ storyId: storyIdProp }: { storyId?: string }) {
  const params = useParams<{ storyId?: string }>();
  const storyId = storyIdProp ?? params.storyId;
  const router = useRouter();
  const [text, setText] = useState("");
  const [cleanPaste, setCleanPaste] = useState(true);
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("draft");
  const [preview, setPreview] = useState<PreviewChapter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetStoryId, setTargetStoryId] = useState(storyId ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string; text: string }> | null>(null);

  async function ensureStoryId(): Promise<string> {
    if (targetStoryId) return targetStoryId;
    if (!newTitle.trim()) throw new Error("Nhập tiêu đề truyện mới hoặc chọn studio có sẵn");
    const res = await fetch("/api/author/stories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, publishStatus: "draft" })
    });
    const data = (await res.json()) as { story?: { id: string }; error?: string };
    if (!res.ok || !data.story) throw new Error(data.error || "Không tạo được truyện");
    setTargetStoryId(data.story.id);
    return data.story.id;
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files: Array<{ name: string; text: string }> = [];
    for (const file of Array.from(fileList)) {
      files.push({ name: file.name, text: await file.text() });
    }
    setBusy(true);
    setError(null);
    try {
      const id = await ensureStoryId();
      const res = await fetch(`/api/author/stories/${id}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, dryRun: true, cleanPaste })
      });
      const data = (await res.json()) as { chapters?: PreviewChapter[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Dry-run thất bại");
      setPendingFiles(files);
      setPreview(data.chapters ?? []);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function dryRunText() {
    setBusy(true);
    setError(null);
    try {
      const id = await ensureStoryId();
      const res = await fetch(`/api/author/stories/${id}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dryRun: true, cleanPaste })
      });
      const data = (await res.json()) as { chapters?: PreviewChapter[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Dry-run thất bại");
      setPendingFiles(null);
      setPreview(data.chapters ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview?.length) return;
    setBusy(true);
    setError(null);
    try {
      const id = await ensureStoryId();
      const payload = pendingFiles?.length
        ? { files: pendingFiles, dryRun: false, cleanPaste, publishStatus }
        : text.trim()
          ? { text, dryRun: false, cleanPaste, publishStatus }
          : null;
      if (!payload) {
        throw new Error("Hãy xem trước từ text hoặc file trước khi import");
      }
      const res = await fetch(`/api/author/stories/${id}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Import thất bại");
      router.push(`/author/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="author-studio author-form">
      <div className="author-studio-toolbar">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Nhập bản thảo TXT/MD</h1>
          <p className="author-studio-lead">
            Dùng marker <code>=== Chapter 1: Title ===</code>, <code># Chương 1 — …</code>, hoặc nhiều file.
          </p>
        </div>
        <Link className="author-studio-btn-secondary" href={targetStoryId ? `/author/${targetStoryId}` : "/author"}>
          Quay lại
        </Link>
      </div>

      {!storyId ? (
        <label className="author-field">
          <span>Tiêu đề truyện mới (nếu chưa có studio)</span>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} />
        </label>
      ) : null}

      <label className="author-field">
        <span>Dán nội dung</span>
        <textarea className="author-chapter-body" rows={14} value={text} onChange={(e) => setText(e.target.value)} />
      </label>

      <label className="author-field author-checkbox">
        <input type="checkbox" checked={cleanPaste} onChange={(e) => setCleanPaste(e.target.checked)} />
        <span>Clean paste (gộp soft line-break)</span>
      </label>

      <label className="author-field">
        <span>Hoặc chọn nhiều file</span>
        <input type="file" accept=".txt,.md,.markdown,text/plain" multiple onChange={(e) => void onFiles(e.target.files)} />
      </label>

      <label className="author-field">
        <span>Trạng thái khi import</span>
        <select value={publishStatus} onChange={(e) => setPublishStatus(e.target.value as "draft" | "published")}>
          <option value="draft">Nháp</option>
          <option value="published">Xuất bản ngay</option>
        </select>
      </label>

      {error ? <p className="author-studio-error">{error}</p> : null}

      <div className="author-studio-actions">
        <button type="button" className="auth-submit" disabled={busy || !text.trim()} onClick={() => void dryRunText()}>
          Xem trước
        </button>
        <button
          type="button"
          className="author-studio-btn-secondary"
          disabled={busy || !preview?.length || (!text.trim() && !pendingFiles?.length)}
          onClick={() => void commit()}
        >
          Import
        </button>
      </div>

      {preview ? (
        <section>
          <h2>Xem trước ({preview.length} chương)</h2>
          <ul className="author-story-list">
            {preview.map((ch, i) => (
              <li key={`${ch.title}-${i}`} className="author-story-card">
                <div>
                  <strong>{ch.title}</strong>
                  <p className="muted">
                    {ch.wordCount} từ · {ch.charCount} ký tự
                  </p>
                  <p className="author-import-preview">{ch.preview}…</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
