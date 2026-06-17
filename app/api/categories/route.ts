import { NextResponse } from "next/server";
import { getCachedCategories } from "@/lib/stories";

export const revalidate = 600;

export async function GET() {
  try {
    const categories = await getCachedCategories(40);
    return NextResponse.json({ items: categories });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load categories", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
