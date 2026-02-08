import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface UseWebSocketOptions {
  url: string;
  onMessage: (data: string) => void;
  maxRetries?: number;
}

export function useWebSocket({
  url,
  onMessage,
  maxRetries = 10,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      onMessage(event.data);
    };

    ws.onclose = () => {
      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        setStatus("reconnecting");
        // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current - 1), 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      } else {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, onMessage, maxRetries]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { connected: status === "connected", status, send };
}
