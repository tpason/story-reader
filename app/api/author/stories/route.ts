import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuthorStory, listAuthorStories } from "@/lib/author-stories";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  }
  const items = await listAuthorStories(user.id);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown;
    description?: unknown;
    coverImageUrl?: unknown;
    primaryCategoryId?: unknown;
    publishStatus?: unknown;
  };

  try {
    const story = await createAuthorStory({
      userId: user.id,
      username: user.username,
      title: typeof body.title === "string" ? body.title : "",
      description: typeof body.description === "string" ? body.description : "",
      coverImageUrl: typeof body.coverImageUrl === "string" ? body.coverImageUrl : null,
      primaryCategoryId: typeof body.primaryCategoryId === "string" ? body.primaryCategoryId : null,
      publishStatus: body.publishStatus as "draft" | "published" | undefined
    });
    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được truyện" },
      { status }
    );
  }
}
