import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from "@react-email/components";
import type { ReactNode } from "react";

const jade = "#1a6b5a";
const gold = "#c8962e";
const ink = "#1c1917";
const muted = "#57534e";

type EmailLayoutProps = {
  preview: string;
  title: string;
  children: ReactNode;
};

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f5f0e6", fontFamily: "Georgia, serif", margin: 0, padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#fffdf8",
            border: `1px solid ${gold}`,
            borderRadius: "12px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "32px 28px"
          }}
        >
          <Text style={{ color: gold, fontSize: "12px", letterSpacing: "0.12em", margin: "0 0 8px", textTransform: "uppercase" }}>
            Linh Quyển Các
          </Text>
          <Heading style={{ color: ink, fontSize: "24px", fontWeight: 700, lineHeight: 1.3, margin: "0 0 16px" }}>
            {title}
          </Heading>
          {children}
          <Hr style={{ borderColor: "#e7e0d4", margin: "28px 0 16px" }} />
          <Text style={{ color: muted, fontSize: "12px", lineHeight: 1.5, margin: 0 }}>
            Thư này được gửi từ Linh Quyển Các — tu tiên từng chương.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: jade,
          borderRadius: "8px",
          color: "#fff",
          display: "inline-block",
          fontSize: "15px",
          fontWeight: 600,
          padding: "12px 24px",
          textDecoration: "none"
        }}
      >
        {label}
      </Button>
    </Section>
  );
}

export function EmailMuted({ children }: { children: ReactNode }) {
  return <Text style={{ color: muted, fontSize: "14px", lineHeight: 1.6, margin: "0 0 12px" }}>{children}</Text>;
}

export function EmailLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: jade, wordBreak: "break-all" }}>
      {children}
    </Link>
  );
}
