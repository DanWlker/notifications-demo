import express from "express";
import { readFileSync } from "fs";

const app = express();
const PORT = 3000;

// --- Shared state ---
let state = { count: 0, message: "hello" };
let eventLog = []; // { id, type, data }
let eventIdCounter = 0;
let clients = new Set();

function nextId() {
  return ++eventIdCounter;
}

function broadcast(type, data) {
  const id = nextId();
  const entry = { id, type, data };
  eventLog.push(entry);
  // keep last 100 events
  if (eventLog.length > 100) eventLog.shift();

  for (const client of clients) {
    sendEvent(client.res, entry);
  }
}

function sendEvent(res, { id, type, data }) {
  res.write(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- Mutate state every 2s ---
setInterval(() => {
  state.count++;
  state.message = `tick ${state.count}`;
  broadcast("update", { count: state.count, message: state.message });
}, 2000);

// --- Routes ---

// Serve client HTML
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(readFileSync("./sse/sse-client.html"));
});

app.get("/sse-client.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(readFileSync("./sse/sse-client.js"));
});

// Pattern 1: Last-Event-ID replay
app.get("/events/replay", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const lastId = parseInt(req.headers["last-event-id"] || "0", 10);

  if (lastId > 0) {
    // Reconnect: replay missed events
    const missed = eventLog.filter((e) => e.id > lastId);
    console.log(
      `[replay] client reconnected, replaying ${missed.length} missed events since id=${lastId}`,
    );
    for (const entry of missed) {
      sendEvent(res, entry);
    }
  } else {
    // Fresh connect: send current snapshot as first event, then stream
    console.log("[replay] fresh client connected, sending snapshot");
    const id = nextId();
    sendEvent(res, { id, type: "snapshot", data: state });
  }

  const client = { res };
  clients.add(client);

  req.on("close", () => {
    clients.delete(client);
    console.log("[replay] client disconnected");
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
