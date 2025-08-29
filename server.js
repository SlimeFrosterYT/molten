import express from "express";
import fetch from "node-fetch";

const app = express();

// Discord OAuth
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://molten-f0o7.onrender.com/oauth/discord/callback";

// List of allowed Discord usernames
const allowedUsers = [
  "slimefroster"
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

  try {
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

    // Check username#discriminator
    const userTag = `${user.username}#${user.discriminator}`;
    const allowed = allowedUsers.includes(userTag);

    // Build redirect URL
    const redirectUrl = new URL("https://arras.io/");
    redirectUrl.searchParams.set("perms", allowed ? "true" : "false");
    redirectUrl.searchParams.set(
      "user",
      encodeURIComponent(JSON.stringify({
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar
      }))
    );

    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error(err);
    res.send("An error occurred");
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
