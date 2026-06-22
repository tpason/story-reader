type QuoteCardInput = {
  quote: string;
  storyTitle: string;
  chapterTitle: string;
  chapterNumber: number;
};

export function truncateQuoteForCard(quote: string, maxLength = 280) {
  const trimmed = quote.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

export async function renderQuoteShareImage(input: QuoteCardInput) {
  if (typeof document === "undefined") throw new Error("Canvas unavailable");

  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#17120d");
  gradient.addColorStop(0.55, "#241a12");
  gradient.addColorStop(1, "#0f0c09");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(216, 166, 63, 0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  ctx.fillStyle = "rgba(245, 215, 94, 0.18)";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText("✦", 88, 120);

  ctx.fillStyle = "#f5d75e";
  ctx.font = "700 42px Georgia, serif";
  ctx.fillText("BetterBox", 120, 118);

  ctx.fillStyle = "#f3ead8";
  ctx.font = "italic 52px Georgia, serif";
  const quote = `"${truncateQuoteForCard(input.quote)}"`;
  const quoteLines = wrapCanvasText(ctx, quote, width - 176, 68);
  let y = 280;
  for (const line of quoteLines.slice(0, 9)) {
    ctx.fillText(line, 88, y);
    y += 68;
  }

  ctx.fillStyle = "rgba(232, 220, 196, 0.82)";
  ctx.font = "500 34px Georgia, serif";
  const meta = `${input.storyTitle} · Ch.${input.chapterNumber}`;
  ctx.fillText(meta, 88, height - 180);

  ctx.fillStyle = "rgba(232, 220, 196, 0.62)";
  ctx.font = "400 28px Georgia, serif";
  const subtitle = input.chapterTitle.trim();
  if (subtitle) {
    const subtitleLines = wrapCanvasText(ctx, subtitle, width - 176, 36);
    ctx.fillText(subtitleLines[0] ?? subtitle, 88, height - 130);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Không tạo được ảnh trích dẫn"));
    }, "image/png");
  });

  return blob;
}

export async function shareQuoteImage(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text: title });
    return "shared" as const;
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    return "downloaded" as const;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
