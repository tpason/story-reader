import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuthorChapter, listAuthorChapters } from "@/lib/author-stories";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId } = await params;
  try {
    const chapters = await listAuthorChapters(storyId, user.id);
    return NextResponse.json({ items: chapters });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi" },
      { status }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown;
    content?: unknown;
    publishStatus?: unknown;
    chapterNumber?: unknown;
  };
  try {
    const chapter = await createAuthorChapter(storyId, user.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : "",
      publishStatus: body.publishStatus as "draft" | "published" | undefined,
      chapterNumber: typeof body.chapterNumber === "number" ? body.chapterNumber : undefined
    });
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được chương" },
      { status }
    );
  }
}
