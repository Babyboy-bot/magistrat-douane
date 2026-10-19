"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Emission } from "@/lib/types";
import { emissionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/brand";
import { ArrowLeft, Loader2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function EmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [emission, setEmission] = useState<Emission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    emissionsApi.getById(id)
      .then(setEmission)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-navy-300" />
      </div>
    );
  }

  if (error || !emission) {
    return (
      <div className="space-y-3 py-20 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50">
          <FileWarning className="h-5 w-5 text-navy-300" />
        </div>
        <p className="text-navy-400">Émission introuvable.</p>
        <Button variant="outline" className="rounded-xl border-navy-200" onClick={() => router.push("/agent/emissions")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux émissions
        </Button>
      </div>
    );
  }

  const totalPaid = emission.paiements.reduce((sum, p) => sum + p.montantRegle, 0);
  const solde = emission.primeTTC - totalPaid;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4">
      <span className="text-navy-400">{label}</span>
      <span className="text-right font-medium text-navy-900">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Émission #${emission.numPolice}`}
        title={emission.clientNom}
        description={emission.compagnie}
        actions={
          <Link href="/agent/emissions">
            <Button variant="outline" className="rounded-xl border-navy-200">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour aux émissions
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold text-navy-900">Informations contrat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Risque" value={emission.risque} />
            <div className="flex justify-between gap-4">
              <span className="text-navy-400">Situation</span>
              <Badge className="border-navy-200 bg-navy-100 text-navy-700">{emission.situation}</Badge>
            </div>
            <Separator />
            <Row label="Prime nette" value={formatCurrency(emission.primeNette)} />
            <Row label="Prime TTC" value={<span className="font-semibold">{formatCurrency(emission.primeTTC)}</span>} />
            <Separator />
            <Row label="Effet" value={emission.effet} />
            <Row label="Échéance" value={emission.echeance} />
            {emission.marque && emission.marque !== "-" && (
              <>
                <Separator />
                <Row label="Marque" value={emission.marque} />
                <Row label="Immatriculation" value={emission.immatriculation} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold text-navy-900">Suivi financier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total payé" value={<span className="text-emerald-700">{formatCurrency(totalPaid)}</span>} />
            <div className="flex justify-between gap-4">
              <span className="text-navy-400">Solde restant</span>
              <span className={solde > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
                {formatCurrency(Math.max(solde, 0))}
              </span>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-navy-400">Paiements</p>
              {emission.paiements.length === 0 ? (
                <p className="text-xs text-navy-300">Aucun paiement enregistré.</p>
              ) : (
                <ul className="space-y-2">
                  {emission.paiements.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span className="text-navy-700">{p.dateReglement} — {p.reference}</span>
                      <span className="font-medium text-emerald-700">{formatCurrency(p.montantRegle)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
