"use client";

import { Home, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MotionFX } from "@/components/MotionFX";

type ErrorViewProps = {
  title: string;
  message: string;
  action?: "home" | "reset";
  onReset?: () => void;
};

export function ErrorView({ title, message, action = "home", onReset }: ErrorViewProps) {
  return (
    <main className="error-shell">
      <MotionFX variant="error" />
      <section className="error-panel">
        <span className="error-mark">
          <ShieldAlert size={24} />
        </span>
        <p className="eyebrow">Linh lực bị cản trở</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="error-actions">
          {action === "reset" && onReset ? (
            <button className="chip" type="button" onClick={onReset}>
              <RotateCcw size={15} />
              Thử lại
            </button>
          ) : null}
          <Link className="chip chip-active" href="/">
            <Home size={15} />
            Về thư viện
          </Link>
        </div>
      </section>
    </main>
  );
}
