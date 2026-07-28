"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AuthorNewStoryClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/author/stories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, publishStatus: "draft" })
      });
      const data = (await res.json()) as { story?: { id: string }; error?: string };
      if (res.status === 401) {
        router.push("/login?next=/author/new");
        return;
      }
      if (!res.ok || !data.story) throw new Error(data.error || "Không tạo được");
      router.push(`/author/${data.story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="author-studio author-form" onSubmit={onSubmit}>
      <p className="eyebrow">Linh các viết</p>
      <h1>Tạo truyện mới</h1>
      <label className="author-field">
        <span>Tiêu đề</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </label>
      <label className="author-field">
        <span>Tóm tắt</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={5000} />
      </label>
      {error ? <p className="author-studio-error">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={saving}>
        {saving ? "Đang khắc…" : "Lưu bản nháp"}
      </button>
    </form>
  );
}
