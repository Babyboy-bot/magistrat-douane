"use client";

import { AlertCircle, FileText, Shield, Download, Eye, Clock, CheckCircle, PiggyBank, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, ClientRequest } from "@/lib/types";
import { downloadFile, magistassurApi } from "@/lib/api";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildUrl(f: string) {
  if (!f) return "";
  if (f.startsWith("http")) return f;
  return `${API_BASE}${f.startsWith("/") ? f : "/" + f}`;
}


export default function ClientDashboard() {
  const { user } = useAuthStore();
  const clientId = user?.id || "";
  const { data: requests } = useClientRequests(clientId);

  const [epargne, setEpargne] = useState<Record<string, unknown>[]>([]);
  const [prevoyance, setPrevoyance] = useState<Record<string, unknown>[]>([]);
  const [loadingMagist, setLoadingMagist] = useState(true);

  useEffect(() => {
    if (!user?.verified) return;
    Promise.all([
      magistassurApi.listEpargne({ clientId }).catch(() => []),
      magistassurApi.listPrevoyance({ clientId }).catch(() => []),
    ]).then(([e, p]) => {
      setEpargne(e as Record<string, unknown>[]);
      setPrevoyance(p as Record<string, unknown>[]);
      setLoadingMagist(false);
    });
  }, [user?.verified, clientId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const statusColor = (status: string) => {
    switch (status) {
      case "en_attente": return "bg-amber-100 text-amber-800";
      case "en_cours": return "bg-navy-100 text-navy-700";
      case "traite": return "bg-emerald-100 text-emerald-800";
      default: return "bg-navy-100 text-navy-700";
    }
  };

  const STATUT_LABELS: Record<string, string> = {
    en_cours: "En cours",
    rachete: "Racheté",
    arrive_terme: "Arrivé à terme",
    suspendu: "Suspendu",
    cloture: "Clôturé",
    sinistre: "Sinistre déclaré",
    expire: "Expiré",
    resilie: "Résilié",
  };
  const statutLabel = (s: unknown) => STATUT_LABELS[String(s)] || String(s || "—");

  const conseillerLigne = (c: Record<string, unknown>) =>
    c.prisEnChargeNom
      ? `Conseiller : ${c.prisEnChargeNom}${c.prisEnChargeTelephone ? ` · Tél ${c.prisEnChargeTelephone}` : ""}`
      : "En attente d'un conseiller";

  // Livrables récents (toutes requêtes confondues)
  const livrablesRecents = requests
    .flatMap((r: ClientRequest) => r.livrables.map((d) => ({ ...d, requestNumero: r.numero, requestType: r.type })))
    .slice(0, 5);

  const totalContrats = epargne.length + prevoyance.length;
  const contratsEnAttente = [...epargne, ...prevoyance].filter((c) => !(c as Record<string, unknown>).numPolice).length;
  const contratsActifs = [...epargne, ...prevoyance].filter((c) => (c as Record<string, unknown>).numPolice && (c as Record<string, unknown>).statut === "en_cours").length;

  const isMagistrat = user?.professionType === "magistrat";
  const contrats = [
    ...epargne.map((c) => ({ c, kind: "epargne" as const })),
    ...prevoyance.map((c) => ({ c, kind: "prevoyance" as const })),
  ];
  const recentRequests = requests.filter((r: ClientRequest) => r.type !== "declaration_sinistre").slice(0, 5);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ── Accueil ── */}
      <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_120%_at_100%_0%,var(--color-navy-700)_0%,var(--color-navy-900)_45%,var(--color-navy-950)_100%)] p-6 text-white shadow-[0_24px_60px_-28px_rgb(10_18_36/0.7)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(255_255_255/0.025)_22px_23px)] sm:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium capitalize text-amber-300/90">{today}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Bonjour, {user?.prenoms?.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-white/65 sm:text-base">
              {!user?.verified
                ? "Votre compte est en cours de vérification par nos équipes."
                : contratsEnAttente > 0
                  ? `${contratsEnAttente} dossier${contratsEnAttente > 1 ? "s" : ""} Magist'Assur en cours de traitement par votre conseiller.`
                  : totalContrats > 0
                    ? "Vos contrats Magist'Assur sont à jour."
                    : "Préparez votre retraite et protégez votre famille avec Magist'Assur."}
            </p>
          </div>
          {user?.verified && isMagistrat && (
            <div className="flex flex-wrap gap-2">
              {contratsEnAttente > 0 && (
                <Link href="/client/history">
                  <Button variant="outline" className="h-11 rounded-xl border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">
                    <Clock className="mr-2 h-4 w-4" /> Suivre mes dossiers
                  </Button>
                </Link>
              )}
              <Link href="/client/subscribe/magist-assur">
                <Button className="h-11 rounded-xl bg-amber-400 px-5 font-semibold text-navy-950 hover:bg-amber-300">
                  <Shield className="mr-2 h-4 w-4" />
                  {totalContrats > 0 ? "Nouvelle souscription" : "Découvrir Magist'Assur"}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Compte en attente ── */}
      {!user?.verified && (
        <section className="grid gap-4 rounded-3xl border border-amber-200 bg-white p-6 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-navy-900">Vérification de votre identité professionnelle</h3>
            <p className="mt-1 text-sm text-navy-500">Un agent ACS valide votre compte, généralement sous 24 h. Vous serez notifié dès l&apos;activation.</p>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Compte créé", true],
                ["Vérification par un agent", false],
                ["Accès à Magist'Assur", false],
              ].map(([label, done], i) => (
                <li key={String(label)} className="flex items-center gap-3 rounded-xl bg-navy-50/60 p-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-white text-navy-500 ring-1 ring-navy-200"}`}>
                    {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="text-sm font-medium text-navy-800">{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Statistiques ── */}
      {user?.verified && loadingMagist && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-navy-100 bg-white p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
      )}
      {user?.verified && !loadingMagist && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Contrats Magist'Assur" value={totalContrats} icon={Shield} tone="navy"
            hint={contratsActifs > 0 ? `${contratsActifs} actif${contratsActifs > 1 ? "s" : ""}` : undefined} />
          <StatCard label="Épargne retraite" value={epargne.length} icon={PiggyBank} tone="gold" />
          <StatCard label="Prévoyance" value={prevoyance.length} icon={Heart} tone="rose" />
        </div>
      )}

      {/* ── Contrats ── */}
      {user?.verified && !loadingMagist && (
        <section className="rounded-3xl border border-navy-100 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy-900">Mes contrats</h2>
              <p className="text-xs text-navy-400">Épargne et prévoyance Magist&apos;Assur</p>
            </div>
            {totalContrats > 0 && (
              <Link href="/client/history" className="text-sm font-medium text-amber-700 hover:text-amber-800">Tout voir →</Link>
            )}
          </div>

          {totalContrats === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-navy-100">
                <Shield className="h-6 w-6" />
              </div>
              <p className="mt-3 font-medium text-navy-900">Aucun contrat pour le moment</p>
              <p className="mt-1 max-w-sm text-sm text-navy-400">Souscrivez à l&apos;Épargne retraite Magist&apos;Assur en 15 minutes, avec un conseiller dédié.</p>
              {isMagistrat && (
                <Link href="/client/subscribe/magist-assur" className="mt-5">
                  <Button className="rounded-xl bg-navy-900 px-5 hover:bg-navy-800">Souscrire maintenant</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {contrats.slice(0, 6).map(({ c, kind }) => {
                const actif = Boolean(c.numPolice) && c.statut === "en_cours";
                return (
                  <div key={`${kind}-${c.id}`} className="flex items-start gap-3 rounded-2xl border border-navy-100 p-4 transition hover:border-amber-200 hover:shadow-[0_10px_30px_-18px_rgb(16_28_52/0.35)]">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kind === "epargne" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"}`}>
                      {kind === "epargne" ? <PiggyBank className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-navy-900">{kind === "epargne" ? "Épargne retraite" : "Prévoyance"}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${actif ? "bg-emerald-50 text-emerald-700" : c.numPolice ? "bg-navy-50 text-navy-600" : "bg-amber-50 text-amber-700"}`}>
                          {c.numPolice ? statutLabel(c.statut) : "En traitement"}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-navy-400">{(c.numPolice as string) || `Dossier n° ${c.id}`}</p>
                      <p className="mt-2 text-xs text-navy-500">{conseillerLigne(c)}</p>
                      {kind === "epargne" && Number(c.capitalConstitue) > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-700">Capital constitué : {formatCurrency(Number(c.capitalConstitue))}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Documents & demandes ── */}
      {user?.verified && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-navy-100 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-navy-900">Documents disponibles</h2>
              <Link href="/client/history" className="text-sm font-medium text-amber-700 hover:text-amber-800">Tout voir →</Link>
            </div>
            {livrablesRecents.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-navy-50/50 p-4 text-sm text-navy-400">
                <FileText className="h-5 w-5 shrink-0" />
                Vos attestations et contrats apparaîtront ici dès leur émission.
              </div>
            ) : (
              <ul className="divide-y divide-navy-50">
                {livrablesRecents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{d.nom}</p>
                      <p className="text-xs text-navy-400">{d.requestNumero} · {REQUEST_TYPE_LABELS[d.requestType as keyof typeof REQUEST_TYPE_LABELS]}</p>
                    </div>
                    <button onClick={() => window.open(buildUrl(d.fichier), "_blank")} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-800" title="Consulter">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => downloadFile(buildUrl(d.fichier), d.nom)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-800" title="Télécharger">
                      <Download className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-navy-100 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-navy-900">Demandes récentes</h2>
              <Link href="/client/history" className="text-sm font-medium text-amber-700 hover:text-amber-800">Tout voir →</Link>
            </div>
            {recentRequests.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-navy-50/50 p-4 text-sm text-navy-400">
                <Clock className="h-5 w-5 shrink-0" />
                Aucune demande pour le moment.
              </div>
            ) : (
              <ul className="divide-y divide-navy-50">
                {recentRequests.map((r: ClientRequest) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">{REQUEST_TYPE_LABELS[r.type as keyof typeof REQUEST_TYPE_LABELS]}</p>
                      <p className="mt-0.5 text-xs text-navy-400">{r.numero} · {r.createdAt}</p>
                    </div>
                    <Badge className={`${statusColor(r.status)} shrink-0`} variant="secondary">
                      {REQUEST_STATUS_LABELS[r.status as keyof typeof REQUEST_STATUS_LABELS]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
