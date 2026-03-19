"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Emission } from "@/lib/types";
import { emissionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function EmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [emission, setEmission] = useState<Emission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    emissionsApi.getById(id)
      .then(setEmission)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400">Chargement...</div>;
  }

  if (notFound || !emission) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-gray-500">Émission introuvable.</p>
        <Link href="/agent/emissions" className="text-sm text-primary hover:underline">← Retour aux émissions</Link>
      </div>
    );
  }

  const totalPaid = emission.paiements.reduce((sum, p) => sum + p.montantRegle, 0);
  const solde = emission.primeTTC - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Émission #{emission.numPolice}</p>
          <h1 className="text-2xl font-bold">{emission.clientNom}</h1>
          <p className="text-gray-500">{emission.compagnie}</p>
        </div>
        <Link href="/agent/emissions" className="text-sm text-primary hover:underline">
          ← Retour aux émissions
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations contrat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Risque</span>
              <span>{emission.risque}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Situation</span>
              <Badge variant="secondary">{emission.situation}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-500">Prime nette</span>
              <span>{formatCurrency(emission.primeNette)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Prime TTC</span>
              <span className="font-semibold">{formatCurrency(emission.primeTTC)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-500">Effet</span>
              <span>{emission.effet}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Échéance</span>
              <span>{emission.echeance}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suivi financier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total payé</span>
              <span className="text-green-600 font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Solde restant</span>
              <span className={solde > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                {formatCurrency(Math.max(solde, 0))}
              </span>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-gray-500">Paiements</p>
              {emission.paiements.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun paiement enregistré.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {emission.paiements.map((paiement) => (
                    <li key={paiement.id} className="flex justify-between">
                      <span>{paiement.dateReglement} — {paiement.reference}</span>
                      <span className="text-green-600">{formatCurrency(paiement.montantRegle)}</span>
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
