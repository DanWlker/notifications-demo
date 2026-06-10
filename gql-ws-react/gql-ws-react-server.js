import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import { readFileSync } from "fs";
import express from "express";
import { createServer } from "http";

const PORT = 5000;

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

// Simple pub/sub
const subscribers = new Set();

function publish(event) {
  for (const emit of subscribers) emit(event);
}

// Cycle one row at a time every 3s
let cycleIndex = 0;
setInterval(() => {
  const row = ROWS[cycleIndex % ROWS.length];
  row.status = row.status === "pending" ? "ready" : "pending";
  console.log(`[event] type=update id=${row.id} status=${row.status}`);
  publish({ type: "update", order: { id: row.id, status: row.status } });
  cycleIndex++;
}, 3000);

const typeDefs = /* GraphQL */ `
  type Order {
    id: Int!
    name: String!
    status: String!
  }

  type OrderUpdate {
    id: Int!
    status: String!
  }

  type OrderEvent {
    type: String!
    orders: [Order!]
    order: OrderUpdate
  }

  type Query {
    orders: [Order!]!
  }

  type Subscription {
    orderEvents: OrderEvent!
  }
`;

const resolvers = {
  Query: {
    orders: () => ROWS,
  },
  Subscription: {
    orderEvents: {
      subscribe: async function*() {
        // Send snapshot immediately
        console.log("[gql-ws] subscriber connected, sending snapshot");
        yield { orderEvents: { type: "snapshot", orders: ROWS, order: null } };

        // Then stream live updates
        yield* (async function*() {
          let resolve;
          let queue = [];
          const emit = (event) => {
            queue.push(event);
            if (resolve) {
              resolve();
              resolve = null;
            }
          };
          subscribers.add(emit);
          try {
            while (true) {
              if (queue.length === 0) {
                await new Promise((r) => (resolve = r));
              }
              while (queue.length > 0) {
                yield { orderEvents: queue.shift() };
              }
            }
          } finally {
            subscribers.delete(emit);
            console.log("[gql-ws] subscriber disconnected");
          }
        })();
      },
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(readFileSync("./gql-ws-react/gql-ws-react-client.html"));
});

app.get("/gql-ws-react-client.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(readFileSync("./gql-ws-react/gql-ws-react-client.js"));
});

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: "/graphql" });
useServer({ schema }, wss);

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`GraphQL WS at ws://localhost:${PORT}/graphql`);
});
