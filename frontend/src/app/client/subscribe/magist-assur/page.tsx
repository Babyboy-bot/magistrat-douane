"use client";

import { useEffect } from "react";
import { Shield, ArrowLeft, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MagistAssurPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isMagistrat = user?.professionType === "magistrat";
  const isVerified = Boolean(user?.verified);

  useEffect(() => {
    if (isMagistrat && isVerified) {
      router.replace("/client/subscribe/magist-assur/souscrire");
    }
  }, [isMagistrat, isVerified, router]);

  if (isMagistrat && !isVerified) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            MAGIST&apos;ASSUR
          </h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="h-16 w-16 text-amber-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Compte en attente de vérification</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              Votre compte magistrat doit d&apos;abord être vérifié par un agent ACS avant de souscrire à MAGIST&apos;ASSUR.
              Vous serez notifié dès l&apos;activation de vos accès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMagistrat) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            MAGIST&apos;ASSUR
          </h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Accès réservé aux magistrats</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              MAGIST&apos;ASSUR est le programme d&apos;assurance vie exclusivement réservé aux magistrats de Côte d&apos;Ivoire.
            </p>
            <Link href="/client/profile">
              <Button variant="outline" className="mt-6">Modifier mon profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
