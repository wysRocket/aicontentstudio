<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/659a1553-c634-4909-82e0-eccc60628d0e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Hostinger

This repository is configured for automatic deployment to [aicontentstudio.net](https://hpanel.hostinger.com/websites/aicontentstudio.net) on every push to the `main` branch.

### Required GitHub Secret

In your repository settings (**Settings → Secrets and variables → Actions**), ensure the following secret is present:

- `HOSTINGER_API_TOKEN` – Your Hostinger API key (from [hPanel → Profile → API](https://hpanel.hostinger.com/profile/api))

### How It Works

1. On every push to `main`, the GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers.
2. The workflow creates a source archive (excluding `node_modules`, `dist`, `.env` files, etc.).
3. A deploy script (`.github/scripts/deploy.mjs`) calls the Hostinger Hosting API to:
   - Upload the source archive to your hosting account's file manager.
   - Fetch the detected build settings (entry point, build command, Node.js version) from the archive.
   - Trigger a Node.js build on the Hostinger server.
4. Hostinger runs `npm install` + `npm run build` server-side and starts the app automatically.
