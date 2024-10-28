const express = require('express');
const Redis = require('ioredis');
const { promisify } = require('util');
const config = require("./config.json")
const client = new Redis();
const subscriber = new Redis();
const app = express();
const ACTIVE_TOKEN_TTL = 60; // 60 seconds
const AVAILABLE_TOKEN_TTL = 300 // 5 minutes


const PORT = 3000;


app.use(express.json());
const getAvailableTokensCount = promisify(client.scard).bind(client); // Get the count of available tokens

app.post('/generate-token', async (req, res) => {
    try {
      const availableTokensCount = await getAvailableTokensCount('available_tokens'); // Get current count
  
      // Check if the current count is less than the tokenPoolSize
      if (availableTokensCount >= config.tokenPoolSize) {
        return res.status(400).json({ message: 'Token pool size limit reached' });
      }
  
      // Generate a new token
      const token = `token_${Math.random().toString(36).substr(2, 8)}`;
      await client.set(`token:${token}`, 'available', 'EX', AVAILABLE_TOKEN_TTL); // Set token with a 5-minute expiration
      await client.sadd('available_tokens', token); // Add token to the available tokens set
  
      res.status(201).json({ token });
    } catch (err) {
      console.error('Error generating token:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

// Assign a token to a client
app.post('/assign-token', async (req, res) => {
  const clientId = req.body.client_id;
  const token = await client.spop('available_tokens');

  if (token) {
    await client.hset('token_owners', token, clientId);
    await client.set(`token:${token}`, clientId, 'EX', ACTIVE_TOKEN_TTL); // Set token TTL
    res.status(200).json({ token });
  } else {
    res.status(404).json({ message: 'No free token available' });
  }
});

// Keep the token alive
app.post('/keep-alive', async (req, res) => {
  const { token, client_id } = req.body;

  const ownerId = await client.hget('token_owners', token);
  
  if (ownerId === client_id) {
    await client.set(`token:${token}`, client_id, 'EX', ACTIVE_TOKEN_TTL); // Reset TTL
    res.status(200).json({ message: 'Token keep-alive refreshed' });
  } else {
    res.status(403).json({ message: 'Token does not belong to this client' });
  }
});

// Unblock a token (re-add to available_tokens and remove from token_owners)
app.post('/unblock-token', async (req, res) => {
  const token = req.body.token;
  await client.hdel('token_owners', token);
  await client.sadd('available_tokens', token);
  res.status(200).json({ message: 'Token unblocked' });
});

// Delete a token
app.delete('/delete-token', async (req, res) => {
    const token = req.body.token;
  
    try {
      await client.hdel('token_owners', token);
  
      const isRemovedFromAvailable = await client.srem('available_tokens', token);
  
      await client.del(`token:${token}`);
  
      if (isRemovedFromAvailable) {
        return res.status(200).json({ message: 'Token deleted from available tokens and owners.' });
      } else {
        return res.status(200).json({ message: 'Token deleted from owners but was not in available tokens.' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error deleting token' });
    }
  });
  

// Handle token expiration events
subscriber.psubscribe('__keyevent@0__:expired', (err, count) => {
  if (err) console.error('Subscription error:', err);
});

subscriber.on('pmessage', async (pattern, channel, message) => {
    // Extract the token from the message
    const token = message.split(':')[1];
    
    // Check if the message is for a token expiration
    if (message.startsWith('token:')) {
      // Determine if the token is being expired from the 60s TTL or 5 mins TTL
      const tokenOwner = await client.hget('token_owners', token);
      
      if (tokenOwner) {
        // The token was assigned and expired after 60 seconds
        await client.hdel('token_owners', token); // Remove from owners
        await client.sadd('available_tokens', token); // Re-add to available tokens
        await client.set(`token:${token}`, 'available', 'EX', AVAILABLE_TOKEN_TTL); 
        console.log(`Token ${token} expired (60s TTL) and re-added to available pool`);
      } else {
        // The token is being expired after the 5 min TTL
        await client.srem('available_tokens', token); // Remove from available tokens
        console.log(`Token ${token} expired (5 mins TTL) and removed from available pool`);
      }
    }
  });
  

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
