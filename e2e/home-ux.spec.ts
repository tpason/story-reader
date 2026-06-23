import { test, expect } from "@playwright/test";
import { pickReadableStory, primeReaderTestStorage, seedReadingHistory } from "./helpers";

test.describe("home UX", () => {
  test("shows resume bar when reading history exists", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 2,
      chapterTitle: "Chương 2"
    });
    await primeReaderTestStorage(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const resumeBar = page.locator(".resume-mini-bar");
    await expect(resumeBar).toBeVisible({ timeout: 12_000 });
    await expect(resumeBar).toContainText(story.title);
    await expect(resumeBar).toContainText("Chương 2");
  });
});
