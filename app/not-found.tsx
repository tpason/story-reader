import { ErrorView } from "@/components/ErrorView";

export default function NotFound() {
  return (
    <ErrorView
      title="Không tìm thấy nội dung"
      message="Truyện hoặc chương này không nằm trong Thiên Thư, hoặc URL không còn hợp lệ."
    />
  );
}
