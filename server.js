import express from "express";
import fetch from "node-fetch";

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;          // Your Discord OAuth client ID
const CLIENT_SECRET = process.env.CLIENT_SECRET;  // Your Discord OAuth client secret
const BOT_TOKEN = process.env.BOT_TOKEN;          // Your bot token
const SERVER_ID = "1380225771603366058";          // Your server ID
const ROLE_ID = "1380829476228956260";            // The role ID required

app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/oauth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided.");

  try {
    // Step 1: Get OAuth token
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://molten-f0o7.onrender.com/oauth/discord/callback",
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return res.send("Failed to get access token.");

    // Step 2: Get user info
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();
    if (!user.id) return res.send("Failed to get user info.");

    // Step 3: Check guild membership & role using BOT token
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${user.id}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );

    if (!memberRes.ok) return res.send("Access denied: Not in server.");
    const member = await memberRes.json();

    if (!member.roles.includes(ROLE_ID)) {
      return res.send("Access denied: Missing required role.");
    }

    // Step 4: Authorized → redirect or return user data
    const redirectUrl = `https://arras.io/?user=${encodeURIComponent(
      JSON.stringify({
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
      })
    )}`;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    res.send("Error during Discord authentication.");
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running on port", process.env.PORT || 3000)
);
