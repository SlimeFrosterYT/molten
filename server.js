import express from "express";
import fetch from "node-fetch";

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://molten-f0o7.onrender.com/oauth/discord/callback";

const allowedUsers = ["slimefroster"]; // just usernames, no #tag

app.get("/", (req, res) => res.send("Server running"));

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

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "https://i.ibb.co/wZpCg9HX/default-avatar-profile-icon-social-600nw-1677509740-removebg-preview-2.png";

    const discordUser = {
      id: user.id,
      username: user.username,
      avatar: avatarUrl,
      allowed: allowedUsers.includes(user.username),
    };

    // Send HTML to store user under a fixed key and redirect
    res.send(`
      <script>
        try {
          localStorage.setItem("discordUser", '${JSON.stringify(discordUser)}');
        } catch(e) {
          console.error("Failed to save user in localStorage", e);
        }
        window.location.href = "https://arras.io/";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.send("An error occurred");
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
