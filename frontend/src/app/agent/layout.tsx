"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  ClipboardList,
  Shield,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

const PAGE_TITLES: [string, string][] = [
  ["/agent/dashboard", "Tableau de bord"],
  ["/agent/clients", "Assurés & Prospects"],
  ["/agent/magistassur", "Magist'Assur"],
  ["/agent/emissions", "Émissions"],
  ["/agent/requests", "Demandes"],
  ["/agent/sinistres", "Sinistres"],
];

const navigation = [
  { name: "Tableau de bord", href: "/agent/dashboard", icon: LayoutDashboard, wip: false },
  { name: "Assurés / Prospects", href: "/agent/clients", icon: Users, wip: false },
  { name: "Magist'Assur", href: "/agent/magistassur", icon: Shield, wip: false },
];

const upcomingItems = [
  { name: "Émissions", href: "/agent/emissions", icon: FileSpreadsheet, wip: true },
  { name: "Demandes", href: "/agent/requests", icon: ClipboardList, wip: true },
  { name: "Sinistres", href: "/agent/sinistres", icon: AlertTriangle, wip: true },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  // Auth guard — redirect via useEffect to avoid setState-during-render
  const shouldRedirect =
    !initialized || !isAuthenticated || !user || (user.role !== "agent" && user.role !== "admin");
  useEffect(() => {
    if (loading || !initialized) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else if (user.role !== "agent" && user.role !== "admin") {
      router.replace("/client/dashboard");
    }
  }, [initialized, isAuthenticated, user, loading, router]);

  if (loading || !initialized || shouldRedirect) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = `${user?.nom?.[0] ?? "A"}${user?.prenoms?.[0] ?? "C"}`;
  const pageTitle = PAGE_TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Espace agent";

  const NavItem = ({ item, muted = false }: { item: (typeof navigation)[number]; muted?: boolean }) => {
    const isActive = pathname === item.href || (item.href !== "/agent/dashboard" && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
          muted ? "py-2" : "py-2.5",
          isActive
            ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]"
            : muted ? "text-white/45 hover:text-white/80 hover:bg-white/[0.04]" : "text-white/70 hover:text-white hover:bg-white/[0.05]",
        )}
      >
        {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-400" />}
        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-amber-400" : "")} />
        <span className="truncate">{item.name}</span>
        {item.href === "/agent/magistassur" && !isActive && (
          <Sparkles className="ml-auto h-3.5 w-3.5 text-amber-400/80" />
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <BrandMark />
        <div>
          <p className="font-display text-xl font-semibold leading-none text-white">ACS</p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-amber-300/90">Espace Agent</p>
        </div>
      </div>

      {/* Utilisateur */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
        <Avatar className="h-10 w-10 ring-2 ring-amber-400/40">
          {user?.photo && <AvatarImage src={user.photo} alt="Photo" className="object-cover" />}
          <AvatarFallback className="bg-amber-400/15 text-amber-300 text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.prenoms} {user?.nom}</p>
          <p className="truncate text-xs text-white/45">Agent ACS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Opérations</p>
        {navigation.map((item) => <NavItem key={item.href} item={item} />)}

        {upcomingItems.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setUpcomingOpen(!upcomingOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30 hover:text-white/60"
            >
              <Clock className="h-3 w-3" />
              Bientôt disponible
              <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] tracking-normal">{upcomingItems.length}</span>
              <ChevronDown className={cn("ml-auto h-3 w-3 transition-transform", upcomingOpen && "rotate-180")} />
            </button>
            {upcomingOpen && (
              <div className="mt-1 space-y-0.5">
                {upcomingItems.map((item) => <NavItem key={item.href} item={item} muted />)}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Pied */}
      <div className="space-y-1 border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  const sidebarBg = "bg-[radial-gradient(120%_60%_at_0%_0%,var(--color-navy-800)_0%,var(--color-navy-950)_60%)]";

  return (
    <div className="min-h-screen bg-ivory">
      {/* Menu mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className={cn("fixed inset-y-0 left-0 w-72 shadow-2xl", sidebarBg)}>
            <button onClick={() => setSidebarOpen(false)} className="absolute right-4 top-5 text-white/50 hover:text-white" aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Barre latérale */}
      <div className={cn("hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72", sidebarBg)}>
        <div className="flex-1"><SidebarContent /></div>
      </div>

      <div className="lg:pl-72">
        {/* En-tête */}
        <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
              <BrandMark size="sm" className="shrink-0 lg:hidden" />
              <h2 className="truncate font-display text-lg font-semibold text-navy-900">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationsDropdown />
              <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-3">
                <Avatar className="h-8 w-8">
                  {user?.photo && <AvatarImage src={user.photo} alt="Photo" className="object-cover" />}
                  <AvatarFallback className="bg-navy-800 text-xs text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-navy-700 sm:block">{user?.prenoms?.split(" ")[0]}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
