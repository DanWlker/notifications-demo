const { useState, useEffect, useRef, useCallback } = React;

function OrderTable({ orders }) {
  if (!orders) {
    return (
      <tr>
        <td colSpan="3" style={{ color: "#777" }}>
          (not connected)
        </td>
      </tr>
    );
  }
  return orders.map((order) => (
    <tr key={order.id}>
      <td>{order.id}</td>
      <td>{order.name}</td>
      <td className={"status-" + order.status}>{order.status}</td>
    </tr>
  ));
}

function Log({ messages }) {
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="log" ref={logRef}>
      {messages.map((msg, i) => (
        <p key={i} className={msg.cls}>
          {msg.text}
        </p>
      ))}
    </div>
  );
}

function App() {
  const [orders, setOrders] = useState(null);
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const addLog = useCallback((msg, cls) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { text: "[" + time + "] " + msg, cls: cls || "" }]);
  }, []);

  const connect = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    if (clientRef.current) clientRef.current.dispose();

    addLog("Connecting...", "reconnect");

    const client = graphqlWs.createClient({
      url: "ws://" + location.host + "/graphql",
    });
    clientRef.current = client;

    const unsubscribe = client.subscribe(
      {
        query:
          "subscription {\n        orderEvents {\n          type\n          orders { id name status }\n          order { id status }\n        }\n      }",
      },
      {
        next({ data }) {
          const { type, orders, order } = data.orderEvents;
          if (type === "snapshot") {
            setOrders(orders);
            addLog("SNAPSHOT received: " + orders.length + " rows", "snapshot");
          } else if (type === "update") {
            setOrders((prev) =>
              prev.map((r) => (r.id === order.id ? { ...r, status: order.status } : r)),
            );
            addLog("UPDATE: row " + order.id + " \u2192 " + order.status, "update");
          }
        },
        error(err) {
          addLog("Error: " + err, "reconnect");
        },
        complete() {
          addLog("Subscription complete", "reconnect");
        },
      },
    );
    unsubscribeRef.current = unsubscribe;
    setConnected(true);
    addLog("Subscribed", "reconnect");
  }, [addLog]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.dispose();
      clientRef.current = null;
    }
    setConnected(false);
    addLog("Disconnected manually", "reconnect");
  }, [addLog]);

  return (
    <div>
      <h1>GraphQL-WS Demo (React)</h1>
      <div className="box">
        <h2>Order Status</h2>
        <p>
          Server pushes a full snapshot on subscribe, then cycles row statuses every 3s via GraphQL
          subscription.
        </p>
        <button onClick={connect} disabled={connected}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!connected}>
          Disconnect
        </button>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <OrderTable orders={orders} />
          </tbody>
        </table>
        <Log messages={logs} />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
