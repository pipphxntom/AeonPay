import { WebSocketServer, WebSocket } from 'ws';
import { Request, Response } from 'express';
import { Server } from 'http';

// Realtime transport configuration
const RT_CONFIG = {
  heartbeatInterval: 20000, // 20 seconds
  maxConnections: 1000,
  transport: process.env.RT_TRANSPORT || 'ws' // 'ws' | 'sse'
};

interface WSClient {
  id: string;
  userId?: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastHeartbeat: number;
}

interface SSEClient {
  id: string;
  userId?: string;
  res: Response;
  subscriptions: Set<string>;
  lastHeartbeat: number;
}

class RealtimeManager {
  private wss?: WebSocketServer;
  private wsClients: Map<string, WSClient> = new Map();
  private sseClients: Map<string, SSEClient> = new Map();
  private channels: Map<string, Set<string>> = new Map(); // topic -> client IDs
  private heartbeatTimer?: NodeJS.Timer;

  setupWebSocket(server: Server): void {
    if (RT_CONFIG.transport !== 'ws') return;

    this.wss = new WebSocketServer({ 
      server,
      path: '/rt/ws',
      maxPayload: 16 * 1024 // 16KB max message size
    });

    this.wss.on('connection', (ws: WebSocket, req: Request) => {
      const clientId = this.generateClientId();
      const client: WSClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastHeartbeat: Date.now()
      };

      this.wsClients.set(clientId, client);
      console.log(`[RT] WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        clientId,
        heartbeatInterval: RT_CONFIG.heartbeatInterval
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch (error) {
          console.error('[RT] Invalid message from client:', error);
        }
      });

      ws.on('pong', () => {
        client.lastHeartbeat = Date.now();
      });

      ws.on('close', () => {
        this.removeClient(clientId);
        console.log(`[RT] WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`[RT] WebSocket error for client ${clientId}:`, error);
        this.removeClient(clientId);
      });
    });

    // Start heartbeat monitoring
    this.startHeartbeat();
  }

  setupSSE(app: any): void {
    app.get('/rt/stream', async (req: Request, res: Response) => {
      // Require authentication for SSE
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required for realtime stream' });
      }

      const clientId = this.generateClientId();
      
      // Setup SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const client: SSEClient = {
        id: clientId,
        userId,
        res,
        subscriptions: new Set(),
        lastHeartbeat: Date.now()
      };

      this.sseClients.set(clientId, client);
      console.log(`[RT] SSE client connected: ${clientId}, user: ${userId}`);

      // Send initial connection event
      this.sendSSEEvent(client, 'connected', {
        clientId,
        heartbeatInterval: RT_CONFIG.heartbeatInterval
      });

      // Auto-subscribe to user-specific topics
      this.subscribe(clientId, `user:${userId}`);

      req.on('close', () => {
        this.removeClient(clientId);
        console.log(`[RT] SSE client disconnected: ${clientId}`);
      });
    });
  }

  private handleClientMessage(client: WSClient, message: any): void {
    switch (message.type) {
      case 'auth':
        client.userId = message.userId;
        this.subscribe(client.id, `user:${message.userId}`);
        break;
      
      case 'subscribe':
        if (message.topic) {
          this.subscribe(client.id, message.topic);
        }
        break;
      
      case 'unsubscribe':
        if (message.topic) {
          this.unsubscribe(client.id, message.topic);
        }
        break;
      
      case 'ping':
        client.lastHeartbeat = Date.now();
        this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
        break;
      
      default:
        console.warn('[RT] Unknown message type:', message.type);
    }
  }

  private subscribe(clientId: string, topic: string): void {
    const client = this.wsClients.get(clientId) || this.sseClients.get(clientId);
    if (!client) return;

    client.subscriptions.add(topic);
    
    if (!this.channels.has(topic)) {
      this.channels.set(topic, new Set());
    }
    this.channels.get(topic)!.add(clientId);

    console.log(`[RT] Client ${clientId} subscribed to ${topic}`);
  }

  private unsubscribe(clientId: string, topic: string): void {
    const client = this.wsClients.get(clientId) || this.sseClients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(topic);
    this.channels.get(topic)?.delete(clientId);

    console.log(`[RT] Client ${clientId} unsubscribed from ${topic}`);
  }

  // Public method to broadcast events
  broadcast(topic: string, event: string, data: any): void {
    const subscribers = this.channels.get(topic);
    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'event',
      topic,
      event,
      data,
      timestamp: Date.now()
    };

    let sent = 0;
    for (const clientId of subscribers) {
      const wsClient = this.wsClients.get(clientId);
      const sseClient = this.sseClients.get(clientId);
      
      if (wsClient && wsClient.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(wsClient, message);
        sent++;
      } else if (sseClient) {
        this.sendSSEEvent(sseClient, event, data);
        sent++;
      }
    }

    console.log(`[RT] Broadcasted ${event} to ${sent} clients on topic ${topic}`);
  }

  private sendToClient(client: WSClient, message: any): void {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[RT] Error sending to WebSocket client:', error);
    }
  }

  private sendSSEEvent(client: SSEClient, event: string, data: any): void {
    try {
      const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.res.write(eventData);
    } catch (error) {
      console.error('[RT] Error sending SSE event:', error);
    }
  }

  private removeClient(clientId: string): void {
    const wsClient = this.wsClients.get(clientId);
    const sseClient = this.sseClients.get(clientId);
    
    const client = wsClient || sseClient;
    if (!client) return;

    // Remove from all subscriptions
    for (const topic of client.subscriptions) {
      this.channels.get(topic)?.delete(clientId);
    }

    // Remove client
    this.wsClients.delete(clientId);
    this.sseClients.delete(clientId);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = RT_CONFIG.heartbeatInterval * 2; // 40 seconds timeout

      // Check WebSocket clients
      for (const [clientId, client] of this.wsClients) {
        if (now - client.lastHeartbeat > timeout) {
          console.log(`[RT] WebSocket client ${clientId} timed out`);
          client.ws.terminate();
          this.removeClient(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }

      // Send heartbeat to SSE clients
      for (const [clientId, client] of this.sseClients) {
        if (now - client.lastHeartbeat > timeout) {
          console.log(`[RT] SSE client ${clientId} timed out`);
          this.removeClient(clientId);
        } else {
          this.sendSSEEvent(client, 'heartbeat', { timestamp: now });
          client.lastHeartbeat = now;
        }
      }
    }, RT_CONFIG.heartbeatInterval);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats(): any {
    return {
      transport: RT_CONFIG.transport,
      wsClients: this.wsClients.size,
      sseClients: this.sseClients.size,
      totalChannels: this.channels.size,
      uptime: process.uptime()
    };
  }
}

export const realtimeManager = new RealtimeManager();

// Helper functions for broadcasting specific events
export function broadcastPlanUpdate(planId: string, event: string, data: any): void {
  realtimeManager.broadcast(`plan:${planId}`, event, data);
}

export function broadcastSwapUpdate(swapId: string, event: string, data: any): void {
  realtimeManager.broadcast(`swap:${swapId}`, event, data);
}

export function broadcastMerchantUpdate(merchantId: string, event: string, data: any): void {
  realtimeManager.broadcast(`merchant:${merchantId}`, event, data);
}

export function broadcastUserUpdate(userId: string, event: string, data: any): void {
  realtimeManager.broadcast(`user:${userId}`, event, data);
}