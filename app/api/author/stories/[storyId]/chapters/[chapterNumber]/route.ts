import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteAuthorChapter, getAuthorChapter, updateAuthorChapter } from "@/lib/author-stories";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string; chapterNumber: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId, chapterNumber: raw } = await params;
  const chapterNumber = Number(raw);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Số chương không hợp lệ" }, { status: 400 });
  }
  try {
    const chapter = await getAuthorChapter(storyId, chapterNumber, user.id);
    if (!chapter) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
    return NextResponse.json({ chapter });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi" },
      { status }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId, chapterNumber: raw } = await params;
  const chapterNumber = Number(raw);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Số chương không hợp lệ" }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown;
    content?: unknown;
    publishStatus?: unknown;
  };
  try {
    const chapter = await updateAuthorChapter(storyId, chapterNumber, user.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      publishStatus: body.publishStatus as "draft" | "published" | undefined
    });
    return NextResponse.json({ chapter });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không cập nhật được" },
      { status }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId, chapterNumber: raw } = await params;
  const chapterNumber = Number(raw);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Số chương không hợp lệ" }, { status: 400 });
  }
  try {
    await deleteAuthorChapter(storyId, chapterNumber, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xóa được" },
      { status }
    );
  }
}
