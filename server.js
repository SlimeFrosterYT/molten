import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const app = express();

// ===== CONFIG =====
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://yourdomain.com/oauth/discord/callback";
const BOT_TOKEN = process.env.BOT_TOKEN; // use your bot token here
const SERVER_ID = "1380225771603366058";
const ROLE_ID = "1380829476228956260";
const JWT_SECRET = "aR@nDoM$eCuReS3cret!123"; // use strong secret in env

// ===== ROUTES =====
app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/oauth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  // Step 1: Exchange code for access token
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const data = await tokenRes.json();
  if (!data.access_token) return res.send("Invalid OAuth token");

  // Step 2: Get user info
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const user = await userRes.json();

  // Step 3: Use bot to check member roles
  const memberRes = await fetch(
    `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${user.id}`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
  );

  if (!memberRes.ok) return res.send("Access denied: Not a member");
  const member = await memberRes.json();
  if (!member.roles.includes(ROLE_ID))
    return res.send("Access denied: Missing required role");

  // Step 4: Generate JWT for your client
  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Redirect to your client with token (can be used to authorize features)
  res.redirect(`https://arras.io/?token=${token}`);
});

// ===== START SERVER =====
app.listen(process.env.PORT || 3000, () => console.log("Server running"));
