# SOLVED Studio

Hosted app: https://solved-studio-sigma.vercel.app

This release applies the current SOLVED Studio design to the existing password-protected Vercel project. Source lives on the `solved-studio` GitHub branch; `main` belongs to a different app.

- `studio/index.html` and `studio/assets/`: current application.
- `api/brief-import.py`: authenticated document parsing (PDF, DOCX, text; 3 MB per file). Recognized document headings populate editable overview fields.
- `middleware.js` and `lib/session.js`: existing password login and signed sessions.
- `api/claude.js`: existing authenticated text/photo analysis integration.
- Image generation uses the Higgsfield API with server-only credentials. GPT Image 2.5 supports all five quality levels and 1K, 2K, and 4K output. Video generation remains unavailable.

Projects and uploaded images are saved in the browser on the current origin. Localhost projects are not transferred automatically and storage is not synchronized across devices. Source, credentials, documents, and project data are separate: credentials remain in Vercel environment variables; private local project data is not included in this repository update.

Required server configuration: `STUDIO_PASSWORD`, `STUDIO_SESSION_SECRET`. Existing `ANTHROPIC_API_KEY` supports analysis. Do not commit secrets.
