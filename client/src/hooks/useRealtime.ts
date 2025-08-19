import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';

interface RealtimeMessage {
  type: string;
  topic?: string;
  event?: string;
  data?: any;
  timestamp?: number;
}

interface RealtimeHook {
  isConnected: boolean;
  connectionType: 'ws' | 'sse' | null;
  subscribe: (topic: string, handler: (event: string, data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, event: string, data: any) => void;
  stats: {
    reconnects: number;
    messagesReceived: number;
    lastMessage?: number;
  };
}

export function useRealtime(): RealtimeHook {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'ws' | 'sse' | null>(null);
  const [stats, setStats] = useState({ reconnects: 0, messagesReceived: 0 });
  
  const wsRef = useRef<WebSocket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscriptionsRef = useRef<Map<string, (event: string, data: any) => void>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user, token } = useAuthStore();

  const connect = useCallback(() => {
    if (!token) return;

    // Try WebSocket first
    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/rt/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[RT] WebSocket connected');
        setIsConnected(true);
        setConnectionType('ws');
        wsRef.current = ws;
        
        // Authenticate
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user?.id,
          token
        }));
        
        // Re-subscribe to topics
        for (const [topic] of subscriptionsRef.current) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            topic
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[RT] Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[RT] WebSocket error:', error);
        fallbackToSSE();
      };
      
      ws.onclose = () => {
        console.log('[RT] WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Try to reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setStats(prev => ({ ...prev, reconnects: prev.reconnects + 1 }));
          connect();
        }, 3000);
      };
      
    } catch (error) {
      console.error('[RT] WebSocket connection failed:', error);
      fallbackToSSE();
    }
  }, [token, user?.id]);

  const fallbackToSSE = useCallback(() => {
    if (!token) return;
    
    console.log('[RT] Falling back to SSE');
    
    try {
      const eventSource = new EventSource(`/rt/stream`, {
        withCredentials: true
      });
      
      eventSource.onopen = () => {
        console.log('[RT] SSE connected');
        setIsConnected(true);
        setConnectionType('sse');
        eventSourceRef.current = eventSource;
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage({
            type: 'event',
            event: event.type,
            data
          });
        } catch (error) {
          console.error('[RT] Failed to parse SSE message:', error);
        }
      };
      
      // Handle specific event types
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        console.log('[RT] SSE authenticated:', data);
      });
      
      eventSource.addEventListener('heartbeat', (event) => {
        // Keep connection alive
      });
      
      eventSource.onerror = (error) => {
        console.error('[RT] SSE error:', error);
        setIsConnected(false);
        eventSourceRef.current = null;
        
        // Try to reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setStats(prev => ({ ...prev, reconnects: prev.reconnects + 1 }));
          connect();
        }, 5000);
      };
      
    } catch (error) {
      console.error('[RT] SSE connection failed:', error);
    }
  }, [token]);

  const handleMessage = useCallback((message: RealtimeMessage) => {
    setStats(prev => ({ 
      ...prev, 
      messagesReceived: prev.messagesReceived + 1,
      lastMessage: Date.now()
    }));
    
    if (message.type === 'event' && message.topic && message.event) {
      const handler = subscriptionsRef.current.get(message.topic);
      if (handler) {
        handler(message.event, message.data);
      }
    }
  }, []);

  const subscribe = useCallback((topic: string, handler: (event: string, data: any) => void) => {
    subscriptionsRef.current.set(topic, handler);
    
    // Subscribe via active connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        topic
      }));
    }
    // SSE auto-subscribes to user topics, others not supported yet
    
    console.log(`[RT] Subscribed to topic: ${topic}`);
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    subscriptionsRef.current.delete(topic);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
    }
    
    console.log(`[RT] Unsubscribed from topic: ${topic}`);
  }, []);

  const publish = useCallback((topic: string, event: string, data: any) => {
    // For local development - in production this would go through backend
    if (import.meta.env.DEV) {
      console.log(`[RT] Local publish: ${topic}/${event}`, data);
      const handler = subscriptionsRef.current.get(topic);
      if (handler) {
        setTimeout(() => handler(event, data), 100);
      }
    }
  }, []);

  // Connect on mount and when auth changes
  useEffect(() => {
    if (token) {
      connect();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    isConnected,
    connectionType,
    subscribe,
    unsubscribe,
    publish,
    stats
  };
}