"use client";

import { Shield, ArrowLeft, Lock, TrendingUp, Heart, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MagistAssurPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isMagistrat = user?.professionType === "magistrat";

  if (!isMagistrat) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            MAGIST&apos;ASSUR
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Assurance vie des magistrats — NSIA Vie Assurances</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-5 text-white">
        <p className="text-sm font-medium opacity-90">Bienvenue, {user.nom} {user.prenoms}</p>
        <p className="text-lg font-bold mt-1">Après avoir rendu justice, assurez votre avenir.</p>
        <p className="text-sm opacity-75 mt-1">Magistrats de 18 à 68 ans éligibles</p>
      </div>

      <p className="text-sm font-semibold text-gray-700 px-1">Choisissez votre produit</p>

      {/* ÉPARGNE */}
      <Link href="/client/subscribe/magist-assur/epargne" className="block">
        <Card className="border-2 border-transparent hover:border-purple-400 hover:shadow-md transition cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">MAGIST&apos;ASSUR ÉPARGNE</h3>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">Capital retraite</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Constituez une épargne sécurisée pour votre retraite. Capital transmis à votre famille en cas de décès.
                </p>
                <div className="space-y-1">
                  {[
                    "25 000 FCFA min / mois",
                    "Taux garanti 3,5% / an + participations bénéfices",
                    "Durée libre selon vos objectifs",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3 w-3 text-purple-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* PRÉVOYANCE */}
      <Link href="/client/subscribe/magist-assur/prevoyance" className="block">
        <Card className="border-2 border-transparent hover:border-amber-400 hover:shadow-md transition cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Heart className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">MAGIST&apos;ASSUR PRÉVOYANCE</h3>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">Protection famille</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Protégez votre famille. Capital décès et frais funéraires pour vous et vos proches.
                </p>
                <div className="space-y-1">
                  {[
                    "Prévoyance Décès : 45 000 FCFA/an → 10 000 000 FCFA",
                    "Frais Funéraires : 58 000 FCFA/an (conjoint, enfants, parents)",
                    "Couverture annuelle renouvelable",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <p className="text-xs text-center text-gray-400">
        Vous pouvez souscrire aux deux produits simultanément. CNI et RIB requis à la souscription.
      </p>
    </div>
  );
}
