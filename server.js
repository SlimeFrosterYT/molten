import express from "express";
import fetch from "node-fetch";

const app = express();

// Discord OAuth
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://molten-f0o7.onrender.com/oauth/discord/callback";

// List of Discord user IDs allowed to use your features
const allowedUsers = [
  "123456789012345678", // replace with actual Discord IDs
  "987654321098765432"
];

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/oauth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Missing code");

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

  if (!data.access_token) return res.send("Failed to get access token");

  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const user = await userRes.json();

  const allowed = allowedUsers.includes(user.id);

  // Redirect to client with permission info
  const redirectUrl = `https://arras.io/?perms=${allowed}&user=${encodeURIComponent(
    JSON.stringify({ id: user.id, username: user.username })
  )}`;
  res.redirect(redirectUrl);
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
