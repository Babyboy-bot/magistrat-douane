"use client";

import { Eye, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Emission } from "@/lib/types";

interface EmissionTableProps {
  emissions: Emission[];
  formatCurrency: (value: number) => string;
  onRequestPayment: (id: string) => void;
  onViewEmission: (id: string) => void;
}

export function EmissionTable({ emissions, formatCurrency, onRequestPayment, onViewEmission }: EmissionTableProps) {
  const totals = emissions.reduce(
    (acc, emission) => {
      acc.primeNette += emission.primeNette;
      acc.ttc += emission.primeTTC;
      acc.paye += emission.totalPaye ?? 0;
      acc.solde += emission.solde ?? 0;
      acc.commission += emission.montantCommission ?? 0;
      return acc;
    },
    { primeNette: 0, ttc: 0, paye: 0, solde: 0, commission: 0 }
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Risque</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Compagnie</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Police</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Effet</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Échéance</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Prime nette</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">TTC</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Payé</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Solde</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Commission</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emissions.map((emission) => {
                const totalPaid = emission.totalPaye ?? 0;
                const solde = emission.solde ?? 0;
                const commission = emission.montantCommission ?? 0;
                const isExpired = new Date(emission.echeance) < new Date();

                return (
                  <tr key={emission.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{emission.clientNom}</td>
                    <td className="px-4 py-3 text-sm">{emission.risque}</td>
                    <td className="px-4 py-3 text-sm">{emission.compagnie}</td>
                    <td className="px-4 py-3 text-xs font-mono">{emission.numPolice}</td>
                    <td className="px-4 py-3 text-sm">{emission.effet}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                        {emission.echeance}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(emission.primeNette)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(emission.primeTTC)}</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(totalPaid)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${solde > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(solde)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-purple-600">{formatCurrency(commission)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onViewEmission(emission.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {solde > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => onRequestPayment(emission.id)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={6} className="px-4 py-3 text-sm">
                  TOTAUX
                </td>
                <td className="px-4 py-3 text-right text-sm">{formatCurrency(totals.primeNette)}</td>
                <td className="px-4 py-3 text-right text-sm">{formatCurrency(totals.ttc)}</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(totals.paye)}</td>
                <td className="px-4 py-3 text-right text-sm text-red-600">{formatCurrency(totals.solde)}</td>
                <td className="px-4 py-3 text-right text-sm text-purple-600">{formatCurrency(totals.commission)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
