# Token Management Service

This service provides a scalable solution for token generation, assignment, and expiration handling, built using Node.js and Redis.

## Features

- **Token Generation**: Dynamically creates tokens up to a specified limit.
- **Token Assignment**: Allocates available tokens to clients.
- **Keep-Alive**: Enables clients to keep a token assignment active by resetting its TTL.
- **Unblock & Delete Token**: Releases or permanently deletes tokens.
- **Automatic Expiration**: Tokens expire if not kept alive or used within a configured period.

---

## Prerequisites

- **Node.js** (>= 14.x)
- **Redis** (via Docker or installed locally)

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pranavyeola/token-management-service.git
```
---

### 2. Install Dependencies
```bash
npm install
```
---
### 3.Run Redis (via Docker)
```bash
docker run --name redis -p 6379:6379 -d redis
```
### 4. Configuration
Create a config.json file in the root directory to specify configurations such as token pool size and expiration settings:
```bash
{
  "databaseUrl": "redis://localhost:6379",
  "tokenPoolSize": 10,
}
```
### 5.Start the Service
```bash
PORT=<portn_no> npm start
```
# API Endpoints

## 1. POST /generate-token
Generates a unique token and adds it to the available pool, respecting the maximum pool size set in `config.json`.

### Response:
- **201 Created:** 
  ```json
  { "token": "generated_token"}
  ```
-**403 Forbidden:**
  
  Reason: Pool limit reached.

## 2. POST /assign-token
### Request Body
```json
{ "client_id": "unique_client_identifier" }
```
### Response:
- **200 Ok:** 
  ```json
  { "token": "assigned_token" }
  ```
- **404 Not Found:**
  
  Reason: No available tokens.

## 3. POST /keep-alive
Allows a client to reset the TTL on an assigned token.
### Request Body:
```json
{ "token": "assigned_token" }
```
### Response:
- **200 OK:** 
 Successful keep-alive.
- **403 Forbidden:**

  Reason: Unauthorized keep-alive attempt.


## 4. POST /unblock-token
Releases a previously assigned token.
### Request Body:
```json
{ "token": "assigned_token" }
```
### Response:
- **200 OK:** 
 Token unblocked.
- **403 Forbidden:**

  Reason: Token not assigned to any client

## 5. POST /delete-token
Permanently removes a token.
### Request Body:
```json
{ "token": "token_to_delete" }
```
### Response:
- **200 OK:** 
Token deleted successfully!
- **404 not found:**

  Reason: Token not found.

## Testing
A sample script client.js demonstrates the API operations. Run it to observe token generation, assignment, keep-alive, unblock, and deletion.
```js
// Run example script
node app/client.js
```
## Watch Testing Video 
- https://drive.google.com/file/d/1tCefYQeukQZmQb1_wotyjWBxDFzwmSoc/view?usp=sharing

## Architecture Diagram
- https://drive.google.com/file/d/1U-3u7RjNiS3oNO71PAR1HbyaLCd_CrPM/view?usp=sharing













