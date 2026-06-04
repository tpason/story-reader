import { ErrorView } from "@/components/ErrorView";

export default async function ErrorPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <ErrorView
      title={code === "500" ? "Có lỗi khi tải trang" : "Trang lỗi"}
      message="Bạn có thể quay lại thư viện và mở lại truyện. Nếu lỗi lặp lại, nhiều khả năng database hoặc chapter path đang có vấn đề."
    />
  );
}
