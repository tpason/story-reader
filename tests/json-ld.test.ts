import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChapterArticleJsonLd, buildStoryBookJsonLd } from "../lib/json-ld.ts";

describe("json-ld", () => {
  const story = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Vĩnh Thoái Hiệp Sĩ",
    originalTitle: null,
    author: "Author",
    category: null,
    status: null,
    description: "Mô tả test",
    coverImageUrl: "/covers/demo.jpg",
    rankName: null,
    rankPosition: null,
    readerRank: null,
    readerScore: null,
    readerCountTotal: 0,
    readerCount30d: 0,
    guestCountTotal: 0,
    guestCount30d: 0,
    totalChapters: 120,
    isCompleted: false,
    sourceCode: "hako",
    primaryCategoryName: null,
    primaryCategorySlug: null,
    updatedAt: "2026-06-19T00:00:00.000Z"
  };

  it("builds Book schema for story", () => {
    const json = buildStoryBookJsonLd(story);
    assert.equal(json["@type"], "Book");
    assert.equal(json.name, story.title);
    assert.match(String(json.url), /11111111-1111-1111-1111-111111111111/);
  });

  it("builds Article schema for chapter", () => {
    const json = buildChapterArticleJsonLd(story, {
      id: "ch-1",
      storyId: story.id,
      chapterNumber: 3,
      title: "Khởi đầu",
      isDownloaded: true,
      isPolished: true,
      isTranslated: true,
      isAudioGenerated: false,
      hasDbText: true,
      textSource: "polished",
      hasAudio: false,
      updatedAt: "2026-06-19T00:00:00.000Z"
    });
    assert.equal(json["@type"], "Article");
    assert.equal(json.headline, "Chương 3: Khởi đầu");
    assert.equal((json.isPartOf as { "@type"?: string })["@type"], "Book");
  });

  it("dedupes crawled chapter titles in Article headline", () => {
    const json = buildChapterArticleJsonLd(story, {
      id: "ch-1",
      storyId: story.id,
      chapterNumber: 1,
      title: "Chương 1: Chương 1",
      isDownloaded: true,
      isPolished: true,
      isTranslated: true,
      isAudioGenerated: false,
      hasDbText: true,
      textSource: "polished",
      hasAudio: false,
      updatedAt: "2026-06-19T00:00:00.000Z"
    });
    assert.equal(json.headline, "Chương 1");
  });
});
