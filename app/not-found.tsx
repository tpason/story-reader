import type { Metadata } from "next";
import { ErrorView } from "@/components/ErrorView";

export const metadata: Metadata = {
  title: "Không tìm thấy",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ErrorView
      title="Không tìm thấy nội dung"
      message="Truyện hoặc chương này không nằm trong Thiên Thư, hoặc URL không còn hợp lệ."
    />
  );
}
