"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/api-client";
import { setCurrentUser } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

export function AccountAuthActions() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => {
        dispatch(setCurrentUser(currentUser));
      })
      .catch(() => undefined)
      .finally(() => setChecked(true));
  }, [dispatch]);

  if (user || !checked) return null;

  return (
    <div className="auth-actions">
      <Link className="auth-submit" href="/login">
        <LogIn size={16} />
        Đăng nhập động phủ
      </Link>
      <Link className="chip" href="/signup">
        <UserPlus size={15} />
        Nhập môn
      </Link>
    </div>
  );
}
