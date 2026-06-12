"use client";

import { BookOpen, BookOpenCheck, Clock3, Flame, Sparkles, User } from "lucide-react";
import { CharMapBlock } from "@/components/CharMapBlock";
import dynamic from "next/dynamic";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { FollowButton } from "@/components/FollowButton";
import { NotificationBell } from "@/components/NotificationBell";
import { fetchReadingProgress } from "@/lib/api-client";
import { storyDisplayDescription } from "@/lib/story-description";
import type { ChapterSummary, CursorPage, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";
import { mergeHistoryItems } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { ChapterList, CHAPTER_PAGE_SIZE } from "@/components/reader/ChapterList";

const ThreeStoryStage = dynamic(() => import("@/components/ThreeStoryStage").then((mod) => mod.ThreeStoryStage), {
  ssr: false
});

type StoryDetailClientProps = {
  story: StorySummary;
  chapters: ChapterSummary[];
  totalChapters: number;
  recommendations: StorySummary[];
};

type AdminStoryEditField = "storyTitle" | "author" | "description";
type AdminStoryEditState = { field: AdminStoryEditField; value: string } | null;

export function StoryDetailClient({ story, chapters, totalChapters, recommendations }: StoryDetailClientProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const decorativeWebglEnabled = useDecorativeWebglEnabled();
  const currentUser = useAppSelector((state) => state.identity.user);
  const [currentStory, setCurrentStory] = useState(story);
  const [chapterPage, setChapterPage] = useState(chapters);
  const [chapterPageStart, setChapterPageStart] = useState(chapters[0]?.chapterNumber ?? 1);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chapterLoadError, setChapterLoadError] = useState<string | null>(null);
  const [chapterSearch, setChapterSearch] = useState("");
  const [activeChapterSearch, setActiveChapterSearch] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [adminEdit, setAdminEdit] = useState<AdminStoryEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);
  const history = useAppSelector((state) => state.history.items.find((item) => item.storyId === currentStory.id));
  const firstChapter = chapterPage[0] ?? null;
  const continueChapter = history?.chapterNumber ?? firstChapter?.chapterNumber ?? null;
  const maxReadChapter = history?.maxReadChapterNumber ?? 0;
  const updatedLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(currentStory.updatedAt));
  const pageFirstChapter = chapterPage[0]?.chapterNumber ?? 0;
  const pageLastChapter = chapterPage.at(-1)?.chapterNumber ?? 0;
  const isSearchingChapters = Boolean(activeChapterSearch);
  const hasPreviousChapterPage = pageFirstChapter > 1;
  const hasNextChapterPage = !isSearchingChapters && pageLastChapter > 0 && pageLastChapter < totalChapters;
  const chapterRangeLabel = isSearchingChapters ? `${chapterPage.length} kết quả` : chapterPage.length > 0 ? `${pageFirstChapter}-${pageLastChapter}/${totalChapters}` : `0/${totalChapters}`;
  const currentChapterPage = useMemo(() => Math.max(1, Math.ceil(Math.max(1, pageFirstChapter) / CHAPTER_PAGE_SIZE)), [pageFirstChapter]);
  const totalChapterPages = Math.max(1, Math.ceil(Math.max(0, totalChapters) / CHAPTER_PAGE_SIZE));

  useEffect(() => {
    fetchReadingProgress()
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    setCurrentStory(story);
  }, [story]);

  useEffect(() => {
    setDescExpanded(false);
  }, [story.id]);

  function startAdminEdit(field: AdminStoryEditField, value: string | null | undefined) {
    if (!currentUser?.isAdmin || adminEditSaving) return;
    setAdminEdit({ field, value: value ?? "" });
    setAdminEditError(null);
  }

  async function saveAdminEdit() {
    if (!adminEdit || !currentUser?.isAdmin) return;
    setAdminEditSaving(true);
    setAdminEditError(null);
    const previousStory = currentStory;
    const optimistic = {
      ...currentStory,
      title: adminEdit.field === "storyTitle" ? adminEdit.value : currentStory.title,
      author: adminEdit.field === "author" ? adminEdit.value : currentStory.author,
      description: adminEdit.field === "description" ? adminEdit.value : currentStory.description
    };
    setCurrentStory(optimistic);
    setAdminEdit(null);

    try {
      const response = await fetch("/api/admin/reader-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: currentStory.id,
          ...(adminEdit.field === "storyTitle" ? { storyTitle: adminEdit.value } : {}),
          ...(adminEdit.field === "author" ? { author: adminEdit.value } : {}),
          ...(adminEdit.field === "description" ? { description: adminEdit.value } : {})
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Không lưu được chỉnh sửa.");
      }
      const refreshedResponse = await fetch(`/api/stories/${currentStory.id}`, { cache: "no-store" });
      if (refreshedResponse.ok) {
        const refreshed = (await refreshedResponse.json()) as StorySummary;
        setCurrentStory(refreshed);
        queryClient.setQueryData(["story", currentStory.id], refreshed);
      }
    } catch (error) {
      setCurrentStory(previousStory);
      setAdminEditError(error instanceof Error ? error.message : "Không lưu được chỉnh sửa.");
    } finally {
      setAdminEditSaving(false);
    }
  }

  async function loadChapterPage(targetChapter: number) {
    const cleanTarget = Math.min(Math.max(1, Math.floor(targetChapter)), Math.max(1, totalChapters));
    setIsLoadingChapters(true);
    setChapterLoadError(null);
    try {
      const params = new URLSearchParams({
        chapterNumber: String(cleanTarget),
        limit: String(CHAPTER_PAGE_SIZE)
      });
      const response = await fetch(`/api/stories/${currentStory.id}/chapters?${params.toString()}`);
      if (!response.ok) throw new Error("Không thể tải danh sách chương.");
      const data = (await response.json()) as CursorPage<ChapterSummary>;
      setChapterPage(data.items);
      setChapterPageStart(data.items[0]?.chapterNumber ?? cleanTarget);
      setActiveChapterSearch("");
      window.requestAnimationFrame(() => {
        document.getElementById("story-chapters")?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    } catch (error) {
      setChapterLoadError(error instanceof Error ? error.message : "Không thể tải danh sách chương.");
    } finally {
      setIsLoadingChapters(false);
    }
  }

  async function searchChapterList(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const searchText = chapterSearch.trim();
    if (!searchText) {
      setActiveChapterSearch("");
      await loadChapterPage(pageFirstChapter || 1);
      return;
    }

    const chapterNumber = Number(searchText);
    if (/^\d+$/.test(searchText) && Number.isFinite(chapterNumber)) {
      await loadChapterPage(chapterNumber);
      return;
    }

    setIsLoadingChapters(true);
    setChapterLoadError(null);
    try {
      const params = new URLSearchParams({
        q: searchText,
        limit: String(CHAPTER_PAGE_SIZE)
      });
      const response = await fetch(`/api/stories/${currentStory.id}/chapters?${params.toString()}`);
      if (!response.ok) throw new Error("Không thể tìm chương.");
      const data = (await response.json()) as CursorPage<ChapterSummary>;
      setChapterPage(data.items);
      setChapterPageStart(data.items[0]?.chapterNumber ?? 1);
      setActiveChapterSearch(searchText);
      window.requestAnimationFrame(() => {
        document.getElementById("story-chapters")?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    } catch (error) {
      setChapterLoadError(error instanceof Error ? error.message : "Không thể tìm chương.");
    } finally {
      setIsLoadingChapters(false);
    }
  }

  async function clearChapterSearch() {
    setChapterSearch("");
    setActiveChapterSearch("");
    await loadChapterPage(1);
  }

  return (
    <main className="app-shell story-detail-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Story navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/discover?kind=updated">Cập nhật</Link>
          <Link href="/updates">Chương mới</Link>
          <Link href="/reading-history">Tàng thư</Link>
        </nav>
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      {adminEdit ? (
        <div className="admin-edit-floating" role="status">
          {adminEditSaving ? <span>Đang lưu...</span> : null}
          {adminEditError ? <strong>{adminEditError}</strong> : null}
          <button type="button" onClick={saveAdminEdit} disabled={adminEditSaving}>
            Save
          </button>
          <button type="button" onClick={() => setAdminEdit(null)} disabled={adminEditSaving}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className="page-wrap">
        <section className="story-detail-hero">
          {decorativeWebglEnabled ? (
            <ThreeStoryStage
              coverImageUrl={currentStory.coverImageUrl}
              title={currentStory.title}
              progressPercent={totalChapters > 0 ? Math.min(100, (maxReadChapter / totalChapters) * 100) : 0}
            />
          ) : null}
          <StoryCover src={currentStory.coverImageUrl} title={currentStory.title} />
          <div className="story-detail-copy">
            <p className="eyebrow">{currentStory.primaryCategoryName || currentStory.category || "Truyện chữ"}</p>
            {adminEdit?.field === "storyTitle" ? (
              <input className="admin-inline-input admin-inline-title" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit({ field: "storyTitle", value: event.target.value })} />
            ) : (
              <h1 className={currentUser?.isAdmin ? "admin-editable-hidden" : undefined} onDoubleClick={() => startAdminEdit("storyTitle", currentStory.title)}>
                {currentStory.title}
              </h1>
            )}
            <div className="story-detail-meta">
              {adminEdit?.field === "author" ? (
                <input className="admin-inline-input" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit({ field: "author", value: event.target.value })} />
              ) : (
                <span
                  className={`story-meta-icon-badge${currentUser?.isAdmin ? " admin-editable-hidden" : ""}`}
                  onDoubleClick={() => startAdminEdit("author", currentStory.author)}
                >
                  <User size={12} aria-hidden="true" />
                  {currentStory.author || "Vô danh tác giả"}
                </span>
              )}
              <span className="story-meta-icon-badge">
                <BookOpen size={12} aria-hidden="true" />
                {totalChapters} chương
              </span>
              {currentStory.isCompleted ? (
                <span className="xi-badge-completed">Hoàn thành</span>
              ) : (
                <span className="xi-badge-ongoing">{currentStory.status || "Đang cập nhật"}</span>
              )}
              <span className="story-meta-icon-badge">
                <Clock3 size={12} aria-hidden="true" />
                Cập nhật {updatedLabel}
              </span>
              {currentStory.rankPosition ? (
                <span className="story-meta-icon-badge story-meta-rank">
                  <Flame size={12} aria-hidden="true" />
                  #{currentStory.rankPosition}
                </span>
              ) : null}
            </div>
            {adminEdit?.field === "description" ? (
              <textarea className="admin-content-editor admin-description-editor" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit({ field: "description", value: event.target.value })} />
            ) : (
              <div className={`story-detail-description-wrap${descExpanded ? " desc-expanded" : ""}`}>
                <p
                  className={currentUser?.isAdmin ? "story-detail-description admin-editable-hidden" : "story-detail-description"}
                  onDoubleClick={() => startAdminEdit("description", currentStory.description)}
                >
                  {storyDisplayDescription(currentStory)}
                </p>
                <button
                  type="button"
                  className={`story-desc-expand-btn${descExpanded ? " desc-collapse-btn" : ""}`}
                  onClick={() => setDescExpanded((v) => !v)}
                >
                  {descExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
              </div>
            )}
            <div className="story-detail-actions">
              {continueChapter ? (
                <Link className="auth-submit" href={storyHref(currentStory, continueChapter)}>
                  <BookOpenCheck size={16} />
                  {history ? `Đọc tiếp chương ${history.chapterNumber}` : "Đọc từ đầu"}
                </Link>
              ) : null}
              <FollowButton story={currentStory} />
              <Link className="chip" href="/">
                Thư viện
              </Link>
            </div>
            {maxReadChapter > 0 && totalChapters > 0 ? (() => {
              const progressPct = Math.min(100, Math.max(0, Math.round((maxReadChapter / totalChapters) * 100)));
              return (
                <div className="story-detail-hero-progress" aria-label="Tiến độ đọc">
                  <div className="story-detail-hero-progress-bar">
                    <div className="story-detail-hero-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="story-detail-hero-progress-label">
                    <BookOpenCheck size={13} />
                    {Math.min(maxReadChapter, totalChapters)}/{totalChapters} chương ({progressPct}%)
                  </span>
                </div>
              );
            })() : null}
          </div>
        </section>

        <CharMapBlock storyId={currentStory.id} />

        {recommendations.length > 0 ? (
          <section className="library-list-section" aria-label="Recommended stories">
            <div className="section-heading-row story-list-heading">
              <div>
                <p className="eyebrow">Đạo hữu trên con đường tương tự</p>
                <h2>Linh quyển cùng đạo</h2>
              </div>
              <span className="discovery-badge">
                <Sparkles size={15} />
                {recommendations.length} truyện
              </span>
            </div>
            <div className="recommendation-row">
              {recommendations.map((item) => (
                <Link className="recommendation-card" href={storyHref(item)} key={item.id}>
                  <StoryCover src={item.coverImageUrl} title={item.title} />
                  <div>
                    <h3>{item.title}</h3>
                    <div className="discovery-meta">
                      <span>{item.author || "Unknown author"}</span>
                      <span>{item.totalChapters} chương</span>
                      {item.primaryCategoryName ? <span>{item.primaryCategoryName}</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="library-list-section" id="story-chapters">
          <div className="section-heading-row story-list-heading">
            <div>
              <p className="eyebrow">Mục lục</p>
              <h2>Danh sách chương</h2>
            </div>
            <span className="discovery-badge">
              <Clock3 size={15} />
              {chapterRangeLabel}
            </span>
          </div>

          <ChapterList
            chapters={chapterPage}
            totalChapters={totalChapters}
            currentStory={currentStory}
            maxReadChapter={maxReadChapter}
            currentChapterNumber={history?.chapterNumber ?? null}
            isLoading={isLoadingChapters}
            error={chapterLoadError}
            chapterSearch={chapterSearch}
            activeChapterSearch={activeChapterSearch}
            pageFirstChapter={pageFirstChapter}
            pageLastChapter={pageLastChapter}
            chapterPageStart={chapterPageStart}
            currentChapterPage={currentChapterPage}
            totalChapterPages={totalChapterPages}
            isSearching={isSearchingChapters}
            hasPrevPage={hasPreviousChapterPage}
            hasNextPage={hasNextChapterPage}
            chapterRangeLabel={chapterRangeLabel}
            onChapterSearchChange={setChapterSearch}
            onSearch={searchChapterList}
            onClearSearch={clearChapterSearch}
            onLoadPage={loadChapterPage}
          />
        </section>
      </div>
      {continueChapter ? (
        <nav className="story-mobile-cta" aria-label="Story quick actions">
          <Link className="story-mobile-cta-primary" href={storyHref(currentStory, continueChapter)}>
            <BookOpenCheck size={16} />
            {history ? "Đọc tiếp" : "Đọc từ đầu"}
          </Link>
          <a className="story-mobile-cta-secondary" href="#story-chapters">
            Mục lục
          </a>
        </nav>
      ) : null}
    </main>
  );
}
