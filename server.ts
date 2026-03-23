import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Validate required OAuth env vars at startup and warn loudly when missing.
// OAuth flows will fall back to mock mode if credentials are absent.
const OAUTH_ENV_VARS = [
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
] as const;

const missingVars = OAUTH_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(
    `[server] WARNING: Missing env vars: ${missingVars.join(", ")}. ` +
      "OAuth providers without credentials will use mock mode.",
  );
}

// Allowed origins for postMessage. Defaults to localhost:3000; set
// ALLOWED_ORIGINS as a comma-separated list in production (e.g.
// "https://app.example.com,https://www.example.com").
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

/** Encode the OAuth `state` param to carry the caller's origin through the redirect. */
function encodeState(origin: string): string {
  return Buffer.from(JSON.stringify({ origin })).toString("base64url");
}

/** Decode and return a validated origin from the `state` param, or `null` if invalid. */
function decodeOrigin(state: string | undefined): string | null {
  if (!state) return null;
  try {
    const { origin } = JSON.parse(Buffer.from(state, "base64url").toString());
    return typeof origin === "string" && ALLOWED_ORIGINS.has(origin)
      ? origin
      : null;
  } catch {
    return null;
  }
}

/** Build the popup HTML that closes itself and posts the auth result to the opener. */
function buildPopupHtml(
  targetOrigin: string,
  provider: string,
  tokenData: object,
  profile: { handle: string; name: string; picture: string },
  isMock = false,
): string {
  const payload = JSON.stringify({
    type: "OAUTH_AUTH_SUCCESS",
    provider,
    tokenData,
    profile,
  });
  const mockNote = isMock ? " (Mock)" : "";
  return `<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(${payload}, ${JSON.stringify(targetOrigin)});
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Authentication successful${mockNote}. This window should close automatically.</p>
  </body>
</html>`;
}

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || "3000", 10);

  // Respect proxy headers in hosted environments so req.protocol resolves to https.
  app.set("trust proxy", true);

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ── Twitter OAuth ────────────────────────────────────────────────────────────

  app.get("/api/auth/twitter/url", (req, res) => {
    const callerOrigin = req.query.origin as string | undefined;
    const state = encodeState(callerOrigin || "");
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/twitter/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.TWITTER_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: "challenge",
      code_challenge_method: "plain",
    });
    res.json({ url: `https://twitter.com/i/oauth2/authorize?${params}` });
  });

  app.get(
    ["/auth/twitter/callback", "/auth/twitter/callback/"],
    async (req, res) => {
      const { code, state } = req.query;
      const targetOrigin =
        decodeOrigin(state as string) || `${req.protocol}://${req.get("host")}`;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/twitter/callback`;

        if (
          !process.env.TWITTER_CLIENT_ID ||
          !process.env.TWITTER_CLIENT_SECRET
        ) {
          return res.send(
            buildPopupHtml(
              targetOrigin,
              "twitter",
              {
                access_token: "mock_twitter_token",
                refresh_token: "mock_refresh",
                expires_in: 7200,
              },
              {
                handle: "@mockuser",
                name: "Mock User",
                picture: "https://i.pravatar.cc/150?u=twitter",
              },
              true,
            ),
          );
        }

        const tokenResponse = await fetch(
          "https://api.twitter.com/2/oauth2/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
            },
            body: new URLSearchParams({
              code: code as string,
              grant_type: "authorization_code",
              client_id: process.env.TWITTER_CLIENT_ID,
              redirect_uri: redirectUri,
              code_verifier: "challenge",
            }),
          },
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        const userResponse = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );
        const userData = await userResponse.json();

        return res.send(
          buildPopupHtml(targetOrigin, "twitter", tokenData, {
            handle: "@" + (userData.data?.username || "user"),
            name: userData.data?.name || "User",
            picture: userData.data?.profile_image_url || "",
          }),
        );
      } catch (error) {
        console.error("Twitter OAuth Error:", error);
        res
          .status(500)
          .send(
            "Authentication failed: " +
              (error instanceof Error ? error.message : String(error)),
          );
      }
    },
  );

  // ── LinkedIn OAuth ───────────────────────────────────────────────────────────

  app.get("/api/auth/linkedin/url", (req, res) => {
    const callerOrigin = req.query.origin as string | undefined;
    const state = encodeState(callerOrigin || "");
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/linkedin/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state,
      scope: "r_liteprofile r_emailaddress w_member_social",
    });
    res.json({
      url: `https://www.linkedin.com/oauth/v2/authorization?${params}`,
    });
  });

  app.get(
    ["/auth/linkedin/callback", "/auth/linkedin/callback/"],
    async (req, res) => {
      const { code, state } = req.query;
      const targetOrigin =
        decodeOrigin(state as string) || `${req.protocol}://${req.get("host")}`;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/linkedin/callback`;

        if (
          !process.env.LINKEDIN_CLIENT_ID ||
          !process.env.LINKEDIN_CLIENT_SECRET
        ) {
          return res.send(
            buildPopupHtml(
              targetOrigin,
              "linkedin",
              { access_token: "mock_linkedin_token", expires_in: 5184000 },
              {
                handle: "Mock LinkedIn User",
                name: "Mock LinkedIn User",
                picture: "https://i.pravatar.cc/150?u=linkedin",
              },
              true,
            ),
          );
        }

        const tokenResponse = await fetch(
          "https://www.linkedin.com/oauth/v2/accessToken",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: code as string,
              client_id: process.env.LINKEDIN_CLIENT_ID,
              client_secret: process.env.LINKEDIN_CLIENT_SECRET,
              redirect_uri: redirectUri,
            }),
          },
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        const userResponse = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();
        const fullName =
          `${userData.localizedFirstName || ""} ${userData.localizedLastName || ""}`.trim() ||
          "LinkedIn User";

        return res.send(
          buildPopupHtml(targetOrigin, "linkedin", tokenData, {
            handle: fullName,
            name: fullName,
            picture: "",
          }),
        );
      } catch (error) {
        console.error("LinkedIn OAuth Error:", error);
        res
          .status(500)
          .send(
            "Authentication failed: " +
              (error instanceof Error ? error.message : String(error)),
          );
      }
    },
  );

  // ── YouTube OAuth ────────────────────────────────────────────────────────────

  app.get("/api/auth/youtube/url", (req, res) => {
    const callerOrigin = req.query.origin as string | undefined;
    const state = encodeState(callerOrigin || "");
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/youtube/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get(
    ["/auth/youtube/callback", "/auth/youtube/callback/"],
    async (req, res) => {
      const { code, state } = req.query;
      const targetOrigin =
        decodeOrigin(state as string) || `${req.protocol}://${req.get("host")}`;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/youtube/callback`;

        if (
          !process.env.YOUTUBE_CLIENT_ID ||
          !process.env.YOUTUBE_CLIENT_SECRET
        ) {
          return res.send(
            buildPopupHtml(
              targetOrigin,
              "youtube",
              {
                access_token: "mock_youtube_token",
                refresh_token: "mock_refresh",
                expires_in: 3600,
              },
              {
                handle: "Mock YouTube Channel",
                name: "Mock YouTube Channel",
                picture: "https://i.pravatar.cc/150?u=youtube",
              },
              true,
            ),
          );
        }

        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: code as string,
              client_id: process.env.YOUTUBE_CLIENT_ID,
              client_secret: process.env.YOUTUBE_CLIENT_SECRET,
              redirect_uri: redirectUri,
            }),
          },
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );
        const userData = await userResponse.json();

        return res.send(
          buildPopupHtml(targetOrigin, "youtube", tokenData, {
            handle: userData.email || userData.name || "YouTube User",
            name: userData.name || "YouTube User",
            picture: userData.picture || "",
          }),
        );
      } catch (error) {
        console.error("YouTube OAuth Error:", error);
        res
          .status(500)
          .send(
            "Authentication failed: " +
              (error instanceof Error ? error.message : String(error)),
          );
      }
    },
  );

  const distPath = path.join(process.cwd(), "dist");
  const hasProductionBuild = fs.existsSync(path.join(distPath, "index.html"));

  if (!hasProductionBuild) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
