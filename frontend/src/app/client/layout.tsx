"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  History,
  FileText,
  Car,
  Home,
  Shield,
  RefreshCw,
  AlertTriangle,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tableau de bord", href: "/client/dashboard", icon: LayoutDashboard, wip: false },
  { name: "Mon portefeuille", href: "/client/portfolio", icon: Briefcase, wip: true },
  { name: "Historique", href: "/client/history", icon: History, wip: false },
];

const prospectActions = [
  { name: "Cotation Auto", href: "/client/cotation/automobile", icon: Car, wip: true },
  { name: "Cotation MRH", href: "/client/cotation/habitation", icon: Home, wip: true },
];

const verifiedActions = [
  { name: "Cotation Auto", href: "/client/cotation/automobile", icon: Car, wip: true },
  { name: "Cotation MRH", href: "/client/cotation/habitation", icon: Home, wip: true },
  { name: "Souscription Auto", href: "/client/subscribe/automobile", icon: Car, wip: true },
  { name: "Souscription MRH", href: "/client/subscribe/habitation", icon: Home, wip: true },
  { name: "Incorporation", href: "/client/incorporation", icon: FileText, wip: true },
  { name: "Changement", href: "/client/change", icon: RefreshCw, wip: true },
  { name: "Mes sinistres", href: "/client/sinistres", icon: AlertTriangle, wip: true },
];

const magistratActions = [
  { name: "Cotation Auto", href: "/client/cotation/automobile", icon: Car, wip: true },
  { name: "Cotation MRH", href: "/client/cotation/habitation", icon: Home, wip: true },
  { name: "Souscription Auto", href: "/client/subscribe/automobile", icon: Car, wip: true },
  { name: "Souscription MRH", href: "/client/subscribe/habitation", icon: Home, wip: true },
  { name: "Magist-Assur", href: "/client/subscribe/magist-assur", icon: Shield, wip: false },
  { name: "Incorporation", href: "/client/incorporation", icon: FileText, wip: true },
  { name: "Changement", href: "/client/change", icon: RefreshCw, wip: true },
  { name: "Mes sinistres", href: "/client/sinistres", icon: AlertTriangle, wip: true },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);

  // Auth guard — redirect via useEffect to avoid setState-during-render
  const shouldRedirect = !initialized || !isAuthenticated || !user || user.role === "agent" || user.role === "admin";
  useEffect(() => {
    if (loading || !initialized) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else if (user.role === "agent") {
      router.replace("/agent/dashboard");
    } else if (user.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [initialized, isAuthenticated, user, loading, router]);

  // Rafraîchir fetchMe() sur focus de page + polling 30s si non vérifié
  const { fetchMe } = useAuthStore();
  useEffect(() => {
    const onFocus = () => fetchMe();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchMe();
    });
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMe]);

  useEffect(() => {
    if (!user?.verified) {
      const interval = setInterval(() => fetchMe(), 30_000);
      return () => clearInterval(interval);
    }
  }, [user?.verified, fetchMe]);

  if (loading || !initialized || shouldRedirect) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = `${user.nom[0]}${user.prenoms[0]}`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-white">ACS</h1>
            <p className="text-amber-400 text-xs font-medium">Magistrat & Douane</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* User info */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-amber-400/20 border border-amber-400/30">
            {user?.photo && <AvatarImage src={user.photo} alt="Photo" className="object-cover" />}
            <AvatarFallback className="bg-amber-400/20 text-amber-400 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.nom} {user?.prenoms}
            </p>
            <p className="text-xs text-white/50 truncate">{user?.profession}</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">
          Navigation
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
              {item.wip && (
                <span className="ml-auto text-[9px] uppercase tracking-wide bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                  Bientôt
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-3">
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className="flex items-center justify-between w-full px-3 text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2"
          >
            Actions
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", actionsOpen && "rotate-180")}
            />
          </button>
          {actionsOpen &&
            (() => {
              let actions;
              if (!user.verified) {
                actions = prospectActions;
              } else if (user.professionType === 'magistrat' || user.professionType === 'douanier') {
                actions = magistratActions;
              } else {
                actions = verifiedActions;
              }
              
              return actions.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-amber-400/15 text-amber-400"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.name}
                    {item.wip && (
                      <span className="ml-auto text-[9px] uppercase tracking-wide bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                        Bientôt
                      </span>
                    )}
                  </Link>
                );
              });
            })()}
        </div>
      </nav>

      <Separator className="bg-white/10" />

      {/* Footer */}
      <div className="p-3 space-y-1">
        <Link
          href="/client/profile"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname === "/client/profile"
              ? "bg-amber-400/15 text-amber-400"
              : "text-white/70 hover:text-white hover:bg-white/5"
          )}
        >
          <User className="h-4 w-4" />
          Mon profil
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-400/10 w-full transition-all"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-[hsl(222,47%,15%)]">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <div className="flex-1 bg-[hsl(222,47%,15%)]">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-900">Espace Client</h2>
            </div>
            <div className="flex items-center gap-3">
              <NotificationsDropdown />
              <span className="text-sm text-gray-500 hidden sm:block">
                {user?.nom} {user?.prenoms}
              </span>
              <Avatar className="h-8 w-8">
                {user?.photo && <AvatarImage src={user.photo} alt="Photo" className="object-cover" />}
                <AvatarFallback className="bg-[hsl(222,47%,20%)] text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Verification banner for prospects */}
        {!user.verified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
            <p className="text-sm text-amber-800 text-center">
              <strong>⏳ Compte en attente de vérification</strong> — Un agent ACS vérifiera votre identité professionnelle sous 24h.
              Vous serez notifié dès l&apos;activation de votre compte.
            </p>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
