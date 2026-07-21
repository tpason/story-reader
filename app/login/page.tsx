import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập động phủ",
  description: "Đăng nhập Linh Quyển Các để đồng bộ tàng thư, theo dõi truyện và nhận chương mới.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
