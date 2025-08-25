import express from 'express';

const app = express();

// Discord OAuth callback route
app.get('/oauth/discord/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://molten-f0o7.onrender.com/oauth/discord/callback'
    });

    // Get access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.status}`);

    const data = await tokenRes.json();

    // Get user info
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });

    if (!userRes.ok) throw new Error(`User request failed: ${userRes.status}`);

    const user = await userRes.json();

    // Send minimal info to client
    res.json({
      username: user.username,
      avatar: user.avatar,
      discriminator: user.discriminator
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth callback failed');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
