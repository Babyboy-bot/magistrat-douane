"use client";

import { useEffect } from "react";
import { CreditCard, ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useClientEmissions } from "@/hooks/use-api-data";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PaymentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: emissions } = useClientEmissions(user?.id || "");

  useEffect(() => {
    if (user && !user.verified) {
      toast.error("Compte non vérifié — accès restreint.");
      router.replace("/client/dashboard");
    }
  }, [user, router]);

  if (!user?.verified) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const unpaid = emissions?.filter((e) => (e.solde ?? 0) > 0);

  const handlePay = () => {
    toast.info("Redirection vers la plateforme de paiement CinetPay...");
    setTimeout(() => {
      toast.success("Simulation: paiement effectué avec succès");
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-green-600" />
            Payer en ligne
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Réglez vos primes via CinetPay</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Moyens de paiement acceptés :</strong> Wave, Orange Money, MTN Money, Moov Money, Cartes bancaires (Visa, Mastercard)
        </p>
      </div>

      {unpaid.length > 0 ? (
        <div className="space-y-3">
          {unpaid.map((e) => {
            const totalPaye = e.totalPaye ?? 0;
            const solde = e.solde ?? 0;

            return (
              <Card key={e.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{e.risque}</h3>
                        <Badge variant="outline" className="text-xs">{e.compagnie}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Police: {e.numPolice} • {e.marque !== "-" ? e.marque : ""}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-500">TTC: {formatCurrency(e.primeTTC)}</span>
                        <span className="text-green-600">Payé: {formatCurrency(totalPaye)}</span>
                        <span className="text-red-600 font-semibold">Reste: {formatCurrency(solde)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handlePay}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Payer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <CreditCard className="h-16 w-16 text-green-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Aucun impayé</h3>
            <p className="text-sm text-gray-400 mt-1">Toutes vos primes sont à jour.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
