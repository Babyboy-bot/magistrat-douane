"use client";

import { useRef, useState } from "react";
import { Mail, Phone, ShieldCheck, Clock } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import { PROFESSION_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Survol d'une ligne client → mini-fiche sans clic (délai 350 ms). */
export function ClientHoverCard({
  client,
  children,
  contentClassName,
}: {
  client: User;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 350);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const initials = `${client.nom?.[0] ?? ""}${client.prenoms?.[0] ?? ""}`.toUpperCase();

  return (
    <Popover open={open}>
      <div onMouseEnter={enter} onMouseLeave={leave}>
        <PopoverAnchor asChild>{children}</PopoverAnchor>
        <PopoverContent
          side="right" align="start" sideOffset={8}
          className={cn("pointer-events-none w-72 rounded-2xl border-navy-100 p-4 shadow-[0_20px_50px_-20px_rgb(16_28_52/0.4)]", contentClassName)}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 ring-1 ring-navy-100">
              {client.photo && <AvatarImage src={client.photo} alt={client.nom} className="object-cover" />}
              <AvatarFallback className="bg-navy-800 text-xs font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-navy-900">
                {client.nom} {client.prenoms}
              </p>
              <p className="text-xs text-navy-400">
                {client.profession || PROFESSION_LABELS[client.professionType] || "Client"}
              </p>
              <Badge
                className={
                  client.verified
                    ? "mt-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "mt-1.5 border-amber-200 bg-amber-50 text-amber-700"
                }
                variant="outline"
              >
                {client.verified ? (
                  <><ShieldCheck className="mr-1 h-3 w-3" />Vérifié</>
                ) : (
                  <><Clock className="mr-1 h-3 w-3" />En attente</>
                )}
              </Badge>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-navy-50 pt-3 text-xs text-navy-500">
            {client.email && (
              <p className="flex items-center gap-2 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-navy-300" />
                <span className="truncate">{client.email}</span>
                {client.emailVerified && <span className="shrink-0 text-emerald-600">✓</span>}
              </p>
            )}
            {client.telephone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-navy-300" />
                {client.telephone}
              </p>
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
