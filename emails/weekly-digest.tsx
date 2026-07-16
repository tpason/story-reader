import { EmailLayout, EmailLink, EmailMuted } from "@/emails/layout";

export type DigestChapterItem = {
  storyTitle: string;
  storyHref: string;
  unread: number;
  nextChapter: number | null;
};

export type DigestStoryItem = {
  title: string;
  href: string;
  author: string | null;
};

type WeeklyDigestEmailProps = {
  username: string;
  chapters: DigestChapterItem[];
  newStories: DigestStoryItem[];
  unsubscribeUrl: string;
};

export function WeeklyDigestEmail({ username, chapters, newStories, unsubscribeUrl }: WeeklyDigestEmailProps) {
  return (
    <EmailLayout preview="Bản tin chương mới tuần này" title="Bản tin Linh Quyển">
      <EmailMuted>Chào <strong>{username}</strong>, đây là tóm tắt tuần này từ thư viện bạn đang theo dõi.</EmailMuted>

      {chapters.length > 0 ? (
        <>
          <EmailMuted>Chương mới đang chờ:</EmailMuted>
          {chapters.map((item) => (
            <EmailMuted key={item.storyHref}>
              <EmailLink href={item.storyHref}>{item.storyTitle}</EmailLink>
              {" — "}
              {item.unread} chương chưa đọc
              {item.nextChapter ? ` · tiếp theo ch.${item.nextChapter}` : ""}
            </EmailMuted>
          ))}
        </>
      ) : null}

      {newStories.length > 0 ? (
        <>
          <EmailMuted>Truyện mới:</EmailMuted>
          {newStories.map((item) => (
            <EmailMuted key={item.href}>
              <EmailLink href={item.href}>{item.title}</EmailLink>
              {item.author ? ` — ${item.author}` : ""}
            </EmailMuted>
          ))}
        </>
      ) : null}

      <EmailMuted>
        <EmailLink href={unsubscribeUrl}>Hủy đăng ký bản tin</EmailLink>
      </EmailMuted>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;
