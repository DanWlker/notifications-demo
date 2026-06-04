let ws = null;

function log(msg, cls) {
  const el = document.getElementById("ws-log");
  const p = document.createElement("p");
  p.className = cls || "";
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function renderTable(rows) {
  const tbody = document.getElementById("ws-tbody");
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
  if (ws) ws.close();
  log("Connecting...", "reconnect");
  ws = new WebSocket(`ws://${location.host}`);

  ws.addEventListener("open", () => {
    log("Connected", "reconnect");
  });

  ws.addEventListener("message", (e) => {
    const { id, type, data } = JSON.parse(e.data);
    if (type === "snapshot") {
      renderTable(data);
      log(`SNAPSHOT received: ${data.length} rows`, "snapshot");
    } else if (type === "update") {
      updateRow(data.id, data.status);
      log(`UPDATE id=${id}: row ${data.id} → ${data.status}`, "update");
    }
  });

  ws.addEventListener("close", () => {
    log("Connection closed", "reconnect");
  });

  ws.addEventListener("error", () => {
    log("WebSocket error", "reconnect");
  });
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    log("Disconnected manually", "reconnect");
  }
}
