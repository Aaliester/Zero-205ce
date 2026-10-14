import { buildSystemPrompt } from "./persona.js";
import { API_KEY, MODEL, VISION_MODEL } from "./config.js";

const BASE_URL = "https://integrate.api.nvidia.com/v1";
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
const IMG = /^data:image\/(png|jpe?g|webp|gif);base64,/;

function normalize(raw) {
  const out = [];
  for (const m of Array.isArray(raw) ? raw : []) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    if (typeof m.content === "string") {
      if (m.content.trim()) out.push({ role: m.role, content: m.content.slice(0, 60000) });
    } else if (Array.isArray(m.content) && m.role === "user") {
      const parts = []; let imgs = 0;
      for (const p of m.content) {
        if (p?.type === "text" && typeof p.text === "string") parts.push({ type: "text", text: p.text.slice(0, 60000) });
        else if (p?.type === "image_url" && imgs < 3 && IMG.test(p.image_url?.url || "") && p.image_url.url.length < 2_500_000) {
          imgs++; parts.push({ type: "image_url", image_url: { url: p.image_url.url } });
        }
      }
      if (parts.length) out.push({ role: "user", content: parts });
    }
  }
  return out.slice(-20);
}

async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!API_KEY) return json({ error: "Zero isn't connected yet. Add NVIDIA_API_KEY in Netlify → Environment variables, then redeploy." }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const messages = normalize(body?.messages);
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return json({ error: "Say something first." }, 400);

  const hasImages = Array.isArray(last.content) && last.content.some((p) => p.type === "image_url");
  const system = buildSystemPrompt();
  let payload;
  if (hasImages) {
    // Many vision models ignore the system role, so fold it into the final user turn.
    const folded = { role: "user", content: last.content.map((p, i) => i === 0 && p.type === "text" ? { ...p, text: `${system}\n\n---\nUser message:\n${p.text}` } : p) };
    payload = [...messages.slice(0, -1).map((m) => typeof m.content === "string" ? m : { role: m.role, content: m.content.filter((p) => p.type === "text").map((p) => p.text).join("\n") }), folded];
  } else {
    payload = [{ role: "system", content: system }, ...messages];
  }

  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ model: hasImages ? VISION_MODEL : MODEL, messages: payload, temperature: 0.7, top_p: 1, max_tokens: 2048, stream: true }),
    });
  } catch {
    return json({ error: "Couldn't reach the AI service. Try again in a moment." }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    console.error("upstream", upstream.status, await upstream.text().catch(() => ""));
    const hint = upstream.status === 401 || upstream.status === 403 ? "The API key was rejected. Check NVIDIA_API_KEY."
      : upstream.status === 429 ? "Zero is a little overloaded. Try again shortly."
      : hasImages ? "Image analysis isn't available on the current vision model. Set NVIDIA_VISION_MODEL in Netlify to a vision model your key can use, or attach text/PDF files instead."
      : "The AI service had a problem. Try again.";
    return json({ error: hint }, 502);
  }

  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  const stream = upstream.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") continue;
        try { const t = JSON.parse(data).choices?.[0]?.delta?.content; if (t) ctl.enqueue(enc.encode(t)); } catch {}
      }
    },
  }));

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

export default async (req) => {
  try { return await handler(req); }
  catch (err) { console.error("chat function error:", err); return json({ error: "Zero hit an unexpected error. Check the function logs in Netlify." }, 500); }
};

export const config = { path: "/api/chat" };
