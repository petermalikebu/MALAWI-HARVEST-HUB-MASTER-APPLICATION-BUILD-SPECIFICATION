import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface ClientConnection {
  ws: WebSocket;
  uid?: string;
  role?: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientConnection>();

export function setupRealtimeServer(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: ClientConnection = { ws };
    clients.add(client);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth') {
          client.uid = data.uid;
          client.role = data.role;
        }
      } catch (err) {
        // ignore parse error
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', () => {
      clients.delete(client);
    });

    // Send initial ping to verify connection
    ws.send(JSON.stringify({ type: 'connected', message: 'Malawi Harvest Hub Realtime Connected' }));
  });

  return wss;
}

export function broadcastEvent(type: string, data: any) {
  if (!wss) return;
  const payload = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to broadcast event to client:', err);
      }
    }
  }
}
