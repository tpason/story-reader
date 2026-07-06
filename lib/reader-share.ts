type QuoteShareInput = {
  quote: string;
  storyTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  storyPath: string;
};

export function buildQuoteShareText({ quote, storyTitle, chapterTitle, chapterNumber, storyPath }: QuoteShareInput) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${storyPath}` : storyPath;
  return `"${quote.trim()}"\n- ${storyTitle} · Ch.${chapterNumber} ${chapterTitle}\n${url}`;
}

export async function shareSelectedQuote(input: QuoteShareInput) {
  const text = buildQuoteShareText(input);
  const url = typeof window !== "undefined" ? `${window.location.origin}${input.storyPath}` : input.storyPath;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: input.storyTitle,
      text,
      url
    });
    return "shared" as const;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied" as const;
  }

  throw new Error("Không chia sẻ được trích đoạn.");
}
