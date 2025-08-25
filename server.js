const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/oauth/discord/callback', async (req, res) => {
  const code = req.query.code;
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'https://molten-f0o7.onrender.com/oauth/discord/callback'
  });

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: params,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });

  const data = await tokenRes.json();
  const userRes = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });
  const user = await userRes.json();

  // send minimal safe info to client
  res.json({ username: user.username, avatar: user.avatar, discriminator: user.discriminator });
});

app.listen(process.env.PORT || 3000);
