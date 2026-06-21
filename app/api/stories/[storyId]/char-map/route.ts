import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const PROJECT_ROOT_CANDIDATES = Array.from(new Set([process.cwd(), resolve(process.cwd(), "..")]));

type StoryMetaRow = {
  metadata: {
    char_map_path?: string;
    char_map_content?: string;
    char_map_updated_at?: string;
    char_map_updated_to_chapter?: number;
  } | null;
};

export type CharMapCharacter = {
  name: string;
  gender: string | null;
  role: string | null;
  pronouns3rd: string | null;
  selfPronoun: string | null;
  personality: string | null;
  speechStyle: string | null;
  avoid: string | null;
};

export type CharMapResponse = {
  available: boolean;
  storyTitle: string | null;
  genre: string | null;
  aliases: Record<string, string>;
  characters: CharMapCharacter[];
  voiceRules: string[];
  updatedAt: string | null;
  updatedToChapter: number | null;
};

async function readProjectFile(filePath: string): Promise<string | null> {
  for (const root of PROJECT_ROOT_CANDIDATES) {
    const abs = isAbsolute(filePath) ? resolve(filePath) : resolve(root, filePath);
    if (!abs.startsWith(root)) continue;
    try {
      return await readFile(abs, "utf8");
    } catch {
      continue;
    }
  }
  return null;
}

function parseCharMap(text: string): Omit<CharMapResponse, "available" | "updatedToChapter"> {
  const lines = text.split("\n");

  let storyTitle: string | null = null;
  let genre: string | null = null;
  let updatedAt: string | null = null;
  const aliases: Record<string, string> = {};
  const characters: CharMapCharacter[] = [];
  const voiceRules: string[] = [];

  type State = "header" | "aliases" | "chars" | "voice_rules";
  let state: State = "header";
  let currentChar: CharMapCharacter | null = null;

  const saveChar = () => {
    if (currentChar) {
      characters.push(currentChar);
      currentChar = null;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (state === "header") {
      if (trimmed === "[ALIASES]") { state = "aliases"; continue; }
      const storyMatch = trimmed.match(/^##\s*Truyện:\s*(.+)/);
      if (storyMatch) { storyTitle = storyMatch[1].trim(); continue; }
      const genreMatch = trimmed.match(/^##\s*Thể loại:\s*(.+)/);
      if (genreMatch) { genre = genreMatch[1].trim(); continue; }
      const updatedMatch = trimmed.match(/^##\s*Cập nhật[^:]*:\s*(.+)/);
      if (updatedMatch) { updatedAt = updatedMatch[1].trim(); continue; }
      continue;
    }

    if (state === "aliases") {
      if (trimmed === "---") { state = "chars"; continue; }
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const wrong = trimmed.slice(0, eqIdx).trim();
        const correct = trimmed.slice(eqIdx + 1).trim();
        if (wrong && correct) aliases[wrong] = correct;
      }
      continue;
    }

    if (state === "chars") {
      if (trimmed.startsWith("## Quy tắc văn phong") || trimmed.startsWith("## Quy tắc chung")) {
        saveChar();
        state = "voice_rules";
        continue;
      }
      if (trimmed === "---") { saveChar(); continue; }
      if (trimmed.startsWith("### ")) {
        saveChar();
        currentChar = {
          name: trimmed.slice(4).trim(),
          gender: null,
          role: null,
          pronouns3rd: null,
          selfPronoun: null,
          personality: null,
          speechStyle: null,
          avoid: null
        };
        continue;
      }
      if (currentChar && trimmed.startsWith("- ")) {
        const bullet = trimmed.slice(2);
        const colonIdx = bullet.indexOf(":");
        if (colonIdx > 0) {
          const key = bullet.slice(0, colonIdx).toLowerCase();
          const value = bullet.slice(colonIdx + 1).trim();
          if (key.includes("giới tính")) {
            const parts = value.split(/\./).map((s) => s.trim()).filter(Boolean);
            currentChar.gender = parts[0] ?? null;
            currentChar.role = parts.slice(1).join(". ") || null;
          } else if (key.includes("ngôi thứ ba")) {
            currentChar.pronouns3rd = value;
          } else if (key.includes("tự xưng")) {
            currentChar.selfPronoun = value;
          } else if (key.includes("tính cách")) {
            currentChar.personality = value;
          } else if (key.includes("giọng thoại")) {
            currentChar.speechStyle = value;
          } else if (key.includes("tránh")) {
            currentChar.avoid = value;
          }
        }
      }
      continue;
    }

    if (state === "voice_rules") {
      if (trimmed.startsWith("- ")) voiceRules.push(trimmed.slice(2));
    }
  }

  saveChar();

  return { storyTitle, genre, aliases, characters, voiceRules, updatedAt };
}

export async function GET(_: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;

  const rows = await query<StoryMetaRow>(
    `SELECT metadata FROM stories WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [storyId]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const metadata = rows[0].metadata ?? {};
  const charMapContent = typeof metadata.char_map_content === "string" ? metadata.char_map_content.trim() : "";
  const charMapPath = metadata.char_map_path ?? null;

  if (charMapContent) {
    const parsed = parseCharMap(charMapContent);
    return NextResponse.json({
      available: true,
      updatedToChapter: metadata.char_map_updated_to_chapter ?? null,
      ...parsed
    } satisfies CharMapResponse);
  }

  if (!charMapPath) {
    return NextResponse.json({
      available: false,
      storyTitle: null,
      genre: null,
      aliases: {},
      characters: [],
      voiceRules: [],
      updatedAt: null,
      updatedToChapter: null
    } satisfies CharMapResponse);
  }

  const fileText = await readProjectFile(charMapPath);
  if (!fileText) {
    return NextResponse.json({
      available: false,
      storyTitle: null,
      genre: null,
      aliases: {},
      characters: [],
      voiceRules: [],
      updatedAt: null,
      updatedToChapter: null
    } satisfies CharMapResponse);
  }

  const parsed = parseCharMap(fileText);

  return NextResponse.json({
    available: true,
    updatedToChapter: metadata.char_map_updated_to_chapter ?? null,
    ...parsed
  } satisfies CharMapResponse);
}
