"use client";

import { ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import { useState } from "react";
import type { CharMapResponse, CharMapCharacter } from "@/app/api/stories/[storyId]/char-map/route";

type Props = {
  storyId: string;
};

function truncate(text: string | null, maxLen = 80): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "..." : text;
}

function GenderTag({ gender, role }: { gender: string | null; role: string | null }) {
  if (!gender && !role) return null;
  return (
    <span className="char-map-tags">
      {gender && <span className="char-map-tag char-map-tag-gender">{gender}</span>}
      {role && role.split(/[,.]/).slice(0, 2).map((r, i) => {
        const clean = r.trim();
        return clean ? <span key={i} className="char-map-tag char-map-tag-role">{clean}</span> : null;
      })}
    </span>
  );
}

function CharCard({ char }: { char: CharMapCharacter }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`char-map-card ${expanded ? "char-map-card-open" : ""}`}>
      <button
        type="button"
        className="char-map-card-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="char-map-card-name">{char.name}</span>
        <GenderTag gender={char.gender} role={char.role} />
        <span className="char-map-card-chevron" aria-hidden="true">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {!expanded && (
        <div className="char-map-card-preview">
          {char.pronouns3rd && (
            <p className="char-map-field">
              <span className="char-map-field-label">Xưng hô:</span> {truncate(char.pronouns3rd, 60)}
            </p>
          )}
          {char.personality && (
            <p className="char-map-field">
              <span className="char-map-field-label">Tính cách:</span> {truncate(char.personality, 70)}
            </p>
          )}
        </div>
      )}

      {expanded && (
        <div className="char-map-card-body">
          {char.pronouns3rd && (
            <div className="char-map-detail-row">
              <span className="char-map-detail-label">Ngôi thứ ba</span>
              <span className="char-map-detail-value">{char.pronouns3rd}</span>
            </div>
          )}
          {char.selfPronoun && (
            <div className="char-map-detail-row">
              <span className="char-map-detail-label">Tự xưng</span>
              <span className="char-map-detail-value">{char.selfPronoun}</span>
            </div>
          )}
          {char.personality && (
            <div className="char-map-detail-row">
              <span className="char-map-detail-label">Tính cách</span>
              <span className="char-map-detail-value">{char.personality}</span>
            </div>
          )}
          {char.speechStyle && (
            <div className="char-map-detail-row">
              <span className="char-map-detail-label">Giọng thoại</span>
              <span className="char-map-detail-value">{char.speechStyle}</span>
            </div>
          )}
          {char.avoid && (
            <div className="char-map-detail-row char-map-detail-avoid">
              <span className="char-map-detail-label">Tránh</span>
              <span className="char-map-detail-value">{char.avoid}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VoiceRulesSection({ rules }: { rules: string[] }) {
  const [open, setOpen] = useState(false);
  if (!rules.length) return null;

  return (
    <div className="char-map-voice-wrap">
      <button type="button" className="char-map-voice-toggle" onClick={() => setOpen((v) => !v)}>
        <span>Quy tắc văn phong chung</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <ul className="char-map-voice-rules">
          {rules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CharMapBlock({ storyId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CharMapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (data !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/char-map`);
      if (!res.ok) throw new Error("Không thể tải dữ liệu nhân vật.");
      const json = (await res.json()) as CharMapResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  const hasData = data?.available && (data.characters.length > 0 || data.voiceRules.length > 0);

  return (
    <section className="library-list-section char-map-section" aria-label="Nhân vật truyện">
      <div className="section-heading-row story-list-heading">
        <div>
          <p className="eyebrow">Bản đồ nhân vật</p>
          <h2>Nhân vật &amp; Giọng văn</h2>
        </div>
        <button
          type="button"
          className="char-map-open-btn"
          onClick={handleToggle}
          aria-expanded={open}
        >
          <Users size={15} />
          {data?.characters.length ? `${data.characters.length} nhân vật` : "Xem"}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="char-map-body">
          {loading && (
            <div className="char-map-loading" role="status" aria-live="polite">
              <Loader2 size={16} className="char-map-spinner" />
              Đang tải dữ liệu nhân vật...
            </div>
          )}

          {error && <p className="char-map-error">{error}</p>}

          {data && !data.available && !loading && (
            <div className="empty-state">
              <p>Truyện này chưa có bản đồ nhân vật.</p>
            </div>
          )}

          {hasData && !loading && (
            <>
              {data.updatedAt || data.updatedToChapter ? (
                <p className="char-map-meta">
                  {data.updatedAt && <>Cập nhật: {data.updatedAt}</>}
                  {data.updatedToChapter && data.updatedAt && " · "}
                  {data.updatedToChapter && <>Đến chương {data.updatedToChapter}</>}
                </p>
              ) : null}

              {data.characters.length > 0 && (
                <div className="char-map-grid">
                  {data.characters.map((char) => (
                    <CharCard key={char.name} char={char} />
                  ))}
                </div>
              )}

              <VoiceRulesSection rules={data.voiceRules} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
