"use client";

import { BookOpenCheck, Bell, LogIn, LogOut, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CultivationAvatar } from "@/components/CultivationAvatar";
import { fetchCurrentUser } from "@/lib/api-client";
import { getCultivationState } from "@/lib/cultivation";
import { clearCurrentUser, storeCurrentUser, type StoredReaderUser } from "@/lib/identity";
import { persistor, setCurrentUser } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

type UserIdentityProps = {
  compact?: boolean;
  panel?: boolean;
  className?: string;
};

function RoleBadge({ isAdmin, signedIn }: { isAdmin?: boolean; signedIn: boolean }) {
  const role = isAdmin ? "admin" : signedIn ? "user" : "guest";
  const label = isAdmin ? "Admin" : signedIn ? "Đạo hữu" : "Guest";
  return (
    <span className={`role-badge role-badge-${role}`} data-role={role}>
      {label}
    </span>
  );
}

export function UserIdentity({ compact = false, panel = false, className = "" }: UserIdentityProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const history = useAppSelector((state) => state.history.items);
  const streak = useAppSelector((state) => state.readingStreak);
  const identityHydrated = useAppSelector((state) => state.identity.hydrated);
  const [loading, setLoading] = useState(!identityHydrated);
  const [modalOpen, setModalOpen] = useState(false);

  const cultivation = useMemo(
    () => getCultivationState(history, Boolean(user), streak.currentStreak, Boolean(user?.isAdmin)),
    [history, streak.currentStreak, user]
  );

  const persistUser = useCallback(async (currentUser: StoredReaderUser | null) => {
    dispatch(setCurrentUser(currentUser));
    if (currentUser) storeCurrentUser(currentUser);
    else clearCurrentUser();
    await persistor.flush();
  }, [dispatch]);

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => {
        void persistUser(currentUser);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [dispatch, persistUser]);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  const avatarTitle = user
    ? `${cultivation.realm} tầng ${cultivation.realmStage} · Lv.${cultivation.level}`
    : undefined;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await persistUser(null);
    setModalOpen(false);
  }

  if (compact) {
    return (
      <>
        <button
          className={`identity-chip identity-chip-button ${user ? "" : "identity-chip-muted"} ${className}`}
          data-role={user?.isAdmin ? "admin" : user ? "user" : "guest"}
          type="button"
          title={user ? `Đạo hữu ${user.username}` : "Tán tu"}
          aria-haspopup="dialog"
          aria-expanded={modalOpen}
          onClick={() => setModalOpen(true)}
        >
          <CultivationAvatar
            username={user?.username ?? "tan-tu"}
            level={cultivation.level}
            realmImageKey={cultivation.realmImageKey}
            size="sm"
            muted={!user}
            isAdmin={Boolean(user?.isAdmin)}
            title={avatarTitle}
            className="identity-avatar-slot"
          />
          <span className="identity-copy">
            <small>{user?.isAdmin ? "Quản trị" : user ? "Đạo hữu" : loading ? "Đang dò khí tức" : "Tán tu"}</small>
            <strong>{user ? user.username : "Chưa nhập môn"}</strong>
          </span>
          {loading && !user ? null : <RoleBadge isAdmin={user?.isAdmin} signedIn={Boolean(user)} />}
        </button>

        {modalOpen ? (
          <div className="identity-modal" role="dialog" aria-modal="true" aria-label="Thông tin đạo hữu">
            <button className="identity-modal-backdrop" type="button" aria-label="Đóng thông tin đạo hữu" onClick={() => setModalOpen(false)} />
            <section className="identity-modal-panel">
              <div className="identity-modal-header">
                <div>
                  <p className="eyebrow">{user?.isAdmin ? "Quản trị tàng thư" : user ? "Đạo hữu" : "Tán tu"}</p>
                  <h2>{user ? user.username : "Chưa nhập môn"}</h2>
                </div>
                {loading && !user ? null : <RoleBadge isAdmin={user?.isAdmin} signedIn={Boolean(user)} />}
                <button className="icon-button" type="button" aria-label="Đóng" onClick={() => setModalOpen(false)}>
                  <X size={17} />
                </button>
              </div>

              <div className="identity-modal-profile">
                <CultivationAvatar
                  username={user?.username ?? "tan-tu"}
                  level={cultivation.level}
                  realmImageKey={cultivation.realmImageKey}
                  size="lg"
                  muted={!user}
                  isAdmin={Boolean(user?.isAdmin)}
                  title={avatarTitle}
                  className="identity-avatar-slot identity-avatar-slot-large"
                />
                <p>
                  {user
                    ? user.email || "Tài khoản này đang sync tàng thư, follow và tiến độ đọc qua database."
                    : "Tán tu vẫn đọc được trên thiết bị này. Nhập môn để sync follow và tiến độ qua nhiều thiết bị."}
                </p>
              </div>

              <div className={`identity-modal-actions ${user ? "" : "identity-modal-actions-guest"}`}>
                <Link className="chip" href="/reading-history" onClick={() => setModalOpen(false)}>
                  <BookOpenCheck size={15} />
                  Tàng thư
                </Link>
                <Link className="chip" href="/updates" onClick={() => setModalOpen(false)}>
                  <Bell size={15} />
                  Chương mới
                </Link>
                {user ? (
                  <button className="chip" type="button" onClick={logout}>
                    <LogOut size={15} />
                    Xuất động phủ
                  </button>
                ) : (
                  <>
                    <Link className="auth-submit" href="/login" onClick={() => setModalOpen(false)}>
                      <LogIn size={15} />
                      Đăng nhập
                    </Link>
                    <Link className="chip" href="/signup" onClick={() => setModalOpen(false)}>
                      <UserPlus size={15} />
                      Nhập môn
                    </Link>
                  </>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className={`identity-panel ${className}`} aria-label="Reader identity">
      <CultivationAvatar
        username={user?.username ?? "tan-tu"}
        level={cultivation.level}
        realmImageKey={cultivation.realmImageKey}
        size="lg"
        muted={!user}
        isAdmin={Boolean(user?.isAdmin)}
        title={avatarTitle}
        className="identity-avatar-slot identity-avatar-slot-large"
      />
      <div className="identity-panel-body">
        <p className="eyebrow">{user ? "Đạo hữu" : "Tán tu"}</p>
        <div className="identity-title-row">
          <h2>{user ? user.username : "Chưa nhập môn"}</h2>
          {loading && !user ? null : <RoleBadge isAdmin={user?.isAdmin} signedIn={Boolean(user)} />}
        </div>
        <p>
          {user
            ? user.email || "Tu vi và tàng thư đang được định danh bằng tài khoản này."
            : "Tán tu vẫn đọc được trên trình duyệt này. Nhập môn để sync tu vi vào database."}
        </p>
        {panel ? (
          <div className="identity-actions">
            {user ? (
              <button className="chip" type="button" onClick={logout}>
                <LogOut size={15} />
                Xuất động phủ
              </button>
            ) : (
              <>
                <Link className="auth-submit" href="/login">
                  <LogIn size={15} />
                  Đăng nhập
                </Link>
                <Link className="chip" href="/signup">
                  <UserPlus size={15} />
                  Nhập môn
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
