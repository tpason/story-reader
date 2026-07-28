import { query } from "@/lib/db";

export type ActiveSiteAnnouncement = {
  id: string;
  message: string;
  updatedAt: string;
};

type AnnouncementDbRow = {
  id: string;
  message: string;
  updated_at: Date;
};

export async function getActiveSiteAnnouncement(): Promise<ActiveSiteAnnouncement | null> {
  const rows = await query<AnnouncementDbRow>(
    `SELECT id, message, updated_at
     FROM reader_site_announcements
     WHERE is_active = true
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at > now())
     ORDER BY updated_at DESC
     LIMIT 1`
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    message: row.message,
    updatedAt: row.updated_at.toISOString()
  };
}
