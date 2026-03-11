"use client";

import type { VoiceState } from "@/hooks/use-voice-input";

export function VoiceButton({
  state,
  onClick,
  disabled,
}: {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (state === "transcribing") {
    return (
      <button
        type="button"
        disabled
        className="absolute right-12 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-[#5EEAD4]"
        title="Transcribing..."
      >
        <div className="h-4 w-4 rounded-full border-2 border-[#5EEAD4]/30 border-t-[#5EEAD4] animate-spin" />
      </button>
    );
  }

  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="absolute right-12 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-rose-400 transition hover:bg-rose-400/10"
        title="Stop recording"
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/30" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute right-12 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-0"
      title="Voice input"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="1" width="6" height="11" rx="3" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
