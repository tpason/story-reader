import type { Metadata } from "next";
import { ReadingHistoryClient } from "@/components/ReadingHistoryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tàng thư",
  description: "Lịch sử đọc và tiến độ tu luyện trên Linh Quyển Các.",
  robots: { index: false, follow: true },
};

export default function ReadingHistoryPage() {
  return <ReadingHistoryClient />;
}
