# Connect — Multithreaded Web Chat Application

A learning-project group chat built with React, Vite, Node.js, Express, Socket.IO, and Node.js `worker_threads`.

## Requirements

- Node.js 20 or newer (LTS recommended)
- npm
- VS Code

## Install and run

Open a terminal in this project folder:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The backend runs at `http://localhost:5000`.

To test multiple users, open the site in multiple browser tabs or different browsers and enter a different username in each tab.

## Worker-thread design

`server/server.js` creates a dedicated `Worker` using `server/message-worker.js`. When a user sends a message, the main server thread sends a task to the worker. The worker normalizes and validates the message, then returns the result. The server broadcasts the processed message through Socket.IO.

Socket.IO handles live network events on the server's main event loop. The worker thread demonstrates explicit background-thread processing; it does not create one worker per user.

## Health check

Visit `http://localhost:5000/api/health`.

## Notes

- This starter project keeps chat history and active users in memory. Restarting the server clears the history.
- The default client/server configuration is for local development.
- Before public deployment, add authentication, rate limiting, persistent storage, message moderation, HTTPS, and production CORS configuration.
