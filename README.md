# Visualize CV

A modern resume builder web app with 9 templates, live preview, PDF/DOCX export, photo upload, and ATS analyzer.

## Features
- 9 visual templates with live preview
- Step-by-step wizard builder
- Resume analyzer score
- AI suggestions
- PDF & DOCX export
- Photo upload (local or Cloudinary)
- MongoDB or local JSON storage

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Visit `http://localhost:3000`

> If `MONGODB_URI` is not set, the app falls back to `data/db.json` for local storage.

## Deploy to Railway

1. Push this folder to a GitHub repository
2. Go to [railway.com](https://railway.com) → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects Node.js
4. Go to **Variables** and add:
   - `SESSION_SECRET` — any long random string
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — (optional, for photo uploads)
5. Go to **Settings → Networking → Generate Domain** to get your public URL

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Yes | Secret for session cookies |
| `MONGODB_URI` | Recommended | MongoDB Atlas URI |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary for photo uploads |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret |
| `PORT` | No | Defaults to 3000 |

## Project Structure

```
visualize-cv/
├── server.js           # Express server + all API routes
├── railway.json        # Railway deployment config
├── package.json
├── .env.example
├── .gitignore
├── data/
│   └── db.json         # Local JSON fallback (gitignored)
└── public/
    ├── index.html      # Landing page
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── ui-effects.js
    │   ├── landing.js
    │   ├── auth.js
    │   ├── builder.js
    │   ├── dashboard.js
    │   └── history.js
    └── pages/
        ├── auth.html
        ├── builder.html
        ├── dashboard.html
        └── history.html
```
