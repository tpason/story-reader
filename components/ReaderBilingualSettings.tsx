"use client";

import { Languages, Sparkles } from "lucide-react";
import type { ContentLayer } from "@/lib/reader-content-layers";
import { layerLabel, layerLanguage } from "@/lib/reader-content-layers";
import {
  learnEnglishPreset,
  readReaderBilingualPrefs,
  writeReaderBilingualPrefs,
  type BilingualDisplayMode,
  type ReaderBilingualPrefs
} from "@/lib/reader-bilingual-prefs";
import type { StorySummary } from "@/lib/types";

type ReaderBilingualSettingsProps = {
  story: StorySummary;
  availableLayers: ContentLayer[];
  onChange: (prefs: ReaderBilingualPrefs) => void;
};

const LAYER_OPTIONS: ContentLayer[] = ["raw", "translated", "polished"];

export function ReaderBilingualSettings({ story, availableLayers, onChange }: ReaderBilingualSettingsProps) {
  const prefs = readReaderBilingualPrefs();
  const layers = LAYER_OPTIONS.filter((layer) => availableLayers.includes(layer));

  function update(partial: Partial<ReaderBilingualPrefs>) {
    const next = { ...readReaderBilingualPrefs(), ...partial };
    writeReaderBilingualPrefs(next);
    onChange(next);
  }

  return (
    <section className="reader-bilingual-settings" aria-label="Song ngữ Anh – Việt">
      <div className="reader-bilingual-settings-card">
        <div className="reader-bilingual-settings-heading">
          <p className="reader-bilingual-eyebrow">
            <Languages size={13} aria-hidden />
            Ngoại điển · Song hành
          </p>
          <h3>Song ngữ linh quyển</h3>
          <p className="reader-bilingual-settings-note">
            Chỉ mở với truyện nguồn Anh. Tiếng Việt polish là bản đối chiếu; audio vẫn theo bản Việt.
          </p>
        </div>

        <label className="reader-sheet-toggle reader-bilingual-toggle">
          <input type="checkbox" checked={prefs.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
          <span>Bật song ngữ</span>
        </label>

        {prefs.enabled ? (
          <div className="reader-bilingual-settings-body">
            <button type="button" className="reader-bilingual-preset-chip" onClick={() => update(learnEnglishPreset())}>
              <Sparkles size={14} aria-hidden />
              Kiếm Anh · EN gốc + VI polish
            </button>

            <label className="reader-bilingual-field">
              <span>Văn bản chính</span>
              <select
                value={prefs.primaryLayer}
                onChange={(event) => update({ primaryLayer: event.target.value as ContentLayer })}
              >
                {layers.map((layer) => (
                  <option key={layer} value={layer}>
                    {layerLabel(layer, layerLanguage(layer, story.sourceCode))}
                  </option>
                ))}
              </select>
            </label>

            <label className="reader-bilingual-field">
              <span>Bản đối chiếu</span>
              <select
                value={prefs.secondaryLayer}
                onChange={(event) => update({ secondaryLayer: event.target.value as ContentLayer })}
              >
                {layers
                  .filter((layer) => layer !== prefs.primaryLayer)
                  .map((layer) => (
                    <option key={layer} value={layer}>
                      {layerLabel(layer, layerLanguage(layer, story.sourceCode))}
                    </option>
                  ))}
              </select>
            </label>

            <label className="reader-bilingual-field">
              <span>Cách hiển thị</span>
              <select
                value={prefs.displayMode}
                onChange={(event) => {
                  const displayMode = event.target.value as BilingualDisplayMode;
                  update({
                    displayMode,
                    secondaryVisible: displayMode === "interleaved"
                  });
                }}
              >
                <option value="interleaved">Xen kẽ từng đoạn</option>
                <option value="secondary_hidden">Ẩn bản đối chiếu (phím H)</option>
              </select>
            </label>

            <label className="reader-sheet-toggle reader-bilingual-toggle">
              <input
                type="checkbox"
                checked={prefs.scrollHighlight}
                onChange={(event) => update({ scrollHighlight: event.target.checked })}
              />
              <span>Linh quang khi cuộn, sáng đoạn đang đọc</span>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
