import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();

// Replace with your Discord server & role IDs
const SERVER_ID = "1380225771603366058";
const ROLE_ID = "1380829476228956260";
const SECRET = "aR@nDoM$eCuReS3cret!123"; // Your secure JWT secret

// Helper to create a JWT-like token
function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

// Helper to verify the token
function verifyToken(token) {
  const [header, body, signature] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  if (expectedSig !== signature) return null;
  return JSON.parse(Buffer.from(body, "base64url").toString());
}

// Health check
app.get("/", (req, res) => res.send("OK"));

// Discord OAuth callback
app.get("/oauth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Missing code");

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://molten-f0o7.onrender.com/oauth/discord/callback",
  });

  try {
    // Get access token from Discord
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await tokenRes.json();
    const accessToken = data.access_token;

    // Get user info
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();

    // Get guild membership
    const memberRes = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${SERVER_ID}/member`,
      { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } } // Need a bot token here
    );

    if (!memberRes.ok) return res.send("Access denied: Not in server");

    const member = await memberRes.json();
    if (!member.roles.includes(ROLE_ID)) return res.send("Access denied: Missing role");

    // Create JWT-like token for client
    const token = signToken({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    });

    // Redirect to arras.io with token
    res.redirect(`https://arras.io/?token=${token}`);
  } catch (err) {
    console.error(err);
    res.send("Error during authentication");
  }
});

// Optional endpoint to verify token
app.get("/verify", (req, res) => {
  const token = req.query.token;
  const payload = verifyToken(token);
  if (!payload) return res.send("Invalid token");
  res.send(`Hello ${payload.username}`);
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
