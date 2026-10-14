import { API_KEY } from "./config.js";

export default async () =>
  new Response(JSON.stringify({ status: "ok", name: "Zero AI", configured: Boolean(API_KEY) }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const config = { path: "/api/health" };
