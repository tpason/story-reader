"use client";

import { BookOpen, BookOpenCheck, Check, Clock3, Share2, Sparkles, User } from "lucide-react";
import type { Route } from "next";
import { CharMapBlock } from "@/components/CharMapBlock";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
const MotionFX = dynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX), { ssr: false });
import { SiteHeader } from "@/components/SiteHeader";
import { StoryDetailBreadcrumb } from "@/components/StoryDetailBreadcrumb";
import { CoverRailSlide } from "@/components/CoverRailSlide";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { FollowButton } from "@/components/FollowButton";
import { storyDisplayDescription } from "@/lib/story-description";
import { formatStoryUpdatedLabel } from "@/lib/content-timestamps";
import type { ChapterSummary, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { ChapterList } from "@/components/reader/ChapterList";
import { ChapterSidebarHeatmap } from "@/components/ChapterSidebarHeatmap";
import { ReadingResumeBar } from "@/components/ReadingResumeBar";
import { StoryDetailPushHint } from "@/components/StoryDetailPushHint";
import { StoryRatingWidget } from "@/components/StoryRatingWidget";
import { StoryRankMeta } from "@/components/StoryRankMeta";
import { useReadingProgressSync } from "@/hooks/useReadingProgressSync";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { useStoryChapterPagination } from "@/hooks/useStoryChapterPagination";
import { StoryDetailOfflineDownload } from "@/components/StoryDetailOfflineDownload";
import { useStoryDetailAdminEdit } from "@/hooks/useStoryDetailAdminEdit";
import { writeResumeNavigationTarget } from "@/lib/reader-resume";
import { estimateReadingMinutes, formatReadingDuration } from "@/lib/reading-estimate";
import { displayStoryAuthor, resolveStoryStatusBadge } from "@/lib/story-status";
import { prefetchReaderChapterQuery } from "@/lib/reader-query";

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
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ compactMaxWidth: 839 });
  // Soft-mount stage after idle — CSS aura stays painted; no hard aura↔WebGL cut.
  const stageReady = useDeferredWebglMount(decorativeWebglEnabled, 900);
  const [stageVisible, setStageVisible] = useState(false);
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
    isExpandedList,
    chapterRangeLabel,
    currentChapterPage,
    totalChapterPages,
    setChapterSearch,
    loadChapterPage,
    appendNextChapterPage,
    searchChapterList,
    clearChapterSearch
  } = useStoryChapterPagination({ storyId: currentStory.id, initialChapters: chapters, totalChapters });
  const history = useAppSelector((state) => state.history.items.find((item) => item.storyId === currentStory.id));
  const firstChapter = chapterPage[0] ?? null;
  const continueChapter = history?.chapterNumber ?? firstChapter?.chapterNumber ?? null;
  const heroCtaChapter = continueChapter ?? 1;
  const heroCtaLabel = history
    ? `Tiếp tục chương ${history.chapterNumber}`
    : firstChapter
      ? `Bắt đầu chương ${firstChapter.chapterNumber}`
      : "Đọc từ đầu";
  const estimatedStoryMinutes =
    totalChapters > 0 ? estimateReadingMinutes(totalChapters * 1000) : 0;
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
  const updatedLabel = formatStoryUpdatedLabel(currentStory.updatedAt);
  const statusBadge = resolveStoryStatusBadge(currentStory);
  const authorLabel = displayStoryAuthor(currentStory.author);
  useReadingProgressSync();

  useEffect(() => {
    setDescExpanded(false);
  }, [story.id]);

  // Prefetch ReaderClient chunk so chapter nav does not wait on the dynamic import.
  useEffect(() => {
    void import("@/components/ReaderClient");
  }, []);

  // Warm continue/start chapter route + chapter JSON while the user is on story detail.
  useEffect(() => {
    if (!heroCtaChapter) return;
    router.prefetch(storyHref(currentStory, heroCtaChapter));
    void prefetchReaderChapterQuery(queryClient, currentStory.id, heroCtaChapter);
  }, [router, currentStory, heroCtaChapter, queryClient]);

  useEffect(() => {
    if (!decorativeWebglEnabled || !stageReady) {
      setStageVisible(false);
      return;
    }
    const id = window.setTimeout(() => setStageVisible(true), 48);
    return () => window.clearTimeout(id);
  }, [decorativeWebglEnabled, stageReady]);

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
              Linh khí dịch chuyển. Chương <strong>{freshChapterNumber}</strong> vừa ấn định
            </span>
            <Link className="chip chip-active" href={storyHref(currentStory, freshChapterNumber)}>
              Đọc ngay
            </Link>
          </div>
        ) : null}
        {/* Kakao/Qidian/WebNovel: one hero composition — cover+meta+CTA, then chapters, related last */}
        <section
          className={`story-detail-hero story-detail-hero-modern story-detail-composition ${isFresh(currentStory.id) ? "story-detail-hero-fresh" : ""}`.trim()}
        >
          <div
            className={`story-detail-hero-aura${stageVisible ? " story-detail-hero-aura--under-stage" : ""}`}
            aria-hidden="true"
          />
          {decorativeWebglEnabled && stageReady ? (
            <div
              className={`story-detail-stage-host${stageVisible ? " story-detail-stage-host--visible" : ""}`}
              aria-hidden="true"
            >
              <ThreeStoryStage
                coverImageUrl={currentStory.coverImageUrl}
                title={currentStory.title}
                progressPercent={totalChapters > 0 ? Math.min(100, (maxReadChapter / totalChapters) * 100) : 0}
              />
            </div>
          ) : null}

          <div className="story-detail-hero-cluster">
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
                    {authorLabel}
                  </span>
                )}
                <span className="story-meta-icon-badge">
                  <BookOpen size={12} aria-hidden="true" />
                  {totalChapters} chương
                </span>
                <span className="story-meta-icon-badge">
                  <Clock3 size={12} aria-hidden="true" />
                  {updatedLabel ?? "Cập nhật gần đây"}
                </span>
                <StoryRankMeta story={currentStory} />
              </div>

              {/* B1: genre + status as bookstore chips (status moved out of meta) */}
              <nav className="story-detail-tag-row" aria-label="Thẻ linh quyển">
                {currentStory.primaryCategorySlug ? (
                  <Link
                    className="chip story-detail-tag-chip"
                    href={`/categories/${currentStory.primaryCategorySlug}` as Route}
                  >
                    {currentStory.primaryCategoryName || currentStory.category || "Truyện chữ"}
                  </Link>
                ) : (
                  <span className="chip story-detail-tag-chip">
                    {currentStory.primaryCategoryName || currentStory.category || "Truyện chữ"}
                  </span>
                )}
                <span
                  className={`chip story-detail-tag-chip${statusBadge.completed ? " story-detail-tag-chip--done" : " story-detail-tag-chip--ongoing"}`}
                >
                  {statusBadge.label}
                </span>
              </nav>

              <div className="story-detail-cta-cluster">
                <Link
                  className="auth-submit story-detail-primary-cta"
                  href={storyHref(currentStory, heroCtaChapter)}
                  onClick={() => {
                    if (!history) return;
                    writeResumeNavigationTarget(history.storyId, history.chapterNumber, {
                      scrollPosition: history.scrollPosition,
                      paragraphIndex: history.paragraphIndex ?? null
                    });
                  }}
                >
                  <BookOpenCheck size={16} />
                  {heroCtaLabel}
                </Link>
                <div className="story-detail-secondary-actions" aria-label="Thao tác phụ">
                  <FollowButton story={currentStory} />
                  <button
                    type="button"
                    className={`story-detail-quiet-action story-share-btn${shareCopied ? " is-done" : ""}`}
                    onClick={handleShare}
                    title="Chia sẻ truyện"
                  >
                    {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
                    {shareCopied ? "Đã copy!" : "Chia sẻ"}
                  </button>
                  <Link className="story-detail-quiet-action" href="/">
                    Thư viện
                  </Link>
                </div>
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

              <div className="story-detail-rating-slot">
                <StoryRatingWidget storyId={currentStory.id} compact />
              </div>

              {/* Default closed — heatmap / estimate / push; rating stays above fold */}
              <details className="story-detail-progress-disclosure">
                <summary className="story-detail-progress-summary">
                  <BookOpenCheck size={15} aria-hidden />
                  <span>Tiến độ đạo hành</span>
                  {maxReadChapter > 0 && totalChapters > 0 ? (
                    <small>
                      {Math.min(maxReadChapter, totalChapters)}/{totalChapters}
                    </small>
                  ) : null}
                </summary>
                <div className="story-detail-hero-aside">
                  <StoryDetailPushHint storyId={currentStory.id} boosted={Boolean(freshChapterNumber)} />
                  {estimatedStoryMinutes > 0 ? (
                    <p className="story-detail-read-estimate">
                      Ước tính ~{formatReadingDuration(estimatedStoryMinutes)} đọc hết
                    </p>
                  ) : null}
                  {maxReadChapter > 0 && totalChapters > 0 ? (
                    <div className="story-detail-hero-progress" aria-label="Tiến độ đọc">
                      <ChapterSidebarHeatmap
                        totalChapters={totalChapters}
                        maxReadChapter={maxReadChapter}
                        activeChapterNumber={history?.chapterNumber ?? continueChapter ?? 0}
                      />
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        </section>

        <div className="story-detail-flow">
          <section className="story-detail-chapters library-list-section" id="story-chapters" aria-label="Danh sách chương">
            <div className="story-detail-chapters-sticky">
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
              isExpandedList={isExpandedList}
              onChapterSearchChange={setChapterSearch}
              onSearch={searchChapterList}
              onClearSearch={clearChapterSearch}
              onLoadPage={loadChapterPage}
              onAppendNext={appendNextChapterPage}
              freshChapterNumber={freshChapterNumber}
            />
          </section>

          <div className="story-detail-utilities">
            <CharMapBlock storyId={currentStory.id} />
            <StoryDetailOfflineDownload story={currentStory} startChapter={heroCtaChapter} />
          </div>

          <div className="story-detail-related">
            {recommendationsSlot ?? (recommendations.length > 0 ? (
              <section className="library-list-section story-detail-related-rail" aria-label="Recommended stories">
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
                <CoverRailSlide label="Linh quyển cùng đạo" className="story-rec-cover-rail-slide">
                  {recommendations.map((item) => (
                    <Link
                      className={`story-rec-card story-rec-card--cover ${isFresh(item.id) ? "recommendation-card-fresh" : ""}`.trim()}
                      href={storyHref(item)}
                      key={item.id}
                      role="listitem"
                    >
                      <StoryCover src={item.coverImageUrl} title={item.title} />
                      <div className="story-rec-body">
                        <h3>{item.title}</h3>
                        <small className="story-rec-meta-line">{item.totalChapters} chương</small>
                      </div>
                    </Link>
                  ))}
                </CoverRailSlide>
              </section>
            ) : null)}
            {sameAuthorSlot}
          </div>
        </div>
      </div>
      {heroCtaChapter ? (
        <nav className="story-mobile-cta" aria-label="Story quick actions">
          <Link className="story-mobile-cta-primary" href={storyHref(currentStory, heroCtaChapter)}>
            <BookOpenCheck size={16} />
            {heroCtaLabel}
          </Link>
          <FollowButton story={currentStory} compact className="story-mobile-cta-follow" />
          <a className="story-mobile-cta-secondary" href="#story-chapters">
            Mục lục
          </a>
        </nav>
      ) : null}
    </main>
  );
}
