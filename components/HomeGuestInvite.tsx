"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/lib/store-hooks";

/**
 * Soft invite when homepage personal rails are empty (guest / new reader).
 * Avoids a dead gap above discovery after resume+follows both return null.
 */
export function HomeGuestInvite() {
  const historyHydrated = useAppSelector((state) => state.history.hydrated);
  const followsHydrated = useAppSelector((state) => state.follows.hydrated);
  const hasHistory = useAppSelector((state) => state.history.items.length > 0);
  const hasFollows = useAppSelector((state) => state.follows.items.length > 0);

  if (!historyHydrated || !followsHydrated) {
    return <div className="home-guest-invite home-guest-invite--slot" aria-hidden="true" />;
  }

  if (hasHistory || hasFollows) return null;

  return (
    <div className="home-guest-invite" role="status">
      <Compass size={16} aria-hidden />
      <p>
        <strong>Nhập môn Thiên Thư</strong>
        <span>Chọn một linh quyển bên dưới — hoặc lọc theo thể loại.</span>
      </p>
      <Link className="home-guest-invite-link" href="/categories">
        Xem thể loại
      </Link>
    </div>
  );
}
