import type { Metadata } from "next";
import { UpdatesClient } from "@/components/UpdatesClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Chương mới",
  description: "Theo dõi chương mới cập nhật trên Linh Quyển Các.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
  return <UpdatesClient />;
}
