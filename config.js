// Server-side only (never sent to the browser).
// Netlify environment variables, if set, take priority over these defaults.
export const API_KEY =
  process.env.NVIDIA_API_KEY ||
  "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";
export const MODEL = process.env.NVIDIA_MODEL || "openai/gpt-oss-20b";
// Used automatically when the user attaches an image (the main model is text-only).
export const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";
