"use client";

import {
  Banknote, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  Car, Home, CreditCard, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClientStats } from "@/hooks/use-api-data";
import { Emission, Paiement } from "@/lib/types";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";

function SoldeBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Réglé : {fmt(paid)}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-orange-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {total - paid > 0 && (
        <p className="text-xs text-red-600 font-medium">Solde dû : {fmt(total - paid)}</p>
      )}
    </div>
  );
}

function ContratCard({ emission }: { emission: Emission }) {
  const [open, setOpen] = useState(false);
  const solde = emission.solde ?? (emission.primeTTC - emission.totalPaye);
  const isSolde = solde <= 0;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-[hsl(222,47%,20%)] flex items-center justify-center shrink-0">
            {emission.risque.toLowerCase().includes("auto")
              ? <Car className="h-5 w-5 text-white" />
              : <Home className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{emission.risque}</p>
            <p className="text-xs text-gray-500 truncate">
              {emission.compagnie} • {emission.numPolice || `#${emission.id}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isSolde ? (
            <Badge className="text-xs bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Soldé
            </Badge>
          ) : (
            <Badge className="text-xs bg-red-100 text-red-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fmt(solde)}
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Prime TTC</p>
              <p className="font-semibold">{fmt(emission.primeTTC)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Échéance</p>
              <p className="font-semibold">{fmtDate(emission.echeance)}</p>
            </div>
          </div>

          <SoldeBar paid={emission.totalPaye} total={emission.primeTTC} />

          {emission.paiements && emission.paiements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Historique des règlements
              </p>
              <div className="space-y-1.5">
                {emission.paiements.map((p: Paiement) => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="text-gray-600 truncate">{p.reference || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-gray-400">{fmtDate(p.dateReglement)}</span>
                      <span className="font-semibold text-green-700">{fmt(p.montantRegle)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {emission.paiements && emission.paiements.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Aucun règlement enregistré</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  const { user } = useAuthStore();
  const { stats, emissions } = useClientStats(user?.id || "");

  const totalDu = emissions.reduce((sum: number, e: Emission) => {
    const s = e.solde ?? (e.primeTTC - e.totalPaye);
    return sum + Math.max(s, 0);
  }, 0);

  const contratsAvecSolde = emissions.filter(
    (e: Emission) => (e.solde ?? (e.primeTTC - e.totalPaye)) > 0
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes paiements</h1>
        <p className="text-gray-500 text-sm mt-0.5">Suivi de vos règlements de primes</p>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total primes</p>
                <p className="text-lg font-bold text-gray-900">{fmt(stats.primeTotale)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Déjà réglé</p>
                <p className="text-lg font-bold text-green-700">{fmt(stats.primePayee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${totalDu > 0 ? "ring-1 ring-red-200" : ""}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${totalDu > 0 ? "bg-red-50" : "bg-green-50"}`}>
                {totalDu > 0
                  ? <AlertCircle className="h-5 w-5 text-red-600" />
                  : <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>
              <div>
                <p className="text-xs text-gray-500">Solde dû</p>
                <p className={`text-lg font-bold ${totalDu > 0 ? "text-red-700" : "text-green-700"}`}>
                  {totalDu > 0 ? fmt(totalDu) : "Tout soldé"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contrats avec solde en attente */}
      {contratsAvecSolde.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-orange-400">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                <strong>{contratsAvecSolde.length} contrat{contratsAvecSolde.length > 1 ? "s" : ""}</strong> en attente de règlement.
                Contactez votre agent pour effectuer le virement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Détail par contrat */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Détail par contrat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emissions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Aucun contrat actif</p>
          )}
          {emissions.map((e: Emission) => (
            <ContratCard key={e.id} emission={e} />
          ))}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-0 shadow-sm bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <CreditCard className="h-5 w-5" /> Modalités de règlement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Les paiements s&apos;effectuent uniquement par <strong>virement bancaire</strong>.
              Contactez votre agent ACS pour obtenir les coordonnées bancaires (RIB).
            </p>
          </div>
          <ol className="text-sm text-amber-800 space-y-1.5 list-none pl-0">
            {[
              "Contactez votre agent ACS pour obtenir le RIB",
              "Effectuez le virement depuis votre banque en précisant votre nom et n° de police",
              "Transmettez le reçu de virement à votre agent",
              "Votre solde sera mis à jour sous 24–48h",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
