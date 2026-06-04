import express from "express";
import { readFileSync } from "fs";

const app = express();
const PORT = 3000;

// --- Shared state ---
const ROWS = [
  { id: 1, name: "Order #1001", status: "pending" },
  { id: 2, name: "Order #1002", status: "pending" },
  { id: 3, name: "Order #1003", status: "pending" },
  { id: 4, name: "Order #1004", status: "pending" },
  { id: 5, name: "Order #1005", status: "pending" },
  { id: 6, name: "Order #1006", status: "ready" },
  { id: 7, name: "Order #1007", status: "ready" },
  { id: 8, name: "Order #1008", status: "ready" },
  { id: 9, name: "Order #1009", status: "ready" },
  { id: 10, name: "Order #1010", status: "ready" },
];

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
  console.log(`[event] id=${id} type=${type} data=${JSON.stringify(data)}`);

  for (const client of clients) {
    sendEvent(client.res, entry);
  }
}

function sendEvent(res, { id, type, data }) {
  res.write(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- Cycle row statuses every 3s ---
let cycleIndex = 0;
setInterval(() => {
  const row = ROWS[cycleIndex % ROWS.length];
  row.status = row.status === "pending" ? "ready" : "pending";
  broadcast("update", { id: row.id, status: row.status });
  cycleIndex++;
}, 3000);

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

  if (lastId > 0 && lastId < eventIdCounter) {
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
    const snapshotEntry = { id, type: "snapshot", data: ROWS };
    eventLog.push(snapshotEntry);
    console.log(`[event] id=${id} type=snapshot data=${JSON.stringify(ROWS)}`);
    sendEvent(res, snapshotEntry);
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
