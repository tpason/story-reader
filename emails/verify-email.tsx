import { EmailButton, EmailLayout, EmailLink, EmailMuted } from "@/emails/layout";

type VerifyEmailProps = {
  username: string;
  verifyUrl: string;
};

export function VerifyEmail({ username, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Xác thực email để mở khóa đầy đủ động phủ" title="Xác thực định danh đạo hữu">
      <EmailMuted>
        Chào <strong>{username}</strong>, cảm ơn đạo hữu đã nhập môn Linh Quyển Các.
      </EmailMuted>
      <EmailMuted>
        Nhấn nút bên dưới để xác thực email. Sau khi xác thực, đạo hữu có thể dùng quên mật khẩu và nhận bản tin chương mới.
      </EmailMuted>
      <EmailButton href={verifyUrl} label="Xác thực email" />
      <EmailMuted>
        Hoặc mở liên kết: <EmailLink href={verifyUrl}>{verifyUrl}</EmailLink>
      </EmailMuted>
      <EmailMuted>Liên kết hết hạn sau 48 giờ.</EmailMuted>
    </EmailLayout>
  );
}

export default VerifyEmail;
