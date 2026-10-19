"use client";

import { useEffect } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Locked({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl space-y-4 py-4">
      <button onClick={() => router.push("/client/dashboard")} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Tableau de bord
      </button>
      <div className="overflow-hidden rounded-3xl border border-navy-100 bg-white text-center shadow-[0_24px_60px_-32px_rgb(16_28_52/0.35)]">
        <div className="bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-navy-700),var(--color-navy-950))] px-8 py-10">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-white">Magist&apos;Assur</h1>
          <p className="mt-1 text-xs text-white/55">Assurance vie des magistrats — NSIA Vie Assurances</p>
        </div>
        <div className="p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold text-navy-900">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-navy-500">{children}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

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
      <Locked title="Compte en attente de vérification">
        Votre compte magistrat doit d&apos;abord être vérifié par un agent ACS avant de souscrire.
        Vous serez notifié dès l&apos;activation de vos accès.
      </Locked>
    );
  }

  if (!isMagistrat) {
    return (
      <Locked
        title="Programme réservé aux magistrats"
        action={
          <Link href="/client/profile">
            <Button variant="outline" className="mt-6 rounded-xl">Voir mon profil</Button>
          </Link>
        }
      >
        Magist&apos;Assur est le programme d&apos;assurance vie exclusivement réservé aux magistrats de Côte d&apos;Ivoire.
      </Locked>
    );
  }

  return null;
}
