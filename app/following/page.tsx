import type { Metadata } from "next";
import { FollowingClient } from "@/components/FollowingClient";

export const metadata: Metadata = {
  title: "Đang theo dõi",
  description: "Tủ linh quyển bạn đang theo dõi trên Linh Quyển Các.",
  alternates: { canonical: "/following" },
  robots: { index: false, follow: true },
};

export default function FollowingPage() {
  return <FollowingClient />;
}
