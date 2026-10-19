"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, X, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useWebSocket, AppNotification } from "@/hooks/use-websocket";
import { useRouter } from "next/navigation";

function getRedirectUrl(notif: AppNotification, role?: string): string | null {
  const event = notif.data?.event as string | undefined;
  if (!event) return null;

  const requestId = notif.data?.request_id;
  const emissionId = notif.data?.emission_id;
  const contratId = notif.data?.contrat_id;
  const contratType = notif.data?.contrat_type as string | undefined;

  if (event === "new_request") {
    if (role !== "client" && notif.data?.type === "souscription_magist")
      return contratId ? `/agent/magistassur?contrat=${contratId}&type=epargne` : "/agent/magistassur";
    if (role === "client")
      return requestId ? `/client/history?id=${requestId}` : "/client/history";
    return requestId ? `/agent/requests?id=${requestId}` : "/agent/requests";
  }
  if (event === "request_treated" || event === "sinistre_cloture" || event === "attestations_envoyees" || event === "devis_envoye" || event === "request_claimed")
    return requestId ? `/client/history?id=${requestId}` : "/client/history";
  if (event === "devis_valide" || event === "devis_revision" || event === "devis_refuse")
    return requestId ? `/agent/requests?id=${requestId}` : "/agent/requests";
  if (event === "livrable_added")
    return requestId ? `/client/documents?request=${requestId}` : "/client/documents";
  if (event === "emission_created" || event === "emission_paiement")
    return emissionId ? `/client/portfolio?emission=${emissionId}` : "/client/portfolio";
  if (event === "emission_paiement_agent")
    return emissionId ? `/agent/emissions?emission=${emissionId}` : "/agent/emissions";
  if (event === "magist_assur") {
    if (role === "client")
      return requestId ? `/client/history?id=${requestId}` : "/client/dashboard";
    return contratId && contratType
      ? `/agent/magistassur?contrat=${contratId}&type=${contratType}`
      : "/agent/magistassur";
  }
  return null;
}

export function NotificationsDropdown() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    markAsRead, 
    markAllAsRead 
  } = useWebSocket(user?.id);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-navy-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-emerald-300 bg-emerald-50/60";
      case "warning":
        return "border-amber-300 bg-amber-50/60";
      case "error":
        return "border-red-300 bg-red-50/60";
      default:
        return "border-navy-200 bg-navy-50/60";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      return `Il y a ${diffDays}j`;
    } catch { return ""; }
  };

  const handleNotifClick = (notif: AppNotification) => {
    const url = getRedirectUrl(notif, user?.role);
    markAsRead(notif.id);
    setIsOpen(false);
    if (url) router.push(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative",
          !isConnected && "opacity-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
        title={isConnected ? "Notifications connectées" : "Notifications déconnectées"}
      >
        <Bell className={cn(
          "h-5 w-5",
          isConnected ? "text-navy-700" : "text-navy-300"
        )} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-navy-100 bg-white shadow-[0_24px_60px_-32px_rgb(16_28_52/0.4)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-navy-50 p-4">
            <h3 className="font-display font-semibold text-navy-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-navy-600 hover:text-amber-700"
                >
                  Tout marquer comme lu
                </Button>
              )}
              <div className="flex items-center gap-1">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-emerald-500" : "bg-navy-200"
                )} />
                <span className="text-xs text-navy-400">
                  {isConnected ? "Connecté" : "Déconnecté"}
                </span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-navy-400">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50">
                  <Bell className="h-5 w-5 text-navy-300" />
                </div>
                <p className="text-sm">
                  {isConnected ? "Aucune notification" : "Notifications déconnectées"}
                </p>
                              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group border-l-4 p-3 transition-colors",
                    getNotificationColor(notification.type)
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleNotifClick(notification)}
                    >
                      <p className="text-sm font-medium text-navy-900">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-navy-500">{notification.message}</p>
                      <p className="mt-0.5 text-xs text-navy-300">
                        {formatRelativeTime(notification.created_at)}
                        {getRedirectUrl(notification, user?.role) && (
                          <span className="ml-1 font-medium text-amber-600">→ Voir</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-navy-300 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
