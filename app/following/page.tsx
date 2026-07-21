import { FollowingClient } from "@/components/FollowingClient";

export const metadata = {
  title: "Đang theo dõi",
  description: "Tủ linh quyển bạn đang theo dõi trên Linh Quyển Các.",
  alternates: { canonical: "/following" },
};

export default function FollowingPage() {
  return <FollowingClient />;
}
