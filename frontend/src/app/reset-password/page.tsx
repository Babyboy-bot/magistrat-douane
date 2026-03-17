"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      toast.error("Veuillez saisir votre email ou numéro de téléphone");
      return;
    }
    setLoading(true);
    try {
      const { message } = await authApi.resetPassword(identifier);
      setSent(true);
      toast.success(message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Shield className="h-8 w-8 text-[hsl(222,47%,20%)]" />
          <div>
            <h1 className="text-2xl font-bold text-[hsl(222,47%,20%)]">ACS</h1>
            <p className="text-amber-600 text-sm font-medium">Magistrat & Douane</p>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold">Réinitialisation</CardTitle>
            <CardDescription>
              {sent
                ? "Un nouveau mot de passe vous a été envoyé"
                : "Saisissez votre email ou numéro de téléphone pour recevoir un nouveau mot de passe"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 text-sm">
                    Un nouveau mot de passe a été envoyé à <strong>{identifier}</strong>.
                    Vous pourrez le modifier dans votre espace personnel après connexion.
                  </p>
                </div>
                <Link href="/login">
                  <Button className="w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email ou Téléphone</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="exemple@email.com ou +225 XX XX XX XX"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Réinitialiser mon Mot de Passe
                    </span>
                  )}
                </Button>
              </form>
            )}

            {!sent && (
              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-500 hover:text-[hsl(222,47%,20%)] inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
