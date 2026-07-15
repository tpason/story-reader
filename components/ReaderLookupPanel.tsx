"use client";

import { BookMarked, LoaderCircle, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { speakEnglishText, type ReaderLookupResult } from "@/lib/reader-lookup";

export type ReaderLookupRequest = {
  query: string;
  /** EN sentence/paragraph excerpt containing the selection (Readlang-style context). */
  contextEnglish?: string | null;
  contextPaired?: string | null;
  chapterId?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  paragraphIndex?: number;
};

type ReaderLookupPanelProps = {
  request: ReaderLookupRequest | null;
  onClose: () => void;
  onSavePhrase?: (payload: { phrase: string; pairedText: string | null }) => void;
};

type LookupTab = "quick" | "dictionary";

async function fetchLookup(query: string): Promise<ReaderLookupResult> {
  const response = await fetch(`/api/reader/lookup?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Không tra được từ này.");
  }
  return (await response.json()) as ReaderLookupResult;
}

export function ReaderLookupPanel({ request, onClose, onSavePhrase }: ReaderLookupPanelProps) {
  const [portalReady, setPortalReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReaderLookupResult | null>(null);
  const [tab, setTab] = useState<LookupTab>("quick");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!request?.query) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);
    setTab("quick");

    fetchLookup(request.query)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        // Readlang: stay on quick gloss; auto-jump to dictionary when no VI but dictionary has senses.
        if (!data.vi.primary && data.dictionaryFound) setTab("dictionary");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tra được từ này.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [request?.query]);

  useEffect(() => {
    if (!request) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [request, onClose]);

  const primaryAudio = useMemo(
    () => result?.phonetics.find((item) => item.audioUrl)?.audioUrl ?? null,
    [result]
  );
  const primaryIpa = useMemo(() => {
    if (!result) return null;
    return result.phonetics.find((item) => item.text)?.text ?? result.phonetics[0]?.text ?? null;
  }, [result]);

  function playPronunciation() {
    if (!result && !request?.query) return;
    const spoken = result?.word || request?.query || "";
    if (primaryAudio) {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.pause();
      audio.src = primaryAudio;
      setPlaying(true);
      void audio
        .play()
        .catch(() => {
          setPlaying(false);
          speakEnglishText(spoken);
        })
        .then(() => {
          audio.onended = () => setPlaying(false);
        });
      return;
    }
    setPlaying(true);
    const ok = speakEnglishText(spoken);
    window.setTimeout(() => setPlaying(false), ok ? 1200 : 0);
  }

  function playSelection() {
    if (!request?.query) return;
    setPlaying(true);
    speakEnglishText(request.query);
    window.setTimeout(() => setPlaying(false), Math.min(4000, 400 + request.query.length * 60));
  }

  if (!portalReady || !request) return null;

  const senseCount = result?.meanings.reduce((sum, meaning) => sum + meaning.senses.length, 0) ?? 0;

  return createPortal(
    <div className="reader-lookup-modal" role="dialog" aria-modal="true" aria-label="Tra từ tiếng Anh">
      <button className="reader-lookup-modal-backdrop" type="button" aria-label="Đóng tra từ" onClick={onClose} />
      <div className="reader-lookup-panel">
        <header className="reader-lookup-header">
          <div>
            <p className="reader-lookup-eyebrow">Ngoại điển · Tra cứu</p>
            <h2>{result?.word ?? request.query}</h2>
            {primaryIpa ? <p className="reader-lookup-ipa">{primaryIpa}</p> : null}
          </div>
          <button type="button" className="reader-lookup-close" aria-label="Đóng" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        {/* Readlang-style primary actions — stay in flow */}
        <div className="reader-lookup-actions">
          <button type="button" className="reader-lookup-play" onClick={playPronunciation} disabled={loading}>
            <Volume2 size={15} aria-hidden />
            {playing ? "Đang phát…" : "Phát âm"}
          </button>
          {request.query.trim() !== (result?.word ?? "").trim() ? (
            <button type="button" className="reader-lookup-play reader-lookup-play-secondary" onClick={playSelection}>
              <Volume2 size={15} aria-hidden />
              Nghe cả cụm
            </button>
          ) : null}
          {onSavePhrase ? (
            <button
              type="button"
              className="reader-lookup-save"
              onClick={() =>
                onSavePhrase({
                  phrase: request.query,
                  pairedText: request.contextPaired ?? null
                })
              }
            >
              <BookMarked size={15} aria-hidden />
              Lưu câu
            </button>
          ) : null}
        </div>

        {/* Beelinguapp / Immersive-style dual context */}
        {request.contextEnglish || request.contextPaired ? (
          <section className="reader-lookup-context-card" aria-label="Ngữ cảnh trong truyện">
            {request.contextEnglish ? (
              <p className="reader-lookup-context-en" lang="en">
                <span>EN · trong truyện</span>
                {request.contextEnglish}
              </p>
            ) : null}
            {request.contextPaired ? (
              <p className="reader-lookup-context-vi" lang="vi">
                <span>VI · đối chiếu</span>
                {request.contextPaired}
              </p>
            ) : null}
          </section>
        ) : null}

        {loading ? (
          <p className="reader-lookup-status">
            <LoaderCircle size={16} className="reader-lookup-spinner" aria-hidden />
            Đang tra Thiên Thư từ điển…
          </p>
        ) : null}

        {error ? <p className="reader-lookup-error">{error}</p> : null}

        {result && !loading ? (
          <>
            <div className="reader-lookup-tabs" role="tablist" aria-label="Chế độ tra cứu">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "quick"}
                className={`reader-lookup-tab${tab === "quick" ? " is-active" : ""}`}
                onClick={() => setTab("quick")}
              >
                Gợi ý nhanh
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "dictionary"}
                className={`reader-lookup-tab${tab === "dictionary" ? " is-active" : ""}`}
                onClick={() => setTab("dictionary")}
              >
                Từ điển{senseCount > 0 ? ` · ${senseCount}` : ""}
              </button>
            </div>

            <div className="reader-lookup-body">
              {tab === "quick" ? (
                <section className="reader-lookup-vi" aria-label="Gợi ý tiếng Việt">
                  {result.vi.primary ? (
                    <>
                      <strong>Gợi ý VI</strong>
                      <p>{result.vi.primary}</p>
                      {result.vi.alternates.length > 0 ? (
                        <ul>
                          {result.vi.alternates.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      <small>
                        Từ đa nghĩa — đối chiếu câu EN phía trên (kiểu Readlang), rồi mở tab Từ điển nếu cần.
                      </small>
                    </>
                  ) : (
                    <p className="reader-lookup-empty">
                      Chưa có gợi ý VI ổn định. Dùng ngữ cảnh EN/VI phía trên hoặc tab <strong>Từ điển</strong> để xem từng nghĩa.
                    </p>
                  )}
                </section>
              ) : !result.dictionaryFound ? (
                <p className="reader-lookup-empty">
                  Từ điển không có entry đầy đủ cho cụm này. Thử bôi một từ đơn, nghe phát âm, hoặc dựa vào ngữ cảnh trong truyện.
                </p>
              ) : (
                result.meanings.map((meaning) => (
                  <section className="reader-lookup-meaning" key={meaning.partOfSpeech}>
                    <h3>
                      <span className="reader-lookup-pos">{meaning.partOfSpeech}</span>
                    </h3>
                    <ol>
                      {meaning.senses.map((sense) => (
                        <li key={`${meaning.partOfSpeech}-${sense.definition.slice(0, 32)}`}>
                          <p className="reader-lookup-definition">{sense.definition}</p>
                          {sense.example ? <p className="reader-lookup-example">“{sense.example}”</p> : null}
                          {sense.synonyms.length > 0 ? (
                            <p className="reader-lookup-synonyms">≈ {sense.synonyms.join(", ")}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </section>
                ))
              )}

              {result.sourceUrls[0] && tab === "dictionary" ? (
                <p className="reader-lookup-source">
                  Nguồn:{" "}
                  <a href={result.sourceUrls[0]} target="_blank" rel="noreferrer">
                    Wiktionary / dictionary
                  </a>
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
