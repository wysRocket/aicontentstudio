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

## Deploy to Hostinger VPS

This repository is configured for automatic deployment to [Hostinger VPS](https://hpanel.hostinger.com/websites/aicontentstudio.net) on every push to the `main` branch.

### Required GitHub Secrets & Variables

In your repository settings (**Settings → Secrets and variables → Actions**), add:

**Secrets:**
- `HOSTINGER_API_TOKEN` – Your Hostinger API key (from [hPanel → Profile → API](https://hpanel.hostinger.com/profile/api))
- `GEMINI_API_KEY` – Your Google Gemini API key
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` – Twitter OAuth credentials *(optional)*
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` – LinkedIn OAuth credentials *(optional)*
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` – YouTube OAuth credentials *(optional)*

**Variables:**
- `HOSTINGER_VM_ID` – Your Hostinger VPS virtual machine ID (find it in your VPS dashboard URL: `https://hpanel.hostinger.com/vps/<VM_ID>/overview`, or from the default hostname `srv<VM_ID>.hstgr.cloud`)

### How It Works

1. On every push to `main`, the GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers.
2. The workflow uses Hostinger's official [`deploy-on-vps@v2`](https://github.com/marketplace/actions/deploy-on-hostinger-vps) action.
3. The action deploys the app to your VPS using Docker (via `docker-compose.yml`).
4. The container builds the React/Vite frontend and starts the Express server on port 3000, served on port 80.

### VPS Prerequisites

Your Hostinger VPS must have **Docker** installed. If it doesn't, you can install it via SSH:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt-get install -y docker-compose-plugin
```
