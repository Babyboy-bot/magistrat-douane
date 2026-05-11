"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Emission } from "@/lib/types";
import { emissionsApi, paiementsApi } from "@/lib/api";
import { toast } from "sonner";

interface PaymentDialogProps {
  emission: Emission | null;
  formatCurrency: (amount: number) => string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentDialog({ emission, formatCurrency, open, onClose, onSuccess }: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentObs, setPaymentObs] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!emission || !open) {
      setBalance(null);
      setBalanceError(null);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentObs("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      return;
    }
    // Pré-remplir méthode avec la dernière observation
    if (emission.paiements && emission.paiements.length > 0) {
      const last = emission.paiements[emission.paiements.length - 1];
      if (last.observations) setPaymentObs(last.observations);
    }
    let cancelled = false;
    const fetchBalance = async () => {
      setBalanceLoading(true);
      setBalanceError(null);
      try {
        const data = await emissionsApi.getBalance(emission.id);
        if (!cancelled) {
          setBalance(data.solde);
          setPaymentAmount(String(Math.round(data.solde)));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Impossible de récupérer le solde";
          setBalanceError(message);
          setBalance(null);
        }
      } finally {
        if (!cancelled) {
          setBalanceLoading(false);
        }
      }
    };

    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [emission, open]);

  const handleSubmit = async () => {
    if (!emission) return;
    if (!paymentAmount || !paymentRef) {
      toast.error("Veuillez remplir le montant et la référence");
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      await paiementsApi.create({
        emissionId: String(emission.id),
        dateReglement: paymentDate,
        reference: paymentRef,
        montantRegle: Number(paymentAmount),
        observations: paymentObs,
      });
      toast.success(`Paiement de ${formatCurrency(Number(paymentAmount))} enregistré`);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentObs("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setBalance((current) => (typeof current === "number" ? current - Number(paymentAmount) : current));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = useMemo(() => Number(paymentAmount) || 0, [paymentAmount]);
  const remainingAfterPayment = useMemo(() => {
    if (balance === null) return null;
    return balance - parsedAmount;
  }, [balance, parsedAmount]);

  const disableSubmit =
    !paymentAmount ||
    !paymentRef ||
    loading ||
    balanceLoading ||
    (typeof balance === "number" && parsedAmount > balance) ||
    parsedAmount <= 0;

  return (
    <Dialog open={open} onOpenChange={(state) => !state && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        {emission ? (
          <div className="space-y-4 pt-2">
            <div className="text-sm bg-gray-50 p-3 rounded-lg space-y-1">
              <p>
                <span className="text-gray-400">Client:</span> <strong>{emission.clientNom}</strong>
              </p>
              <p>
                <span className="text-gray-400">Solde restant:</span>{" "}
                {balanceLoading ? (
                  <span className="text-xs text-gray-500">Chargement...</span>
                ) : balanceError ? (
                  <span className="text-xs text-red-500">{balanceError}</span>
                ) : (
                  <strong className="text-red-600">{formatCurrency(balance ?? 0)}</strong>
                )}
              </p>
              {remainingAfterPayment !== null && (
                <p className="text-xs text-gray-500">
                  Reste après paiement : <strong>{formatCurrency(Math.max(remainingAfterPayment, 0))}</strong>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>N° Police</Label>
              <Input value={emission.numPolice} readOnly disabled className="bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <Label>Date de règlement <span className="text-red-500">*</span></Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Montant réglé (FCFA) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={balance ?? undefined}
                min={0}
                step="0.01"
              />
              {submitError && (
                <p className="text-xs text-red-500">{submitError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Référence paiement <span className="text-red-500">*</span></Label>
              <Input placeholder="PAY-2025-XXX" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Input placeholder="Virement RIB, Chèque, Espèces..." value={paymentObs} onChange={(e) => setPaymentObs(e.target.value)} />
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={disableSubmit}
              onClick={handleSubmit}
            >
              {loading ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sélectionnez une émission</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
