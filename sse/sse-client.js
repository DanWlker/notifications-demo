let replayEs = null;

function log(logId, msg, cls) {
  const el = document.getElementById(logId);
  const p = document.createElement("p");
  p.className = cls || "";
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function setState(stateId, data) {
  document.getElementById(stateId).textContent = `state: ${JSON.stringify(data)}`;
}

// --- Pattern 1: Replay ---
function startReplay() {
  if (replayEs) replayEs.close();
  log("replay-log", "Connecting...", "reconnect");
  replayEs = new EventSource("/events/replay");

  replayEs.addEventListener("snapshot", (e) => {
    const data = JSON.parse(e.data);
    setState("replay-state", data);
    log("replay-log", `SNAPSHOT received: ${e.data}`, "snapshot");
  });

  replayEs.addEventListener("update", (e) => {
    const data = JSON.parse(e.data);
    setState("replay-state", data);
    log("replay-log", `UPDATE id=${e.lastEventId}: ${e.data}`, "update");
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
