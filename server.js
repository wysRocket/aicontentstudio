import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

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

  // Twitter OAuth
  app.get("/api/auth/twitter/url", (req, res) => {
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/twitter/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.TWITTER_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state: "state",
      code_challenge: "challenge",
      code_challenge_method: "plain",
    });
    res.json({ url: `https://twitter.com/i/oauth2/authorize?${params}` });
  });

  app.get(
    ["/auth/twitter/callback", "/auth/twitter/callback/"],
    async (req, res) => {
      const { code } = req.query;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/twitter/callback`;

        // If no client ID/secret, just return a mock success for preview purposes
        if (
          !process.env.TWITTER_CLIENT_ID ||
          !process.env.TWITTER_CLIENT_SECRET
        ) {
          return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    provider: 'twitter', 
                    tokenData: { access_token: 'mock_twitter_token', refresh_token: 'mock_refresh', expires_in: 7200 },
                    profile: { handle: '@mockuser', name: 'Mock User', picture: 'https://i.pravatar.cc/150?u=twitter' }
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful (Mock). This window should close automatically.</p>
            </body>
          </html>
        `);
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
              code: String(code || ""),
              grant_type: "authorization_code",
              client_id: process.env.TWITTER_CLIENT_ID,
              redirect_uri: redirectUri,
              code_verifier: "challenge", // In a real app, this should be dynamically generated and stored in session
            }),
          },
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        // Fetch user profile
        const userResponse = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          },
        );
        const userData = await userResponse.json();

        res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'twitter', 
                  tokenData: ${JSON.stringify(tokenData)},
                  profile: { handle: '@' + '${userData.data?.username || "user"}', name: '${userData.data?.name || "User"}', picture: '${userData.data?.profile_image_url || ""}' }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
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

  // LinkedIn OAuth
  app.get("/api/auth/linkedin/url", (req, res) => {
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/linkedin/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state: "state",
      scope: "r_liteprofile r_emailaddress w_member_social",
    });
    res.json({
      url: `https://www.linkedin.com/oauth/v2/authorization?${params}`,
    });
  });

  app.get(
    ["/auth/linkedin/callback", "/auth/linkedin/callback/"],
    async (req, res) => {
      const { code } = req.query;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/linkedin/callback`;

        if (
          !process.env.LINKEDIN_CLIENT_ID ||
          !process.env.LINKEDIN_CLIENT_SECRET
        ) {
          return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    provider: 'linkedin', 
                    tokenData: { access_token: 'mock_linkedin_token', expires_in: 5184000 },
                    profile: { handle: 'Mock LinkedIn User', name: 'Mock LinkedIn User', picture: 'https://i.pravatar.cc/150?u=linkedin' }
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful (Mock). This window should close automatically.</p>
            </body>
          </html>
        `);
        }

        const tokenResponse = await fetch(
          "https://www.linkedin.com/oauth/v2/accessToken",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: String(code || ""),
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

        // Fetch user profile
        const userResponse = await fetch("https://api.linkedin.com/v2/me", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        const userData = await userResponse.json();

        res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'linkedin', 
                  tokenData: ${JSON.stringify(tokenData)},
                  profile: { handle: '${userData.localizedFirstName} ${userData.localizedLastName}', name: '${userData.localizedFirstName} ${userData.localizedLastName}', picture: '' }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
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

  // YouTube OAuth
  app.get("/api/auth/youtube/url", (req, res) => {
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/youtube/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get(
    ["/auth/youtube/callback", "/auth/youtube/callback/"],
    async (req, res) => {
      const { code } = req.query;
      try {
        const redirectUri = `${req.protocol}://${req.get("host")}/auth/youtube/callback`;

        if (
          !process.env.YOUTUBE_CLIENT_ID ||
          !process.env.YOUTUBE_CLIENT_SECRET
        ) {
          return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    provider: 'youtube', 
                    tokenData: { access_token: 'mock_youtube_token', refresh_token: 'mock_refresh', expires_in: 3600 },
                    profile: { handle: 'Mock YouTube Channel', name: 'Mock YouTube Channel', picture: 'https://i.pravatar.cc/150?u=youtube' }
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful (Mock). This window should close automatically.</p>
            </body>
          </html>
        `);
        }

        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: String(code || ""),
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

        // Fetch user profile
        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          },
        );
        const userData = await userResponse.json();

        res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'youtube', 
                  tokenData: ${JSON.stringify(tokenData)},
                  profile: { handle: '${userData.email || userData.name}', name: '${userData.name}', picture: '${userData.picture || ""}' }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
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

  // Prefer serving built assets whenever they exist. This avoids accidental
  // dev-mode Vite startup on hosts that do not set NODE_ENV=production.
  if (!hasProductionBuild) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      }
    }));
    app.get("*", (req, res, next) => {
      // Only serve SPA shell for navigation requests. Let asset-like paths 404.
      if (req.path.startsWith('/api/')) return next();
      if (path.extname(req.path)) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.use((_req, res) => {
      res.status(404).send("Not Found");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
