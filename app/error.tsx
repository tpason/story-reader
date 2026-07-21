"use client";

import { ErrorView } from "@/components/ErrorView";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof console !== "undefined") {
    console.error(error);
  }

  return (
    <ErrorView
      title="Không mở được trang"
      message="Có lỗi khi tải dữ liệu hoặc render giao diện. Thử lại hoặc quay về thư viện."
      action="reset"
      onReset={reset}
    />
  );
}
