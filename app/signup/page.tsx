import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nhập môn",
  description: "Tạo tài khoản Linh Quyển Các để lưu tiến độ đọc, theo dõi truyện và tích lũy tu vi.",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
