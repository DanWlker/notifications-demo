import { WebSocketServer } from "ws";
import { readFileSync } from "fs";
import express from "express";
import { createServer } from "http";

const PORT = 4000;

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

let eventLog = [];
let eventIdCounter = 0;
const clients = new Set();

function nextId() {
  return ++eventIdCounter;
}

function broadcast(type, data) {
  const id = nextId();
  const entry = { id, type, data };
  eventLog.push(entry);
  if (eventLog.length > 100) eventLog.shift();
  console.log(`[event] id=${id} type=${type} data=${JSON.stringify(data)}`);

  const msg = JSON.stringify(entry);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

// Cycle one row at a time every 3s
let cycleIndex = 0;
setInterval(() => {
  const row = ROWS[cycleIndex % ROWS.length];
  row.status = row.status === "pending" ? "ready" : "pending";
  broadcast("update", { id: row.id, status: row.status });
  cycleIndex++;
}, 3000);

// HTTP server for serving the client HTML/JS
const app = express();

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(readFileSync("./ws/ws-client.html"));
});

app.get("/ws-client.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(readFileSync("./ws/ws-client.js"));
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  console.log("[ws] client connected, sending snapshot");
  const id = nextId();
  const snapshotEntry = { id, type: "snapshot", data: ROWS };
  eventLog.push(snapshotEntry);
  console.log(`[event] id=${id} type=snapshot data=${JSON.stringify(ROWS)}`);
  ws.send(JSON.stringify(snapshotEntry));

  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
    console.log("[ws] client disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
