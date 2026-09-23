import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  userId: string;
  role: string;
  companyId: string;
}

const clients: Map<string, SSEClient> = new Map();

export function addSSEClient(id: string, res: Response, userId: string, role: string, companyId: string) {
  clients.set(id, { id, res, userId, role, companyId });

  // Heartbeat every 25 seconds to keep connection alive
  const timer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(timer);
      clients.delete(id);
    }
  }, 25000);

  res.on('close', () => {
    clearInterval(timer);
    clients.delete(id);
  });
}

export function broadcastChange(event: {
  type: string;
  siteId?: string;
  action: string;
  data?: any;
}) {
  const payload = `event: change\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch (e) {
      clients.delete(client.id);
    }
  }
}
