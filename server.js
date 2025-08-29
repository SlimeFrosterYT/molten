import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();

const SERVER_ID = "1380225771603366058";
const ROLE_ID = "1380829476228956260";
const SECRET = process.env.JWT_SECRET || "supersecret"; // Use a strong secret

// In-memory token storage
// Format: { tokenString: { id, username, timestamp } }
const tokenStore = {};

function signToken(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64");
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("base64");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64");
  if (expectedSig !== signature) return null;
  return JSON.parse(Buffer.from(payload, "base64").toString());
}

app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/oauth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided.");

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://molten-f0o7.onrender.com/oauth/discord/callback",
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await tokenRes.json();
  const accessToken = data.access_token;

  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = await userRes.json();

  const guildMemberRes = await fetch(
    `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${user.id}`,
    { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
  );

  if (!guildMemberRes.ok) {
    return res.send("Access denied: Not a member of the server.");
  }

  const member = await guildMemberRes.json();
  if (!member.roles.includes(ROLE_ID)) {
    return res.send("Access denied: Missing required role.");
  }

  // Generate a long random token string for storage
  const token = signToken({
    id: user.id,
    username: user.username,
    timestamp: Date.now(),
    long: crypto.randomBytes(32).toString("hex"),
  });

  // Store it server-side
  tokenStore[token] = { ...user, timestamp: Date.now() };

  // Redirect with token instead of raw user info
  const redirectUrl = `https://arras.io/?token=${encodeURIComponent(token)}`;
  res.redirect(redirectUrl);
});

// Example verification route (client can call to validate token)
app.get("/verify", (req, res) => {
  const token = req.query.token;
  if (!token || !tokenStore[token]) return res.status(401).send("Invalid token");

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).send("Invalid signature");

  res.json({ ok: true, user: tokenStore[token] });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
