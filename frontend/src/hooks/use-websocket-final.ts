"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

function getWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  if (apiBase) {
    return apiBase.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://localhost:8000";
}
const WS_BASE = getWsBase();

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  created_at: string;
  read_at?: string;
  data?: Record<string, unknown>;
}

interface UseWebSocketReturn {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  isReconnecting: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

function eventToNotification(raw: Record<string, unknown>): AppNotification {
  const event = raw.event as string;
  const id = `${event}-${raw.request_id ?? raw.document_nom ?? Date.now()}`;

  switch (event) {
    case "new_request":
      return {
        id,
        title: "Nouvelle requête",
        message: `${raw.client_nom} — ${raw.type} (${raw.numero})`,
        type: "info",
        created_at: (raw.created_at as string) ?? new Date().toISOString(),
        data: raw,
      };
    case "request_treated":
      return {
        id,
        title: "Requête traitée",
        message: `Votre requête ${raw.numero} a été traitée.`,
        type: "success",
        created_at: (raw.treated_at as string) ?? new Date().toISOString(),
        data: raw,
      };
    case "livrable_added":
      return {
        id,
        title: "Nouveau document disponible",
        message: `Document "${raw.document_nom}" ajouté à la requête ${raw.numero}.`,
        type: "success",
        created_at: new Date().toISOString(),
        data: raw,
      };
    case "echeance_reminder": {
      const police = raw.num_police as string;
      const echeance = raw.echeance as string;
      const days = Number(raw.days_remaining);
      return {
        id,
        title: `Contrat à renouveler dans ${days} jours`,
        message: `Votre contrat ${police} arrive à échéance le ${new Date(echeance).toLocaleDateString("fr-FR")}. Contactez votre agent.`,
        type: "warning",
        created_at: new Date().toISOString(),
        data: raw,
      };
    }
    case "emission_paiement": {
      const police = raw.num_police as string;
      const montant = Number(raw.montant_regle);
      const solde = Number(raw.solde_restant);
      const isSolde = Boolean(raw.is_solde);
      const fmt = (v: number) => new Intl.NumberFormat("fr-FR").format(v);
      return {
        id,
        title: isSolde ? "Contrat entièrement soldé 🎉" : "Paiement enregistré",
        message: isSolde
          ? `Félicitations ! Votre contrat ${police} est entièrement réglé.`
          : `Règlement de ${fmt(montant)} FCFA enregistré — contrat ${police}. Solde restant : ${fmt(solde)} FCFA.`,
        type: isSolde ? "success" : "info",
        created_at: new Date().toISOString(),
        data: raw,
      };
    }
    case "magist_assur":
      return {
        id: raw.id ? String(raw.id) : id,
        title: raw.title as string ?? "Magist-Assur",
        message: raw.message as string ?? "",
        type: (raw.type as AppNotification["type"]) ?? "info",
        created_at: new Date().toISOString(),
        data: raw,
      };
    default:
      return {
        id: `unknown-${Date.now()}`,
        title: "Notification",
        message: JSON.stringify(raw),
        type: "info",
        created_at: new Date().toISOString(),
        data: raw,
      };
  }
}

const STORAGE_KEY = (uid: string) => `read_notif_ids_${uid}`;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function fetchNotificationsApi(): Promise<AppNotification[]> {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json() as Record<string, unknown>[];
    return data.map((n) => ({
      id: String(n.id),
      title: n.title as string,
      message: n.message as string,
      type: n.type as AppNotification["type"],
      created_at: n.created_at as string,
      read_at: n.read_at as string | undefined,
      data: (n.data ?? {}) as Record<string, unknown>,
    }));
  } catch { return []; }
}

