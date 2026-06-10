let client = null;
let unsubscribe = null;

function log(msg, cls) {
  const el = document.getElementById("gql-log");
  const p = document.createElement("p");
  p.className = cls || "";
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function renderTable(rows) {
  const tbody = document.getElementById("gql-tbody");
  tbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.id = `row-${row.id}`;
    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.name}</td>
      <td class="status-${row.status}">${row.status}</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateRow(id, status) {
  const tr = document.getElementById(`row-${id}`);
  if (!tr) return;
  const td = tr.querySelector("td:last-child");
  td.className = `status-${status}`;
  td.textContent = status;
}

function connect() {
  if (unsubscribe) unsubscribe();
  if (client) client.dispose();

  log("Connecting...", "reconnect");

  client = graphqlWs.createClient({
    url: `ws://${location.host}/graphql`,
  });

  unsubscribe = client.subscribe(
    {
      query: `subscription {
        orderEvents {
          type
          orders { id name status }
          order { id status }
        }
      }`,
    },
    {
      next({ data }) {
        const { type, orders, order } = data.orderEvents;
        if (type === "snapshot") {
          renderTable(orders);
          log(`SNAPSHOT received: ${orders.length} rows`, "snapshot");
        } else if (type === "update") {
          updateRow(order.id, order.status);
          log(`UPDATE: row ${order.id} → ${order.status}`, "update");
        }
      },
      error(err) {
        log(`Error: ${err}`, "reconnect");
      },
      complete() {
        log("Subscription complete", "reconnect");
      },
    },
  );

  log("Subscribed", "reconnect");
}

function disconnect() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (client) {
    client.dispose();
    client = null;
  }
  log("Disconnected manually", "reconnect");
}
