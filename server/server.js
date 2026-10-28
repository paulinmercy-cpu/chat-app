import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MAX_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 1000;

const app = express();
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Connect Chat Server",
    workerThreads: 1
  });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// A dedicated worker performs message validation/normalization off the main thread.
const messageWorker = new Worker(new URL("./message-worker.js", import.meta.url));
let nextTaskId = 1;
const pendingMessages = new Map();

messageWorker.on("message", (result) => {
  const task = pendingMessages.get(result.taskId);
  pendingMessages.delete(result.taskId);

  if (!task) return;

  if (!result.ok) {
    task.socket.emit("chat_error", result.error || "Message could not be processed.");
    return;
  }

  const chatMessage = {
    id: `${Date.now()}-${result.taskId}`,
    username: task.username,
    text: result.text,
    time: new Date().toISOString(),
    type: "message"
  };

  history.push(chatMessage);
  if (history.length > MAX_HISTORY) history.shift();

  // Broadcast to everyone in the chat room, including the sender.
  io.to("general").emit("chat_message", chatMessage);
});

messageWorker.on("error", (error) => {
  console.error("Message worker error:", error);
});

messageWorker.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Message worker stopped with exit code ${code}`);
  }
});

const users = new Map(); // socket.id -> username
const history = [];

function sendUserList() {
  const userList = [...users.entries()].map(([id, username]) => ({ id, username }));
  io.to("general").emit("user_list", userList);
}

function addSystemMessage(text) {
  const item = {
    id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    time: new Date().toISOString(),
    type: "system"
  };
  history.push(item);
  if (history.length > MAX_HISTORY) history.shift();
  io.to("general").emit("system_message", item);
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_chat", (rawName) => {
    if (users.has(socket.id)) return;

    const username = String(rawName ?? "")
      .replace(/[\r\n\t]/g, " ")
      .trim()
      .slice(0, 24);

    if (!username) {
      socket.emit("chat_error", "Please enter a username.");
      return;
    }

    const duplicate = [...users.values()].some(
      (name) => name.toLowerCase() === username.toLowerCase()
    );

    if (duplicate) {
      socket.emit("join_error", "That username is already in use. Please choose another.");
      return;
    }

    users.set(socket.id, username);
    socket.join("general");
    socket.emit("chat_history", history);
    socket.emit("joined_chat", { id: socket.id, username });
    addSystemMessage(`${username} joined the chat`);
    sendUserList();

    console.log(`${username} joined (${socket.id})`);
  });

  socket.on("chat_message", (rawText) => {
    const username = users.get(socket.id);
    if (!username) {
      socket.emit("chat_error", "Join the chat before sending messages.");
      return;
    }

    const text = String(rawText ?? "").trim();
    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      socket.emit("chat_error", `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    const taskId = nextTaskId++;
    pendingMessages.set(taskId, { socket, username });
    messageWorker.postMessage({ taskId, text, maxLength: MAX_MESSAGE_LENGTH });
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      addSystemMessage(`${username} left the chat`);
      sendUserList();
      console.log(`${username} disconnected`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log("======================================");
  console.log(" CONNECT — MULTITHREADED CHAT SERVER ");
  console.log(` Server: http://localhost:${PORT}`);
  console.log(` Client origin: ${CLIENT_ORIGIN}`);
  console.log(" Message worker thread: running");
  console.log("======================================");
});
