"use client";

import { BookOpen, BookOpenCheck, Clock3, Flame, Sparkles, User } from "lucide-react";
import { CharMapBlock } from "@/components/CharMapBlock";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { FollowButton } from "@/components/FollowButton";
import { NotificationBell } from "@/components/NotificationBell";
import { storyDisplayDescription } from "@/lib/story-description";
import type { ChapterSummary, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { ChapterList } from "@/components/reader/ChapterList";
import { useReadingProgressSync } from "@/hooks/useReadingProgressSync";
import { useStoryChapterPagination } from "@/hooks/useStoryChapterPagination";
import { useStoryDetailAdminEdit } from "@/hooks/useStoryDetailAdminEdit";

const ThreeStoryStage = dynamic(() => import("@/components/ThreeStoryStage").then((mod) => mod.ThreeStoryStage), {
  ssr: false
});

type StoryDetailClientProps = {
  story: StorySummary;
  chapters: ChapterSummary[];
  totalChapters: number;
  recommendations: StorySummary[];
};

export function StoryDetailClient({ story, chapters, totalChapters, recommendations }: StoryDetailClientProps) {
  const queryClient = useQueryClient();
  const decorativeWebglEnabled = useDecorativeWebglEnabled();
  const currentUser = useAppSelector((state) => state.identity.user);
  const [descExpanded, setDescExpanded] = useState(false);
  const { currentStory, adminEdit, adminEditSaving, adminEditError, setAdminEdit, startAdminEdit, saveAdminEdit } = useStoryDetailAdminEdit({
    story,
    isAdmin: !!currentUser?.isAdmin,
    queryClient
  });
  const {
    chapterPage,
    chapterPageStart,
    isLoadingChapters,
    chapterLoadError,
    chapterSearch,
    activeChapterSearch,
    pageFirstChapter,
    pageLastChapter,
    isSearchingChapters,
    hasPreviousChapterPage,
    hasNextChapterPage,
    chapterRangeLabel,
    currentChapterPage,
    totalChapterPages,
    setChapterSearch,
    loadChapterPage,
    searchChapterList,
    clearChapterSearch
  } = useStoryChapterPagination({ storyId: currentStory.id, initialChapters: chapters, totalChapters });
  const history = useAppSelector((state) => state.history.items.find((item) => item.storyId === currentStory.id));
  const firstChapter = chapterPage[0] ?? null;
  const continueChapter = history?.chapterNumber ?? firstChapter?.chapterNumber ?? null;
  const maxReadChapter = history?.maxReadChapterNumber ?? 0;
  const updatedLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(currentStory.updatedAt));
  useReadingProgressSync();

  useEffect(() => {
    setDescExpanded(false);
  }, [story.id]);

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
