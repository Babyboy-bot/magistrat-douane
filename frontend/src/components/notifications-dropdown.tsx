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
  if (event === "request_treated")
    return requestId ? `/client/history?id=${requestId}` : "/client/history";
  if (event === "livrable_added")
    return requestId ? `/client/documents?request=${requestId}` : "/client/documents";
  if (event === "emission_created" || event === "emission_paiement")
    return emissionId ? `/client/portfolio?emission=${emissionId}` : "/client/portfolio";
  if (event === "emission_paiement_agent")
    return emissionId ? `/agent/emissions?emission=${emissionId}` : "/agent/emissions";
  if (event === "magist_assur") {
    if (role === "client")
      return contratId && contratType ? `/client/subscribe/magist-assur?contrat=${contratId}&type=${contratType}` : null;
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
        return <Check className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-amber-200 bg-amber-50";
      case "error":
        return "border-red-200 bg-red-50";
      default:
        return "border-blue-200 bg-blue-50";
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
          isConnected ? "text-green-500" : "text-gray-500"
        )} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Tout marquer comme lu
                </Button>
              )}
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-gray-400"
                )} />
                <span className="text-xs text-gray-500">
                  {isConnected ? "Connecté" : "Déconnecté"}
                </span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {isConnected ? "Aucune notification" : "Notifications déconnectées"}
                </p>
                              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-l-4 transition-colors hover:bg-gray-50 group",
                    getNotificationColor(notification.type)
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotifClick(notification)}
                    >
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatRelativeTime(notification.created_at)}
                        {getRedirectUrl(notification, user?.role) && (
                          <span className="ml-1 text-blue-500">→ Voir</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-blue-600 hover:text-blue-700"
              onClick={() => {
                // Later: redirect to full notifications page
                console.log("Voir toutes les notifications");
              }}
            >
              Voir toutes les notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
