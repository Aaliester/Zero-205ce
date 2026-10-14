# Zero AI

A sharp, warm AI assistant by **Salamon Aaliester**, ready for Netlify.

## Deploy
1. Push this folder to a PRIVATE GitHub repo (the API key is inside netlify/functions/config.js), or use `netlify deploy --prod`.
2. In Netlify: **Add new site → Import from Git** → pick the repo. No build command needed; publish dir is `public`.
3. **Site configuration → Environment variables** → add `NVIDIA_API_KEY` (optional: `NVIDIA_MODEL`).
4. Redeploy. The status dot in the top bar turns green when Zero is connected.

> Never put the API key in front-end files or commit it. It lives only in Netlify's environment variables and is used by the serverless function in `netlify/functions/chat.js`.

## Features
- Attach text/code/CSV/JSON, PDF and Word files, or images (drag & drop, paste, + menu, camera)
- Voice dictation (browser asks for microphone access), read-aloud, copy, retry
- Images use a vision model (`NVIDIA_VISION_MODEL`, default `meta/llama-3.2-11b-vision-instruct`); everything else uses `NVIDIA_MODEL`

## Customize
- Personality & creator info: `netlify/functions/persona.js`
- Look & feel: `public/style.css` (colors are CSS variables at the top)
- Model: set `NVIDIA_MODEL` (default `openai/gpt-oss-20b`)

## Local test
`npm i -g netlify-cli && netlify dev` (put your key in a local `.env`).