async function apiMarkRead(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/notifications/${id}/read/`, { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
}

async function apiMarkAllRead(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/notifications/read-all/`, { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
}

function loadReadIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveReadIds(uid: string, ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY(uid), JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

function playNotificationSound(type: "info" | "success" | "warning" | "error") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    // Fréquences différentes selon le type
    const freq = type === "success" ? 880 : type === "error" ? 440 : type === "warning" ? 660 : 760;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch {
    // Navigateur ne supporte pas l'API audio ou autoplay bloqué
  }
}

export function useWebSocket(userId?: string): UseWebSocketReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const initialLoadedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const mountedRef = useRef(true);
  const readIdsRef = useRef<Set<string>>(new Set());

  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (pongTimeoutRef.current) { clearTimeout(pongTimeoutRef.current); pongTimeoutRef.current = null; }
  }, []);

  const disconnect = useCallback(() => {
    stopHeartbeat();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "unmounting");
      }
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !userId) {
      disconnect();
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(`${WS_BASE}/ws/notifications/`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttempts.current = 0;

      // Heartbeat : ping toutes les 25s, reconnexion si pas de pong dans les 5s
      stopHeartbeat();
      pingIntervalRef.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        pongTimeoutRef.current = setTimeout(() => {
          // Pas de pong reçu → connexion morte, on ferme pour déclencher onclose
          wsRef.current?.close(4000, "pong timeout");
        }, 5_000);
      }, 25_000);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "welcome" || data.type === "pong") {
          // Pong reçu : annuler le timeout
          if (pongTimeoutRef.current) { clearTimeout(pongTimeoutRef.current); pongTimeoutRef.current = null; }
          return;
        }
        if (data.type === "notification" && data.data) {
          const notif = eventToNotification(data.data as Record<string, unknown>);
          if (readIdsRef.current.has(notif.id)) return;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [notif, ...prev.slice(0, 49)];
          });
          playNotificationSound(notif.type);
          if (notif.type === "success") toast.success(notif.title, { description: notif.message });
          else if (notif.type === "error") toast.error(notif.title, { description: notif.message });
          else toast.info(notif.title, { description: notif.message });
          // Rafraîchir le profil si le compte vient d'être vérifié
          if ((data.data as Record<string, unknown>).event === "account_verified") {
            import("@/stores/auth-store").then(({ useAuthStore }) => {
              useAuthStore.getState().fetchMe();
            });
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      stopHeartbeat();
      setIsConnected(false);
      // Ne pas retenter : démontage volontaire (1000) ou auth échouée (4401)
      if (event.code === 1000 || event.code === 4401) {
        setIsReconnecting(false);
        return;
      }
      // Retenter indéfiniment avec backoff exponentiel plafonné à 30s
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(1.5, Math.min(reconnectAttempts.current, 12)), 30_000);
      setIsReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => setIsConnected(false);
  }, [userId, disconnect, stopHeartbeat]);

  useEffect(() => {
    if (userId) readIdsRef.current = loadReadIds(userId);
    mountedRef.current = true;
    if (userId && !initialLoadedRef.current) {
      initialLoadedRef.current = true;
      fetchNotificationsApi().then((fetched) => {
        if (!mountedRef.current) return;
        const unread = fetched.filter((n) => !n.read_at);
        setNotifications(unread.slice(0, 50));
      });
    }
    connect();

    // Reconnecter quand l'onglet redevient visible (après mise en veille, changement d'onglet…)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          reconnectAttempts.current = 0;
          connect();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      mountedRef.current = false;
      disconnect();
    };
  }, [userId, connect, disconnect]);

  const markAsRead = useCallback((id: string) => {
    if (userId) {
      readIdsRef.current.add(id);
      saveReadIds(userId, readIdsRef.current);
      apiMarkRead(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      if (userId) {
        prev.forEach((n) => readIdsRef.current.add(n.id));
        saveReadIds(userId, readIdsRef.current);
        apiMarkAllRead();
      }
      return [];
    });
  }, [userId]);

  const clearNotifications = useCallback(() => {
    if (userId) {
      readIdsRef.current = new Set();
      saveReadIds(userId, readIdsRef.current);
    }
    setNotifications([]);
  }, [userId]);

  return {
    notifications,
    unreadCount: notifications.length,
    isConnected,
    isReconnecting,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
