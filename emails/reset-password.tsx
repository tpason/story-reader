import { EmailButton, EmailLayout, EmailLink, EmailMuted } from "@/emails/layout";

type ResetPasswordEmailProps = {
  username: string;
  resetUrl: string;
};

export function ResetPasswordEmail({ username, resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Đặt lại mật khẩu động phủ" title="Đặt lại mật khẩu">
      <EmailMuted>
        Chào <strong>{username}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho động phủ của bạn.
      </EmailMuted>
      <EmailButton href={resetUrl} label="Đặt lại mật khẩu" />
      <EmailMuted>
        Hoặc mở liên kết: <EmailLink href={resetUrl}>{resetUrl}</EmailLink>
      </EmailMuted>
      <EmailMuted>Liên kết hết hạn sau 1 giờ. Nếu không phải bạn, hãy bỏ qua thư này.</EmailMuted>
    </EmailLayout>
  );
}

export default ResetPasswordEmail;
