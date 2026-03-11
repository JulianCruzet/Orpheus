import { pipeline } from "@huggingface/transformers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;

async function getTranscriber() {
  if (!transcriber) {
    transcriber = await (pipeline as Function)(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny",
      { dtype: "q8", device: "wasm" },
    );
  }
  return transcriber;
}

self.onmessage = async (e: MessageEvent) => {
  if (e.data?.type === "transcribe") {
    try {
      const pipe = await getTranscriber();
      const result = await pipe(e.data.audio);
      const text = Array.isArray(result) ? result[0].text : result.text;
      self.postMessage({ type: "result", text: ((text as string) ?? "").trim() });
    } catch (err) {
      self.postMessage({
        type: "error",
        error: err instanceof Error ? err.message : "transcription failed",
      });
    }
  }
};
