import { NextResponse } from "next/server";
import { listCategories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await listCategories(40);
    return NextResponse.json({ items: categories });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load categories", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
