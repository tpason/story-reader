"use client";

export type BackgroundAudioTrack = {
  id: string;
  label: string;
  mood: string;
  src: string;
};

export const BACKGROUND_AUDIO_TRACKS: BackgroundAudioTrack[] = [
  {
    id: "zen",
    label: "Thiền cảnh",
    mood: "Êm dịu",
    src: "/background-audio/mystical-zen-serenity-cinematic-ambient-meditation-music-332902.mp3"
  },
  {
    id: "flute",
    label: "Tiêu khách",
    mood: "Cổ phong",
    src: "/background-audio/samurai-flutes-ethereal-fantasy-flute-relaxing-meditation-music-248255.mp3"
  }
];
