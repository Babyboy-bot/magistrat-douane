import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Emission } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function mapEmission(data: Record<string, any>): Emission {
  return {
    id: String(data.id),
    clientId: String(data.client_id ?? data.client),
    clientNom: data.client_nom as string,
    date: data.date as string,
    risque: data.risque as string,
    compagnie: data.compagnie as string,
    numFacture: data.num_facture as string,
    numPolice: data.num_police as string,
    marque: data.marque as string,
    immatriculation: data.immatriculation as string,
    effet: data.effet as string,
    echeance: data.echeance as string,
    primeNette: Number(data.prime_nette),
    primeTTC: Number(data.prime_ttc),
    situation: data.situation,
    paiements: Array.isArray(data.paiements)
      ? data.paiements.map((p: Record<string, any>) => ({
          id: String(p.id),
          emissionId: String(p.emission_id ?? p.emission ?? data.id),
          dateReglement: p.date_reglement as string,
          reference: p.reference as string,
          montantRegle: Number(p.montant_regle),
          observations: p.observations as string | undefined,
        }))
      : [],
  };
}

async function fetchEmission(id: string): Promise<Emission | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const response = await fetch(`${API_BASE}/api/emissions/${id}/`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error("Emission detail fetch error", await response.text());
      return null;
    }
    const data = await response.json();
    return mapEmission(data);
  } catch (error) {
    console.error("Emission detail fetch error", error);
    return null;
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

interface PageProps {
  params: { id: string };
}

export default async function EmissionDetailPage({ params }: PageProps) {
  const { id } = params;
  const emission = await fetchEmission(id);

  if (!emission) {
    notFound();
  }

  const totalPaid = emission.paiements.reduce((sum, paiement) => sum + paiement.montantRegle, 0);
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
                      <span>
                        {paiement.dateReglement} — {paiement.reference}
                      </span>
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
