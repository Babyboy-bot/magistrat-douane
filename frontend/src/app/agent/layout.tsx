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
  Heart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tableau de bord", href: "/agent/dashboard", icon: LayoutDashboard, wip: false },
  { name: "Assurés / Prospects", href: "/agent/clients", icon: Users, wip: false },
  { name: "Émissions", href: "/agent/emissions", icon: FileSpreadsheet, wip: true },
  { name: "Requêtes clients", href: "/agent/requests", icon: ClipboardList, wip: true },
  { name: "MAGIST'ASSUR", href: "/agent/magistassur", icon: Heart, wip: false },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-white">ACS Agent</h1>
            <p className="text-amber-400 text-xs font-medium">Gestion des opérations</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

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
            <p className="text-xs text-white/50">Agent ACS</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">
          Menu principal
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
      </nav>

      <Separator className="bg-white/10" />

      <div className="p-3 space-y-1">
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

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <div className="flex-1 bg-[hsl(222,47%,15%)]">
          <SidebarContent />
        </div>
      </div>

      <div className="lg:pl-72">
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
              <h2 className="text-lg font-semibold text-gray-900">Espace Agent ACS</h2>
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

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
