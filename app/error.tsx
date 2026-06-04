"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ErrorView } from "@/components/ErrorView";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    router.replace("/error?code=500" as Route);
  }, [error, router]);

  return (
    <ErrorView
      title="Không mở được trang đọc"
      message="Có lỗi khi tải dữ liệu truyện hoặc render giao diện. Trang sẽ chuyển sang màn lỗi chung."
      action="reset"
      onReset={reset}
    />
  );
}
