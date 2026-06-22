import { isPushApiSupported, isVapidConfigured } from "@/lib/push-client";

export type PushBlocker = {
  code: string;
  message: string;
  hint: string;
};

export type PushDiagnostic = {
  canEnable: boolean;
  blockers: PushBlocker[];
};

export async function diagnosePush(): Promise<PushDiagnostic> {
  const blockers: PushBlocker[] = [];

  if (typeof window === "undefined") {
    return { canEnable: false, blockers: [{ code: "ssr", message: "Chỉ chẩn đoán trên trình duyệt", hint: "" }] };
  }

  if (!isPushApiSupported()) {
    blockers.push({
      code: "no_api",
      message: "Trình duyệt không hỗ trợ Web Push",
      hint: "Dùng Chrome, Firefox hoặc Edge bản mới trên desktop/Android."
    });
  }

  if (!("Notification" in window)) {
    blockers.push({
      code: "no_notification",
      message: "API Notification không khả dụng",
      hint: "Thử trình duyệt khác hoặc bỏ chế độ riêng tư chặn thông báo."
    });
  } else if (Notification.permission === "denied") {
    blockers.push({
      code: "permission_denied",
      message: "Quyền thông báo đã bị chặn",
      hint: "Mở biểu tượng ổ khóa trên thanh địa chỉ → Cho phép thông báo → tải lại trang."
    });
  }

  const authRes = await fetch("/api/auth/me").catch(() => null);
  const authData = authRes ? ((await authRes.json().catch(() => null)) as { user?: unknown } | null) : null;
  if (!authData?.user) {
    blockers.push({
      code: "guest",
      message: "Chưa nhập môn",
      hint: "Đăng nhập tại Động phủ để khắc linh tin vào Thiên Thư."
    });
  }

  if (!(await isVapidConfigured())) {
    blockers.push({
      code: "no_vapid",
      message: "Máy chủ chưa cấu hình VAPID",
      hint: "Chạy make reader-vapid và thêm VAPID_* vào .env gốc, rồi khởi động lại reader."
    });
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.ready;
    } catch {
      blockers.push({
        code: "no_sw",
        message: "Service worker chưa sẵn sàng",
        hint: "Bật NEXT_PUBLIC_ENABLE_PWA=1, tải lại trang và đợi vài giây."
      });
    }
  }

  return { canEnable: blockers.length === 0, blockers };
}
