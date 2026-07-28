import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteAuthorStory, listAuthorChapters, requireOwnedStory, updateAuthorStory } from "@/lib/author-stories";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId } = await params;
  try {
    await requireOwnedStory(storyId, user.id);
    const stories = await (await import("@/lib/author-stories")).listAuthorStories(user.id);
    const story = stories.find((s) => s.id === storyId);
    if (!story) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const chapters = await listAuthorChapters(storyId, user.id);
    return NextResponse.json({ story, chapters });
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
  const { storyId } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const story = await updateAuthorStory(storyId, user.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : body.description === null ? null : undefined,
      coverImageUrl:
        typeof body.coverImageUrl === "string" ? body.coverImageUrl : body.coverImageUrl === null ? null : undefined,
      primaryCategoryId:
        typeof body.primaryCategoryId === "string"
          ? body.primaryCategoryId
          : body.primaryCategoryId === null
            ? null
            : undefined,
      publishStatus: body.publishStatus as "draft" | "published" | "hidden" | undefined,
      isCompleted: typeof body.isCompleted === "boolean" ? body.isCompleted : undefined
    });
    return NextResponse.json({ story });
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
  const { storyId } = await params;
  try {
    await deleteAuthorStory(storyId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xóa được" },
      { status }
    );
  }
}
