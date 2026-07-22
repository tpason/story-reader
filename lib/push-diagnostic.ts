import { isPushApiSupported, isVapidConfigured } from "@/lib/push-client";

export type PushBlocker = {
  code: string;
  message: string;
  /** User-safe hint. Empty for ops-only blockers shown to admins. */
  hint: string;
  /** `ops` = server/config; never show to non-admin end users. */
  audience: "user" | "ops";
};

export type PushDiagnostic = {
  canEnable: boolean;
  /** False when Web Push / VAPID is not available — hide the feature for guests. */
  featureAvailable: boolean;
  isAdmin: boolean;
  blockers: PushBlocker[];
};

export async function diagnosePush(): Promise<PushDiagnostic> {
  const blockers: PushBlocker[] = [];
  let isAdmin = false;

  if (typeof window === "undefined") {
    return {
      canEnable: false,
      featureAvailable: false,
      isAdmin: false,
      blockers: [{ code: "ssr", message: "Chỉ chẩn đoán trên trình duyệt", hint: "", audience: "ops" }]
    };
  }

  if (!isPushApiSupported()) {
    blockers.push({
      code: "no_api",
      message: "Trình duyệt không hỗ trợ Web Push",
      hint: "Dùng Chrome, Firefox hoặc Edge bản mới trên desktop/Android.",
      audience: "user"
    });
  }

  if (!("Notification" in window)) {
    blockers.push({
      code: "no_notification",
      message: "API Notification không khả dụng",
      hint: "Thử trình duyệt khác hoặc bỏ chế độ riêng tư chặn thông báo.",
      audience: "user"
    });
  } else if (Notification.permission === "denied") {
    blockers.push({
      code: "permission_denied",
      message: "Quyền thông báo đã bị chặn",
      hint: "Mở biểu tượng ổ khóa trên thanh địa chỉ → Cho phép thông báo → tải lại trang.",
      audience: "user"
    });
  }

  const authRes = await fetch("/api/auth/me").catch(() => null);
  const authData = authRes
    ? ((await authRes.json().catch(() => null)) as { user?: { isAdmin?: boolean } | null } | null)
    : null;
  if (!authData?.user) {
    blockers.push({
      code: "guest",
      message: "Chưa nhập môn",
      hint: "Đăng nhập tại Động phủ để khắc linh tin vào Thiên Thư.",
      audience: "user"
    });
  } else {
    isAdmin = Boolean(authData.user.isAdmin);
  }

  const vapidOk = await isVapidConfigured();
  if (!vapidOk) {
    blockers.push({
      code: "no_vapid",
      message: "Máy chủ chưa cấu hình VAPID",
      // Ops-only — never render this hint for normal readers.
      hint: "Chạy make reader-vapid và thêm VAPID_* vào .env gốc, rồi khởi động lại reader.",
      audience: "ops"
    });
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.ready;
    } catch {
      blockers.push({
        code: "no_sw",
        message: "Service worker chưa sẵn sàng",
        hint: "Bật NEXT_PUBLIC_ENABLE_PWA=1, tải lại trang và đợi vài giây.",
        audience: "ops"
      });
    }
  }

  const featureAvailable = vapidOk && isPushApiSupported();
  return {
    canEnable: blockers.length === 0,
    featureAvailable,
    isAdmin,
    blockers
  };
}
