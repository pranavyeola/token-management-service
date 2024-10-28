const Redis = require('ioredis');
const axios = require('axios');
require("dotenv").config();
const redisClient = new Redis();
const config = require('./config.json');
const API_URL = process.env.BASE_URL || 'http://localhost:3000'; 

async function showCurrentKeys() {
  console.log('Current Redis Keys:');
  const availableTokens = await redisClient.smembers('available_tokens');
  const tokenOwners = await redisClient.hgetall('token_owners');
  console.log('available_tokens:', availableTokens);
  console.log('token_owners:', tokenOwners);
}

// 1. Generate tokens
async function generateTokens(numTokens) {
  console.log('--- Generating Tokens ---');
  for (let i = 0; i < numTokens; i++) {
    try{
    const response = await axios.post(`${API_URL}/generate-token`);
    console.log('Generated Token:', response.data.token);
    }catch(error) {
        console.error(error);
  }}
  await showCurrentKeys();
}

// 2. Assign a token to a client
async function assignToken(clientId) {
  console.log('--- Assigning Token ---');
  const response = await axios.post(`${API_URL}/assign-token`, { client_id: clientId });
  if (response.status === 200) {
    console.log('Assigned Token:', response.data.token);
  } else {
    console.log('Error:', response.data.message);
  }
  await showCurrentKeys();
  return response.data.token;
}

// 3. Keep the token alive
async function keepAlive(token, clientId) {
  console.log('--- Keeping Token Alive ---');
  const response = await axios.post(`${API_URL}/keep-alive`, { token:token, client_id: clientId });
  if (response.status === 200) {
    console.log('Keep-Alive Response:', response.data.message);
  } else {
    console.log('Error:', response.data.message);
  }
  await showCurrentKeys();
}

// 4. Unblock a token
async function unblockToken(token) {
  console.log('--- Unblocking Token ---');
  const response = await axios.post(`${API_URL}/unblock-token`, { token });
  console.log(response.data.message);
  await showCurrentKeys();
}

// 5. Delete a token
async function deleteToken(token) {
  console.log('--- Deleting Token ---');
  const response = await axios.delete(`${API_URL}/delete-token`, { data: { token } });
  console.log(response.data.message);
  await showCurrentKeys();
}

// Main function to run the tests
async function runClientTests() {
  //1. Generate a pool of tokens
  await generateTokens(5);

//   2. Assign tokens to clients
  let token1 = await assignToken('client_1'); // Assuming a client ID is provided
  let token2 = await assignToken('client_2');

  await keepAlive(token1, 'client_1'); 

  await unblockToken(token1); 

  await deleteToken(token1);
}

runClientTests().catch(err => {
  console.error('Error in client operations:', err);
}).finally(() => {
  redisClient.quit();
});
