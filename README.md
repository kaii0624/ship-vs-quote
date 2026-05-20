# Ship vs. Quote

GPT-5.5 ships the app. The vendor pyramid ships the quote.

Ship vs. Quote is a playable satire demo for OpenAI DevDay 2026: one prompt is sent to two sides at once.

- **Codex side:** GPT generates a compact one-screen UI mock and shows it immediately.
- **Quote side:** a JTC-style vendor pyramid escalates approvals, internal meetings, estimate padding, and finally returns a PDF-style quote card.
- **Image Gen assets:** the salaryman pyramid and Codex-style pet visuals are built from generated sprite assets.

The default TODO prompt works as a no-key demo. For arbitrary prompts, users can enter their own OpenAI API key in the app. The key is not saved; it is passed through the Next.js API Route for that request.

## Tech Stack

- Next.js / React
- OpenAI Responses API
- GPT-5.5, GPT-5.4 mini, GPT-5.4 nano model selector
- Sandboxed iframe preview for generated HTML/CSS UI
- PDF-style estimate preview without server-side PDF generation

## Run Locally

```bash
npm install
npm run dev -- --port 3010
```

Open http://localhost:3010.

Optional `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
```

If `OPENAI_API_KEY` is not set, the initial TODO demo still works. Arbitrary prompts require either an environment API key or a user-entered API key.

## Deploy

Use Vercel for the playable link. GitHub Pages is not enough because this app uses a Next.js API Route at `app/api/duel/route.js`.

Recommended Vercel settings:

- Framework: Next.js
- Environment variables:
  - `OPENAI_API_KEY` optional
  - `OPENAI_MODEL=gpt-5.4-mini` optional

If no server-side API key is configured, visitors can still try the demo mode and can optionally enter their own key.

## Safety

- API keys are not stored by the app.
- Server-side keys stay in the API Route and are not exposed to the browser.
- Generated UI is rendered in `iframe sandbox="allow-scripts"` via `srcDoc`.
- The API Route injects a restrictive CSP meta tag into generated HTML.
- The app does not run generated code on the server, install packages, start Docker, or deploy user-generated apps.

## Submission Note

```text
#OpenAIDevDay2026

Ship vs. Quote: GPT-5.5 instantly ships a one-screen UI mock, while a traditional vendor pyramid escalates meetings and returns only an estimate PDF.

Built with Next.js, the OpenAI Responses API, GPT-5.5, and Image Gen sprite assets.

Playable: https://YOUR-VERCEL-URL
```
