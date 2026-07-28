"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AuthorStory } from "@/lib/author-stories";

function statusLabel(status: AuthorStory["publishStatus"]) {
  if (status === "published") return "Đã xuất bản";
  if (status === "hidden") return "Đã ẩn";
  return "Bản nháp";
}

export function AuthorWorksClient() {
  const [items, setItems] = useState<AuthorStory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/author/stories", { credentials: "include" });
      if (res.status === 401) {
        setError("Cần đăng nhập động phủ để viết truyện.");
        setItems([]);
        return;
      }
      const data = (await res.json()) as { items?: AuthorStory[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="author-studio">
      <div className="author-studio-toolbar">
        <div>
          <p className="eyebrow">Linh các viết</p>
          <h1>Truyện của đạo hữu</h1>
          <p className="author-studio-lead">Tạo truyện mới, soạn chương, hoặc import bản thảo TXT/MD.</p>
        </div>
        <div className="author-studio-actions">
          <Link className="auth-submit author-studio-btn" href="/author/new">
            Tạo truyện
          </Link>
          <Link className="author-studio-btn-secondary" href="/author/import">
            Import
          </Link>
        </div>
      </div>

      {loading ? <p className="muted">Đang tải…</p> : null}
      {error ? (
        <p className="author-studio-error">
          {error}{" "}
          {error.includes("đăng nhập") ? (
            <Link href="/login?next=/author">Đăng nhập</Link>
          ) : null}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="muted">Chưa có truyện. Hãy tạo linh quyển đầu tiên.</p>
      ) : null}

      <ul className="author-story-list">
        {items.map((story) => (
          <li key={story.id} className="author-story-card">
            <div>
              <Link href={`/author/${story.id}`} className="author-story-title">
                {story.title}
              </Link>
              <p className="muted">
                {statusLabel(story.publishStatus)} · {story.totalChapters} chương đã xuất bản
              </p>
            </div>
            <div className="author-story-card-actions">
              {story.publishStatus === "published" ? (
                <Link href={`/stories/${story.id}`}>Đọc</Link>
              ) : null}
              <Link href={`/author/${story.id}`}>Quản lý</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
