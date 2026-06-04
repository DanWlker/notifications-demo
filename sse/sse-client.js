let replayEs = null;

function log(logId, msg, cls) {
  const el = document.getElementById(logId);
  const p = document.createElement("p");
  p.className = cls || "";
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function renderTable(rows) {
  const tbody = document.getElementById("replay-tbody");
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

// --- Pattern 1: Replay ---
function startReplay() {
  if (replayEs) replayEs.close();
  log("replay-log", "Connecting...", "reconnect");
  replayEs = new EventSource("/events/replay");

  replayEs.addEventListener("snapshot", (e) => {
    const data = JSON.parse(e.data);
    renderTable(data);
    log("replay-log", `SNAPSHOT received: ${data.length} rows`, "snapshot");
  });

  replayEs.addEventListener("update", (e) => {
    const data = JSON.parse(e.data);
    updateRow(data.id, data.status);
    log("replay-log", `UPDATE id=${e.lastEventId}: row ${data.id} → ${data.status}`, "update");
  });

  replayEs.addEventListener("open", () => {
    log("replay-log", "Connected (open event fired)", "reconnect");
  });

  replayEs.addEventListener("error", () => {
    log("replay-log", "Connection lost, browser will retry...", "reconnect");
  });
}

function stopReplay() {
  if (replayEs) {
    replayEs.close();
    replayEs = null;
    log("replay-log", "Disconnected manually", "reconnect");
  }
}
