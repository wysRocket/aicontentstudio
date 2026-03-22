<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/659a1553-c634-4909-82e0-eccc60628d0e

## Run Locally

**Prerequisites:** Node.js

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

## Hostinger MCP (for deployment debugging)

Install the official Hostinger MCP server (requires Node.js 24+):

```bash
npm install -g hostinger-api-mcp
```

Create a VS Code MCP config in `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "hostinger-api": {
      "command": "hostinger-api-mcp",
      "env": {
        "DEBUG": "false",
        "API_TOKEN": "YOUR_HOSTINGER_API_TOKEN"
      }
    }
  }
}
```

With this configured, you can inspect Hostinger deployments and fetch build logs directly via MCP tools.

## Deployment Troubleshooting

- Server now binds to `process.env.PORT` (fallback `3000`) so managed hosting can route traffic correctly.
- Server trusts proxy headers so OAuth callback redirect URIs use `https` when behind a reverse proxy.
- OAuth popup messages now accept same-origin callbacks, which is required on custom domains like `aicontentstudio.net`.

### About this browser console message

`Unchecked runtime.lastError: The message port closed before a response was received.`

This message is usually emitted by a browser extension content script, not by this app's React/Express code. Validate in an Incognito window with extensions disabled to confirm.
