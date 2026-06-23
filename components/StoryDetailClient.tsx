"use client";

import { BookOpen, BookOpenCheck, Check, Clock3, Flame, Share2, Sparkles, User } from "lucide-react";
import type { Route } from "next";
import { CharMapBlock } from "@/components/CharMapBlock";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MotionFX } from "@/components/MotionFX";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryDetailBreadcrumb } from "@/components/StoryDetailBreadcrumb";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { FollowButton } from "@/components/FollowButton";
import { storyDisplayDescription } from "@/lib/story-description";
import type { ChapterSummary, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { ChapterList } from "@/components/reader/ChapterList";
import { ChapterSidebarHeatmap } from "@/components/ChapterSidebarHeatmap";
import { ReadingResumeBar } from "@/components/ReadingResumeBar";
import { StoryDetailPushHint } from "@/components/StoryDetailPushHint";
import { StoryRatingWidget } from "@/components/StoryRatingWidget";
import { useReadingProgressSync } from "@/hooks/useReadingProgressSync";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { useStoryChapterPagination } from "@/hooks/useStoryChapterPagination";
import { useStoryDetailAdminEdit } from "@/hooks/useStoryDetailAdminEdit";
import { writeResumeNavigationTarget } from "@/lib/reader-resume";

const ThreeStoryStage = dynamic(() => import("@/components/ThreeStoryStage").then((mod) => mod.ThreeStoryStage), {
  ssr: false
});

type StoryDetailClientProps = {
  story: StorySummary;
  chapters: ChapterSummary[];
  totalChapters: number;
  recommendations?: StorySummary[];
  recommendationsSlot?: React.ReactNode;
  sameAuthorSlot?: React.ReactNode;
};

export function StoryDetailClient({ story, chapters, totalChapters, recommendations = [], recommendationsSlot, sameAuthorSlot }: StoryDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ compactMaxWidth: 1099 });
  const currentUser = useAppSelector((state) => state.identity.user);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title: currentStory.title, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }
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
  const [freshChapterNumber, setFreshChapterNumber] = useState<number | null>(null);
  const { isFresh } = useFreshStoryRealtime({
    scopeStoryId: currentStory.id,
    refreshRoute: true,
    onEvent: (event) => {
      if (typeof event.chapterNumber !== "number") return;
      setFreshChapterNumber(event.chapterNumber);
      window.setTimeout(() => setFreshChapterNumber((current) => (current === event.chapterNumber ? null : current)), 9000);
    }
  });
  const updatedLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(currentStory.updatedAt));
  useReadingProgressSync();

  useEffect(() => {
    setDescExpanded(false);
  }, [story.id]);

  useEffect(() => {
    if (!freshChapterNumber) return;
    const onPage = chapterPage.some((chapter) => chapter.chapterNumber === freshChapterNumber);
    if (!onPage && !isLoadingChapters) {
      loadChapterPage(freshChapterNumber);
    }
  }, [chapterPage, freshChapterNumber, isLoadingChapters, loadChapterPage]);

  return (
    <main className="app-shell story-detail-shell">
      <MotionFX variant="library" />
      <SiteHeader />

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
        <StoryDetailBreadcrumb storyTitle={currentStory.title} />
        <ReadingResumeBar storyId={currentStory.id} />
        {freshChapterNumber ? (
          <div className="story-detail-fresh-banner" role="status" aria-live="polite">
            <Sparkles size={15} aria-hidden="true" />
            <span>
              Linh khí dịch chuyển — chương <strong>{freshChapterNumber}</strong> vừa ấn định
            </span>
            <Link className="chip chip-active" href={storyHref(currentStory, freshChapterNumber)}>
              Đọc ngay
            </Link>
          </div>
        ) : null}
        <section className={`story-detail-hero story-detail-hero-modern ${isFresh(currentStory.id) ? "story-detail-hero-fresh" : ""}`.trim()}>
          {decorativeWebglEnabled ? (
            <ThreeStoryStage
              coverImageUrl={currentStory.coverImageUrl}
              title={currentStory.title}
              progressPercent={totalChapters > 0 ? Math.min(100, (maxReadChapter / totalChapters) * 100) : 0}
            />
          ) : (
            <div className="story-detail-hero-aura" aria-hidden="true" />
          )}
          <StoryCover src={currentStory.coverImageUrl} title={currentStory.title} />
          <div className="story-detail-copy">
            <p className="eyebrow">
              {currentStory.primaryCategorySlug ? (
                <Link href={`/categories/${currentStory.primaryCategorySlug}` as Route} className="category-eyebrow-link">
                  {currentStory.primaryCategoryName || currentStory.category || "Truyện chữ"}
                </Link>
              ) : (currentStory.primaryCategoryName || currentStory.category || "Truyện chữ")}
            </p>
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
                <Link
                  className="auth-submit"
                  href={storyHref(currentStory, continueChapter)}
                  onClick={() => {
                    if (!history) return;
                    writeResumeNavigationTarget(history.storyId, history.chapterNumber, {
                      scrollPosition: history.scrollPosition,
                      paragraphIndex: history.paragraphIndex ?? null
                    });
                  }}
                >
                  <BookOpenCheck size={16} />
                  {history ? `Đọc tiếp chương ${history.chapterNumber}` : "Đọc từ đầu"}
                </Link>
              ) : null}
              <FollowButton story={currentStory} />
              <button
                type="button"
                className={`chip story-share-btn${shareCopied ? " chip-active" : ""}`}
                onClick={handleShare}
                title="Chia sẻ truyện"
              >
                {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
                {shareCopied ? "Đã copy!" : "Chia sẻ"}
              </button>
              <Link className="chip" href="/">
                Thư viện
              </Link>
            </div>
            <StoryDetailPushHint storyId={currentStory.id} boosted={Boolean(freshChapterNumber)} />
            {maxReadChapter > 0 && totalChapters > 0 ? (() => {
              const progressPct = Math.min(100, Math.max(0, Math.round((maxReadChapter / totalChapters) * 100)));
              const activeChapter = history?.chapterNumber ?? continueChapter ?? 0;
              return (
                <div className="story-detail-hero-progress" aria-label="Tiến độ đọc">
                  <ChapterSidebarHeatmap
                    totalChapters={totalChapters}
                    maxReadChapter={maxReadChapter}
                    activeChapterNumber={activeChapter}
                    onJump={(chapterNumber) => {
                      writeResumeNavigationTarget(currentStory.id, chapterNumber, {});
                      router.push(storyHref(currentStory, chapterNumber));
                    }}
                  />
                  <span className="story-detail-hero-progress-label">
                    <BookOpenCheck size={13} />
                    {Math.min(maxReadChapter, totalChapters)}/{totalChapters} chương ({progressPct}%)
                  </span>
                </div>
              );
            })() : null}
          </div>
        </section>

        <StoryRatingWidget storyId={currentStory.id} />

        <CharMapBlock storyId={currentStory.id} />

        {recommendationsSlot ?? (recommendations.length > 0 ? (
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
                <Link
                  className={`recommendation-card ${isFresh(item.id) ? "recommendation-card-fresh" : ""}`.trim()}
                  href={storyHref(item)}
                  key={item.id}
                >
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
        ) : null)}

        {sameAuthorSlot}

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
            freshChapterNumber={freshChapterNumber}
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
