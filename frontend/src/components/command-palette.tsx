"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Wifi, ScrollText,
  FileSpreadsheet, ClipboardList, AlertTriangle, Loader2, ArrowRight,
} from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { usersApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { PROFESSION_LABELS } from "@/lib/types";

export const OPEN_PALETTE_EVENT = "acs:open-command-palette";

const AGENT_NAV = [
  { name: "Tableau de bord", href: "/agent/dashboard", icon: LayoutDashboard },
  { name: "Assurés / Prospects", href: "/agent/clients", icon: Users },
  { name: "Magist'Assur", href: "/agent/magistassur", icon: Shield },
  { name: "Émissions", href: "/agent/emissions", icon: FileSpreadsheet },
  { name: "Demandes", href: "/agent/requests", icon: ClipboardList },
  { name: "Sinistres", href: "/agent/sinistres", icon: AlertTriangle },
];

const ADMIN_NAV = [
  { name: "Supervision", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Utilisateurs connectés", href: "/admin/online", icon: Wifi },
  { name: "Gestion des agents", href: "/admin/agents", icon: Users },
  { name: "Journal d'audit", href: "/admin/audit", icon: ScrollText },
];

/** Palette ⌘K/Ctrl+K — navigation rapide + recherche d'utilisateurs. */
export function CommandPalette({ role }: { role: "agent" | "admin" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nav = role === "admin" ? ADMIN_NAV : AGENT_NAV;
  const searchRole = role === "admin" ? "agent" : "client";
  const target = role === "admin" ? "/admin/agents" : "/agent/clients";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (window.__acsOnboardingOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onEvent);
    };
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(() => {
      usersApi
        .listPaginated({ search: q, role: searchRole, pageSize: 8 })
        .then((r) => setResults(r.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, searchRole]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}
      title="Recherche rapide"
      description="Naviguez ou recherchez un utilisateur"
      className="rounded-2xl sm:max-w-lg"
    >
      <CommandInput
        placeholder={role === "admin" ? "Page ou agent…" : "Page, client…"}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="flex items-center justify-center gap-2 text-navy-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Recherche…
            </span>
          ) : (
            "Aucun résultat."
          )}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading={role === "admin" ? "Agents" : "Clients"}>
            {results.map((u) => (
              <CommandItem
                key={u.id}
                value={`${u.nom} ${u.prenoms} ${u.email} ${u.telephone}`}
                onSelect={() => go(`${target}?q=${encodeURIComponent(u.email || `${u.nom} ${u.prenoms}`)}`)}
                className="cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-bold text-navy-700">
                  {`${u.nom?.[0] ?? ""}${u.prenoms?.[0] ?? ""}`.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">{u.nom} {u.prenoms}</p>
                  <p className="truncate text-xs text-navy-400">
                    {PROFESSION_LABELS[u.professionType] ?? u.professionType} · {u.email || u.telephone}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-navy-300" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.length > 0 && <CommandSeparator />}

        <CommandGroup heading="Navigation">
          {nav.map((item) => (
            <CommandItem
              key={item.href}
              value={item.name}
              onSelect={() => go(item.href)}
              className="cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-navy-400" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
