const http = require("node:http");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.READER_BIND_HOST || process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const clients = new Map();

function safeJsonParse(value) {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

function shouldReceive(client, event) {
  if (!event.storyId) return true;
  if (!client.storyIds || client.storyIds.size === 0) return true;
  return client.storyIds.has(event.storyId);
}

app.prepare().then(() => {
  const server = http.createServer((request, response) => {
    handle(request, response);
  });

  const wss = new WebSocketServer({ noServer: true });

  globalThis.__readerBroadcast = (event) => {
    const payload = {
      type: event.type || "notification_update",
      createdAt: event.createdAt || new Date().toISOString(),
      ...event
    };
    let delivered = 0;

    for (const [socket, client] of clients) {
      if (shouldReceive(client, payload) && sendJson(socket, payload)) delivered += 1;
    }

    return delivered;
  };

  globalThis.__readerBroadcastMeta = () => ({
    clients: clients.size,
    dev
  });

  wss.on("connection", (socket) => {
    clients.set(socket, {
      userId: null,
      storyIds: new Set(),
      alive: true
    });

    sendJson(socket, {
      type: "connected",
      createdAt: new Date().toISOString()
    });

    socket.on("pong", () => {
      const client = clients.get(socket);
      if (client) client.alive = true;
    });

    socket.on("message", (data) => {
      const message = safeJsonParse(data);
      if (!message || message.type !== "subscribe") return;

      const storyIds = Array.isArray(message.storyIds)
        ? message.storyIds.filter((item) => typeof item === "string")
        : [];

      clients.set(socket, {
        userId: typeof message.userId === "string" ? message.userId : null,
        storyIds: new Set(storyIds),
        alive: true
      });

      sendJson(socket, {
        type: "subscribed",
        scope: message.scope || "reader_updates",
        storyIds,
        createdAt: new Date().toISOString()
      });
    });

    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  const heartbeat = setInterval(() => {
    for (const [socket, client] of clients) {
      if (!client.alive) {
        clients.delete(socket);
        socket.terminate();
        continue;
      }
      client.alive = false;
      socket.ping();
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeat));

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "/", `http://${request.headers.host}`);
    if (pathname !== "/reader-ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Story reader ready on http://${hostname}:${port}`);
    console.log(`> WebSocket ready on ws://${hostname}:${port}/reader-ws`);
    if (!dev && !process.env.READER_REALTIME_TOKEN) {
      console.warn(
        "> WARN: READER_REALTIME_TOKEN is unset — POST /api/realtime/broadcast will reject pipeline notifications."
      );
    }
  });
});
