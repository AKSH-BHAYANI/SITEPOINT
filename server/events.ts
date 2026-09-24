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
  companyId: string;
  siteId?: string;
  action: string;
  data?: any;
}) {
  const targetCompanyId = event.companyId;
  if (!targetCompanyId) {
    return;
  }
  const payload = `event: change\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients.values()) {
    // Tenant isolation: deliver event only to clients of the matching company
    if (client.companyId !== targetCompanyId) {
      continue;
    }
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}
