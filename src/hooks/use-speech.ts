"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VOICE_STORAGE_KEY = "orpheus-voice";

// Pick the best-sounding available system voice. Browsers ship several voices;
// the default is often the robotic one, so prefer higher-quality natural/neural
// English voices (free, e.g. "Microsoft Aria Online (Natural)") when present.
function pickVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;

  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  return (
    pool.find((v) => /natural|neural|online/i.test(v.name)) ??
    pool.find((v) => /aria|jenny|guy|libby|sonia|emma|ava|samantha|google/i.test(v.name)) ??
    pool.find((v) => v.default) ??
    pool[0]
  );
}

// Strip markdown/formatting so the speech synthesizer reads natural prose
// instead of "asterisk asterisk" and raw urls.
function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s*[-*]\s+/gm, "") // list bullets
    .replace(/[*_#>`~|]/g, " ") // leftover markdown symbols
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Read-aloud for chat messages using the browser's built-in speechSynthesis
 * (Web Speech API). Fully client-side and free — no API keys, no network.
 *
 * Exposes the available voices and a remembered voice selection so the UI can
 * offer a picker. A null selection means "automatic" (best available voice).
 */
export function useSpeech() {
  // The id of the message currently being spoken, or null.
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // English voices for the picker UI (falls back to all if none are English).
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  // The user's chosen voice name, or null for automatic. Persisted lazily.
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(VOICE_STORAGE_KEY)
      : null,
  );

  // Refs mirror state so the stable speak() callback always sees current values.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedNameRef = useRef<string | null>(selectedVoiceName);

  useEffect(() => {
    selectedNameRef.current = selectedVoiceName;
  }, [selectedVoiceName]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const sync = () => {
      const all = window.speechSynthesis.getVoices();
      voicesRef.current = all;
      const english = all.filter((v) => v.lang?.toLowerCase().startsWith("en"));
      const pool = english.length > 0 ? english : all;
      // Some browsers return the same voice more than once — dedupe by name.
      const seen = new Set<string>();
      setVoices(
        pool.filter((v) => {
          if (seen.has(v.name)) return false;
          seen.add(v.name);
          return true;
        }),
      );
    };

    // Defer the first read so we don't setState synchronously inside the effect.
    const timer = setTimeout(sync, 0);
    // Voices load asynchronously in some browsers — refresh on voiceschanged.
    window.speechSynthesis.addEventListener("voiceschanged", sync);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", sync);
      window.speechSynthesis.cancel();
    };
  }, []);

  const setVoice = useCallback((name: string | null) => {
    setSelectedVoiceName(name);
    selectedNameRef.current = name;
    if (typeof window !== "undefined") {
      if (name) {
        window.localStorage.setItem(VOICE_STORAGE_KEY, name);
      } else {
        window.localStorage.removeItem(VOICE_STORAGE_KEY);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const clean = stripForSpeech(text);
    if (!clean) return;

    // Stop anything already playing before starting the new utterance.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1;

    const all = voicesRef.current;
    const chosen = selectedNameRef.current
      ? all.find((v) => v.name === selectedNameRef.current)
      : undefined;
    const voice = chosen ?? pickVoice(all);
    if (voice) utterance.voice = voice;

    // Only clear if this exact utterance is still the active one.
    utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    utterance.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));

    window.speechSynthesis.speak(utterance);
    setSpeakingId(id);
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) {
        stop();
      } else {
        speak(id, text);
      }
    },
    [speakingId, speak, stop],
  );

  // The voice "Automatic" currently resolves to, so the UI can show its name.
  const autoVoiceName = pickVoice(voices)?.name ?? null;

  return {
    speakingId,
    toggle,
    stop,
    voices,
    selectedVoiceName,
    setVoice,
    autoVoiceName,
  };
}
