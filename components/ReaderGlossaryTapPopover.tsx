"use client";

import type { GlossaryCharacter } from "@/lib/reader-glossary";
import { X } from "lucide-react";

type ReaderGlossaryTapPopoverProps = {
  character: GlossaryCharacter | null;
  onClose: () => void;
};

export function ReaderGlossaryTapPopover({ character, onClose }: ReaderGlossaryTapPopoverProps) {
  if (!character) return null;

  return (
    <div className="reader-glossary-tap-layer" role="presentation">
      <button type="button" className="reader-glossary-tap-backdrop" aria-label="Đóng" onClick={onClose} />
      <div className="reader-glossary-tap-popover" role="dialog" aria-label={`Nhân vật ${character.name}`}>
        <button type="button" className="reader-glossary-tap-close" aria-label="Đóng" onClick={onClose}>
          <X size={15} />
        </button>
        <strong>{character.name}</strong>
        {character.role ? <span>{character.role}</span> : null}
        {character.pronouns3rd ? <small>{character.pronouns3rd}</small> : null}
        {character.personality ? <p>{character.personality}</p> : null}
      </div>
    </div>
  );
}
