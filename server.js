import express from "express";
import fetch from "node-fetch";
import session from "express-session";

const app = express();

// Discord OAuth
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://molten-f0o7.onrender.com/oauth/discord/callback";

// Allowed users
const allowedUsers = [
  "slimefroster#0"
];

// Use session to store Discord user data securely
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" } // HTTPS only in prod
}));

app.get("/", (req, res) => {
  res.send("Server running");
});

// Discord OAuth callback
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

    // Fix avatar URL
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "https://i.ibb.co/wZpCg9HX/default-avatar-profile-icon-social-600nw-1677509740-removebg-preview-2.png";

    // Store user in session
    req.session.discordUser = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: avatarUrl,
      allowed: allowedUsers.includes(`${user.username}#${user.discriminator}`)
    };

    res.redirect("/game"); // redirect to your game page
  } catch (err) {
    console.error(err);
    res.send("An error occurred");
  }
});

// Endpoint for client to get user info
app.get("/api/user", (req, res) => {
  if (!req.session.discordUser) return res.status(401).json({ error: "Not logged in" });
  res.json(req.session.discordUser);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Failed to log out");
    res.redirect("/"); // or wherever you want
  });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
