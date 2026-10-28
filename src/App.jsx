import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function initials(name = "?") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "TODAY";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const connection = io(SERVER_URL, { autoConnect: true, reconnection: true });
    setSocket(connection);

    connection.on("connect", () => {
      setConnected(true);
      setError("");
    });
    connection.on("disconnect", () => setConnected(false));
    connection.on("connect_error", () => {
      setConnected(false);
      setError("Can't connect to the server. Make sure the backend is running.");
    });
    connection.on("joined_chat", (data) => {
      setUsername(data.username);
      setJoined(true);
      setError("");
      setMobileChat(true);
    });
    connection.on("join_error", (message) => setError(message));
    connection.on("chat_error", (message) => setError(message));
    connection.on("chat_history", (history) => setMessages(history));
    connection.on("chat_message", (message) => {
      setMessages((current) => [...current, message]);
    });
    connection.on("system_message", (message) => {
      setMessages((current) => [...current, message]);
    });
    connection.on("user_list", (list) => setUsers(list));

    return () => connection.disconnect();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (joined) inputRef.current?.focus();
  }, [joined]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => user.username.toLowerCase().includes(term));
  }, [users, search]);

  function joinChat(event) {
    event.preventDefault();
    setError("");
    if (!nameInput.trim()) {
      setError("Enter your name to join the chat.");
      return;
    }
    if (!socket?.connected) {
      setError("The server is offline. Start the backend and try again.");
      return;
    }
    socket.emit("join_chat", nameInput.trim());
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !socket || !joined) return;
    socket.emit("chat_message", text);
    setDraft("");
    inputRef.current?.focus();
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }

  return (
    <main className="app-shell">
      {!joined && (
        <div className="join-overlay">
          <div className="join-card">
            <div className="brand-mark large"><ChatIcon /></div>
            <p className="eyebrow">REAL-TIME MESSAGING</p>
            <h1>Good conversations<br /><span>start here.</span></h1>
            <p className="join-description">Join the room and catch up with everyone, instantly.</p>
            <div className={`server-status ${connected ? "is-online" : "is-offline"}`}>
              <span className="status-dot" />
              {connected ? "Chat server connected" : "Connecting to chat server…"}
            </div>
            <form onSubmit={joinChat} className="join-form">
              <label htmlFor="username">Your display name</label>
              <input
                id="username"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="e.g. Mercy"
                maxLength={24}
                autoComplete="nickname"
                autoFocus
              />
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" type="submit" disabled={!connected}>
                Join the conversation <ArrowIcon />
              </button>
            </form>
            <p className="privacy-note"><LockIcon /> A classroom chat demo. Messages are kept in server memory.</p>
          </div>
          <div className="join-decoration decoration-one" />
          <div className="join-decoration decoration-two" />
        </div>
      )}

      <section className={`chat-app ${joined ? "is-visible" : "is-hidden"}`}>
        <aside className={`sidebar ${mobileChat ? "mobile-hidden" : ""}`}>
          <div className="sidebar-top">
            <div className="brand-lockup">
              <div className="brand-mark"><ChatIcon /></div>
              <div><strong>connect<span>.</span></strong><small>your people, in real time</small></div>
            </div>
            <div className="profile-chip">
              <div className="avatar my-avatar">{initials(username)}</div>
              <div className="profile-copy"><strong>{username || "Your profile"}</strong><span><i /> You are online</span></div>
              <button className="icon-button" title="About this project" onClick={() => setShowInfo(true)}><InfoIcon /></button>
            </div>
          </div>

          <div className="sidebar-heading">
            <div><span className="section-kicker">YOUR SPACE</span><h2>People <span className="count-pill">{users.length}</span></h2></div>
            <span className="online-label"><i /> LIVE</span>
          </div>

          <div className="search-box">
            <SearchIcon />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a person..." aria-label="Find a person" />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </div>

          <div className="people-list">
            {filteredUsers.map((user, index) => (
              <div className={`person-row ${user.username === username ? "selected" : ""}`} key={user.id}>
                <div className={`avatar avatar-color-${index % 5}`}>{initials(user.username)}<i /></div>
                <div className="person-copy"><strong>{user.username}{user.username === username ? " (You)" : ""}</strong><span>{user.username === username ? "Ready to chat" : "Online now"}</span></div>
                <span className="person-status" />
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="empty-people">No people found.</div>}
          </div>

          <div className="sidebar-footer">
            <div className="secure-icon"><ShieldIcon /></div>
            <div><strong>Room is active</strong><span>Messages travel in real time</span></div>
            <span className="footer-pulse" />
          </div>
        </aside>

        <section className={`conversation ${mobileChat ? "mobile-visible" : ""}`}>
          <header className="conversation-header">
            <button className="back-button" onClick={() => setMobileChat(false)} aria-label="Back to people"><BackIcon /></button>
            <div className="room-avatar"><ChatIcon /></div>
            <div className="room-heading"><h2>General chat</h2><p><span className="online-dot" /> {users.length} {users.length === 1 ? "person" : "people"} here <span className="header-divider">·</span> Everyone can join</p></div>
            <div className="header-actions">
              <div className={`connection-pill ${connected ? "connected" : ""}`}><span />{connected ? "Connected" : "Reconnecting"}</div>
              <button className="icon-button header-info" title="About this project" onClick={() => setShowInfo(true)}><InfoIcon /></button>
            </div>
          </header>

          <div className="conversation-banner">
            <span className="banner-lock"><LockIcon /></span>
            <p><strong>Welcome to your space.</strong> Keep it kind, keep it connected.</p>
            <span className="banner-sparkle">✳</span>
          </div>

          <div className="messages-area">
            <div className="date-divider"><span /> <label>LIVE CONVERSATION</label> <span /></div>
            {messages.map((message) => {
              if (message.type === "system") {
                return <div className="system-message" key={message.id}><span>{message.text}</span></div>;
              }
              const mine = message.username === username;
              return (
                <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>
                  {!mine && <div className="message-avatar">{initials(message.username)}</div>}
                  <div className="message-content">
                    {!mine && <span className="message-author">{message.username}</span>}
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      <span className="message-time">{formatTime(message.time)} {mine && <DoubleCheckIcon />}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-chat-icon"><ChatIcon /></div>
                <h3>Your conversation starts here</h3>
                <p>Say hello to everyone in the room.</p>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {error && joined && <div className="inline-error"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

          <form className="composer" onSubmit={sendMessage}>
            <div className="composer-inner">
              <div className="composer-lock"><LockIcon /></div>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={connected ? "Write a message..." : "Reconnecting to the server…"}
                maxLength={1000}
                disabled={!connected}
                aria-label="Write a message"
              />
              <span className="character-count">{draft.length > 800 ? `${draft.length}/1000` : ""}</span>
              <button className="send-button" type="submit" disabled={!draft.trim() || !connected} aria-label="Send message"><SendIcon /></button>
            </div>
            <div className="composer-hint"><span><kbd>Enter</kbd> to send <span className="hint-dot">·</span> <kbd>Shift + Enter</kbd> for a new line</span><span className="powered-by"><span className="powered-dot" /> LIVE &amp; IN SYNC</span></div>
          </form>
        </section>
      </section>

      {showInfo && (
        <div className="modal-backdrop" onClick={() => setShowInfo(false)}>
          <div className="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInfo(false)} aria-label="Close">×</button>
            <div className="brand-mark large"><ChatIcon /></div>
            <p className="eyebrow">OPERATING SYSTEMS MICRO PROJECT</p>
            <h2 id="info-title">Multithreaded Chat Application</h2>
            <p>This real-time group chat uses React for the interface, Socket.IO for live communication, and a dedicated Node.js worker thread to validate and normalize messages outside the main server thread.</p>
            <div className="tech-tags"><span>React</span><span>Socket.IO</span><span>Node.js</span><span>Worker Threads</span></div>
            <div className="modal-note"><ShieldIcon /><span>Demo note: messages are stored in memory and reset when the server restarts. This is a learning project, not a production-secure messenger.</span></div>
          </div>
        </div>
      )}
    </main>
  );
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.4 8.4 0 0 1-8.8 8.4 9.3 9.3 0 0 1-3.5-.7L3 20l1.1-4.7a8.1 8.1 0 0 1-1.3-4.3A8.5 8.5 0 0 1 11.5 2.5h.3a8.4 8.4 0 0 1 8.7 8.7v.3Z" /><path d="M7.5 11.5h.01M12 11.5h.01M16.5 11.5h.01" /></svg>;
}
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>; }
function InfoIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>; }
function SendIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>; }
function BackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>; }
function DoubleCheckIcon() { return <svg className="double-check" viewBox="0 0 16 12" aria-hidden="true"><path d="m1 6 3 3 6-6M6 6l3 3 6-6" /></svg>; }
