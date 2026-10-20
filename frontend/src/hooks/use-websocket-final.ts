"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { refreshOnce } from "@/lib/api/client";

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

function eventToNotification(raw: Record<string, unknown>): AppNotification | null {
  // Format émis par notification_service : contient id/title/message directement, sans champ event
  if (typeof raw.title === "string" && typeof raw.message === "string" && !raw.event) {
    return {
      id: raw.id ? String(raw.id) : `notif-${Date.now()}`,
      title: raw.title,
      message: raw.message,
      type: (raw.type as AppNotification["type"]) ?? "info",
      created_at: (raw.created_at as string) ?? new Date().toISOString(),
      read_at: raw.read_at as string | undefined,
      data: (raw.data as Record<string, unknown>) ?? {},
    };
  }

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
    case "emission_created": {
      const police = raw.num_police as string;
      const risque = raw.risque as string;
      const compagnie = raw.compagnie as string;
      const prime = Number(raw.prime_ttc);
      const fmt = (v: number) => new Intl.NumberFormat("fr-FR").format(v);
      return {
        id,
        title: "Nouvelle émission créée 📋",
        message: `Une émission ${police}${risque ? ` — ${risque}` : ""}${compagnie ? ` (${compagnie})` : ""} a été créée pour vous. Prime TTC : ${fmt(prime)} FCFA.`,
        type: "info",
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
      return null;
  }
}

const STORAGE_KEY = (uid: string) => `read_notif_ids_${uid}`;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** null = session définitivement expirée (401 même après tentative de refresh) */
async function fetchNotificationsApi(): Promise<AppNotification[] | null> {
  try {
    const doFetch = () => fetch(`${API_BASE}/api/notifications/`, { credentials: "include" });
    let res = await doFetch();
    if (res.status === 401) {
      const refreshed = await refreshOnce();
      if (refreshed) res = await doFetch();
      else return null;
    }
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

// ── Cache module-level (survit aux remontages React) ────────────────────────
const _notifCache = new Map<string, AppNotification[]>();
const _loadedUsers = new Set<string>();
const _shownToastIds = new Set<string>();

export function useWebSocket(userId?: string): UseWebSocketReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    userId && _notifCache.has(userId) ? _notifCache.get(userId)! : []
  );
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
          if (!notif) return;
          if (readIdsRef.current.has(notif.id)) return;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            const next = [notif, ...prev.slice(0, 49)];
            if (userId) _notifCache.set(userId, next);
            return next;
          });
          // Rejeu au login (initial) ou notification déjà affichée : pas de toast ni de son
          const isInitial = Boolean((data.data as Record<string, unknown>).initial);
          if (!isInitial && !_shownToastIds.has(notif.id)) {
            _shownToastIds.add(notif.id);
            playNotificationSound(notif.type);
            if (notif.type === "success") toast.success(notif.title, { description: notif.message });
            else if (notif.type === "error") toast.error(notif.title, { description: notif.message });
            else toast.info(notif.title, { description: notif.message });
          }
          // Rafraîchir le profil si le compte vient d'être vérifié
          if ((data.data as Record<string, unknown>).event === "account_verified") {
            import("@/stores/auth-store").then(({ useAuthStore }) => {
              useAuthStore.getState().fetchMe();
            });
          }
          // Rafraîchir les données paiement côté client
          if ((data.data as Record<string, unknown>).event === "emission_paiement") {
            window.dispatchEvent(new CustomEvent("emission_paiement_updated"));
          }
          // Rafraîchir la liste des requêtes agent en temps réel
          if ((data.data as Record<string, unknown>).event === "new_request") {
            window.dispatchEvent(new CustomEvent("new_request_created"));
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
      // Démontage volontaire → on arrête
      if (event.code === 1000) {
        setIsReconnecting(false);
        return;
      }
      // Token expiré (4401) : tenter refresh puis reconnecter une fois
      if (event.code === 4401) {
        setIsReconnecting(true);
        fetch(`${API_BASE}/api/auth/token/refresh/`, { method: "POST", credentials: "include" })
          .then((r) => {
            if (!mountedRef.current) return;
            if (r.ok) {
              // Token rafraîchi → reconnecter
              reconnectAttempts.current = 0;
              reconnectTimerRef.current = setTimeout(() => {
                if (mountedRef.current) connect();
              }, 500);
            } else {
              // Session définitivement expirée
              setIsReconnecting(false);
            }
          })
          .catch(() => { if (mountedRef.current) setIsReconnecting(false); });
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session morte : arrêter les boucles puis déconnecter proprement
  const handleAuthExpired = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    disconnect();
    import("@/stores/auth-store").then(({ useAuthStore }) => {
      useAuthStore.getState().logout();
      const publicPaths = ["/login", "/register", "/reset-password"];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = "/login";
      }
    });
  }, [disconnect]);

  const syncFromApi = useCallback(() => {
    if (!userId || !mountedRef.current) return;
    fetchNotificationsApi().then((fetched) => {
      if (!mountedRef.current) return;
      if (fetched === null) { handleAuthExpired(); return; }
      const unread = fetched.filter((n) => !n.read_at && !readIdsRef.current.has(n.id));
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newOnes = unread.filter((n) => !existingIds.has(n.id));
        if (newOnes.length === 0) return prev;
        // Sync silencieuse : mise à jour du badge/dropdown uniquement, pas de toast
        // Les toasts sont réservés aux notifications reçues en temps réel via WS
        const next = [...newOnes, ...prev].slice(0, 50);
        if (userId) _notifCache.set(userId, next);
        return next;
      });
    });
  }, [userId, handleAuthExpired]);

  useEffect(() => {
    if (userId) readIdsRef.current = loadReadIds(userId);
    mountedRef.current = true;
    // Charger depuis le cache si déjà initialisé pour ce user
    if (userId && _notifCache.has(userId)) {
      setNotifications(_notifCache.get(userId)!);
    } else if (userId && !_loadedUsers.has(userId)) {
      _loadedUsers.add(userId);
      fetchNotificationsApi().then((fetched) => {
        if (!mountedRef.current) return;
        if (fetched === null) { handleAuthExpired(); return; }
        const unread = fetched.filter((n) => !n.read_at && !readIdsRef.current.has(n.id));
        const slice = unread.slice(0, 50);
        _notifCache.set(userId, slice);
        setNotifications(slice);
      });
    }
    connect();

    // Polling de secours toutes les 10s (si le broadcast WS échoue silencieusement)
    pollRef.current = setInterval(syncFromApi, 10_000);

    // Reconnecter quand l'onglet redevient visible (après mise en veille, changement d'onglet…)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          reconnectAttempts.current = 0;
          connect();
        }
        syncFromApi();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      mountedRef.current = false;
      disconnect();
    };
  }, [userId, connect, disconnect, syncFromApi, handleAuthExpired]);

  const markAsRead = useCallback((id: string) => {
    if (userId) {
      readIdsRef.current.add(id);
      saveReadIds(userId, readIdsRef.current);
      apiMarkRead(id);
    }
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (userId) _notifCache.set(userId, next);
      return next;
    });
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      if (userId) {
        prev.forEach((n) => readIdsRef.current.add(n.id));
        saveReadIds(userId, readIdsRef.current);
        apiMarkAllRead();
        _loadedUsers.delete(userId);
        _notifCache.set(userId, []);
        _shownToastIds.clear();
      }
      return [];
    });
  }, [userId]);

  const clearNotifications = useCallback(() => {
    if (userId) {
      readIdsRef.current = new Set();
      saveReadIds(userId, readIdsRef.current);
      _loadedUsers.delete(userId);
      _notifCache.set(userId, []);
      _shownToastIds.clear();
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
