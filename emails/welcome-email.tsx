import { EmailLayout, EmailMuted } from "@/emails/layout";

type WelcomeEmailProps = {
  username: string;
};

export function WelcomeEmail({ username }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Email đã được xác thực" title="Định danh đã được khắc">
      <EmailMuted>
        Chào <strong>{username}</strong>, email của đạo hữu đã được xác thực thành công.
      </EmailMuted>
      <EmailMuted>
        Giờ đạo hữu có thể dùng quên mật khẩu, bật bản tin chương mới trong Động phủ, và tiếp tục tu luyện từng chương.
      </EmailMuted>
    </EmailLayout>
  );
}

export default WelcomeEmail;
