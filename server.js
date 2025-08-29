import express from "express";
import fetch from "node-fetch";

const app = express();

// Discord OAuth
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://molten-f0o7.onrender.com/oauth/discord/callback";

app.use(express.json());
app.use(express.static("public")); // serve static client files

// Allowed users
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
    redirect_uri: REDIRECT_URI
  });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.send("Failed to get access token");

    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "https://i.ibb.co/wZpCg9HX/default-avatar-profile-icon-social-600nw-1677509740-removebg-preview-2.png";

    // Build a user object to send to client
    const discordUser = {
      id: user.id,
      username: user.username,
      avatar: avatarUrl,
      allowed: allowedUsers.includes(user.username)
    };

    // Send an HTML page that stores user info in localStorage and redirects to game
    res.send(`
      <script>
        localStorage.setItem("discordUser", "${JSON.stringify(discordUser).replace(/"/g,'\\"')}");
        window.location.href = "/game";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.send("An error occurred");
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
