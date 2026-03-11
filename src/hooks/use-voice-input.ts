"use client";

import { useRef, useState, useCallback } from "react";
import { blobToFloat32Audio } from "@/lib/audio-utils";

export type VoiceState = "idle" | "recording" | "transcribing";

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("@/lib/whisper.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current.onmessage = (e: MessageEvent) => {
        if (e.data?.type === "result") {
          onTranscript(e.data.text);
          setVoiceState("idle");
        } else if (e.data?.type === "error") {
          console.error("Whisper error:", e.data.error);
          setVoiceState("idle");
        }
      };
    }
    return workerRef.current;
  }, [onTranscript]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setVoiceState("idle");
          return;
        }
        setVoiceState("transcribing");
        try {
          const audio = await blobToFloat32Audio(blob);
          const worker = getWorker();
          worker.postMessage({ type: "transcribe", audio });
        } catch (err) {
          console.error("Audio decode error:", err);
          setVoiceState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceState("recording");
    } catch (err) {
      console.error("Mic permission denied:", err);
      setVoiceState("idle");
    }
  }, [getWorker]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (voiceState === "idle") {
      startRecording();
    } else if (voiceState === "recording") {
      stopRecording();
    }
    // if transcribing, do nothing (wait for result)
  }, [voiceState, startRecording, stopRecording]);

  return { voiceState, toggleRecording };
}
