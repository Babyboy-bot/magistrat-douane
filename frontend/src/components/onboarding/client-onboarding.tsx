"use client";

import { useRouter } from "next/navigation";
import {
  MailCheck, BadgeCheck, Send, Vault, HeartHandshake, Car,
  History, Bell, FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  OnboardingShell, OnboardingHelpButton, StepWelcome, StepFinal,
  StepTitle, InfoRow, useOnboardingGate,
} from "./shell";
import { TiltCard } from "./tilt-card";
import { AnimatedCheck } from "./animated-check";

function StepCompte({ user, hasRequests }: { user: User; hasRequests: boolean }) {
  const items = [
    {
      icon: MailCheck,
      label: "Email vérifié",
      hint: "Confirmation de votre adresse",
      done: user.emailVerified,
      todo: "Vérifiez votre boîte mail (et les spams)",
    },
    {
      icon: BadgeCheck,
      label: "Compte validé",
      hint: "Validation par un conseiller ACS",
      done: user.verified,
      todo: "Un conseiller valide votre dossier sous 24 h",
    },
    {
      icon: Send,
      label: "Première demande",
      hint: "Cotation ou souscription envoyée",
      done: hasRequests,
      todo: "Lancez votre première souscription",
    },
  ];
  return (
    <div className="w-full max-w-md">
      <StepTitle title="Votre compte, en un coup d'œil" sub="Trois étapes pour profiter de tout l'espace." />
      <div className="mt-8 space-y-3">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={cn(
              "flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-sm transition-colors duration-500",
              it.done ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/10 bg-white/5",
            )}
            style={{ animation: `acs-rise 0.5s ease-out ${i * 140}ms both` }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-300 ring-1 ring-white/10">
              <it.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{it.label}</p>
              <p className="truncate text-xs text-slate-400">{it.done ? it.hint : it.todo}</p>
            </div>
            <AnimatedCheck done={it.done} delay={300 + i * 140} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepProduits({ user }: { user: User }) {
  const isMagistrat = user.professionType === "magistrat";
  const cards = [
    {
      icon: Vault,
      title: "Épargne retraite",
      desc: "Constituez un capital retraite avec avantages fiscaux Magist'Assur.",
      tag: isMagistrat ? "Disponible" : "Réservé magistrats",
      ready: isMagistrat,
      grad: "from-amber-400 to-amber-600",
    },
    {
      icon: HeartHandshake,
      title: "Prévoyance",
      desc: "Protégez vos proches : capital versé en cas de coup dur.",
      tag: isMagistrat ? "Disponible" : "Réservé magistrats",
      ready: isMagistrat,
      grad: "from-rose-400 to-rose-600",
    },
    {
      icon: Car,
      title: "Auto & Habitation",
      desc: "Cotations automobile et multirisque habitation classiques.",
      tag: "Bientôt",
      ready: false,
      grad: "from-sky-400 to-sky-600",
    },
  ];
  return (
    <div className="w-full max-w-3xl">
      <StepTitle title="Vos produits d'assurance" sub="Survolez les cartes — tout commence par une souscription." />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div key={c.title} style={{ animation: `acs-rise 0.55s ease-out ${i * 120}ms both` }}>
            <TiltCard className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div style={{ transform: "translateZ(30px)" }}>
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", c.grad)}>
                  <c.icon className="h-5 w-5 text-white" />
                </span>
                <p className="mt-4 font-semibold text-white">{c.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{c.desc}</p>
                <span
                  className={cn(
                    "mt-4 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1",
                    c.ready
                      ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                      : "bg-white/10 text-slate-300 ring-white/15",
                  )}
                >
                  {c.tag}
                </span>
              </div>
            </TiltCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepEspace() {
  const features = [
    { icon: History, title: "Suivi en temps réel", desc: "Chaque demande a sa frise de progression — de la soumission à la clôture." },
    { icon: Bell, title: "Notifications instantanées", desc: "Devis reçu, demande traitée : vous êtes alerté sans recharger." },
    { icon: FileText, title: "Documents centralisés", desc: "Attestations et contrats téléchargeables depuis votre historique." },
  ];
  return (
    <div className="w-full max-w-2xl">
      <StepTitle title="Pensé pour vous" sub="Les outils qui font la différence au quotidien." />
      <div className="mt-8 space-y-4">
        {features.map((f, i) => (
          <InfoRow key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 130} />
        ))}
      </div>
    </div>
  );
}

export function ClientOnboarding() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const { open, setOpen, close } = useOnboardingGate(
    initialized && user ? `acs_onboarding_v1_client_${user.id}` : null,
  );
  const { data: requests } = useClientRequests(user?.id);
  const hasRequests = (requests ?? []).length > 0;

  if (!user) return null;

  const finish = () => {
    close();
    router.push("/client/dashboard");
  };

  const steps = [
    <StepWelcome
      key="w"
      eyebrow="Magist'Assur"
      name={user.prenoms?.split(" ")[0]}
      tagline="Votre espace assurance est prêt. En 30 secondes, découvrez comment suivre vos contrats, vos demandes et vos documents — le tout en temps réel."
    />,
    <StepCompte key="c" user={user} hasRequests={hasRequests} />,
    <StepProduits key="p" user={user} />,
    <StepEspace key="e" />,
    <StepFinal
      key="f"
      title="Vous êtes prêt"
      desc="Votre espace vous attend. Suivez vos demandes en direct, retrouvez vos documents et échangez avec votre conseiller dédié."
      cta="Accéder à mon espace"
      onFinish={finish}
    />,
  ];

  return (
    <>
      {!open && <OnboardingHelpButton onClick={() => setOpen(true)} />}
      {open && <OnboardingShell steps={steps} onClose={close} />}
    </>
  );
}
