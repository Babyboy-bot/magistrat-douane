"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Shield, ClipboardList, Bell, MousePointerClick,
  Command as CommandIcon, Zap, Play, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { ClientHoverCard } from "@/components/client-hover-card";
import { RequestTimeline } from "@/components/request-timeline";
import { useAuthStore } from "@/stores/auth-store";
import type { User, RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  OnboardingShell, OnboardingHelpButton, StepWelcome, StepFinal,
  StepTitle, InfoRow, useOnboardingGate,
} from "./shell";
import { AnimatedCheck } from "./animated-check";

const DEMO_CLIENTS: User[] = [
  {
    id: "demo-1", nom: "KOUASSI", prenoms: "Aya", profession: "Magistrat",
    professionType: "magistrat", telephone: "0707001122", email: "aya.kouassi@exemple.ci",
    emailVerified: true, role: "client", verified: true, accountStatus: "verified",
    riskLevel: "standard", createdAt: "", is_active: true,
  },
  {
    id: "demo-2", nom: "TRAORE", prenoms: "Moussa", profession: "Douanier",
    professionType: "douanier", telephone: "0505334455", email: "m.traore@exemple.ci",
    emailVerified: false, role: "client", verified: false, accountStatus: "pending_verification",
    riskLevel: "standard", createdAt: "", is_active: true,
  },
  {
    id: "demo-3", nom: "BAMBA", prenoms: "Fatou", profession: "Magistrat",
    professionType: "magistrat", telephone: "0101667788", email: "f.bamba@exemple.ci",
    emailVerified: true, role: "client", verified: true, accountStatus: "verified",
    riskLevel: "premium", createdAt: "", is_active: true,
  },
];

const WORKFLOW: RequestStatus[] = ["en_attente", "en_cours", "devis_envoye", "traite"];
const WORKFLOW_LABELS: Record<RequestStatus, string> = {
  en_attente: "Demande reçue", en_cours: "Agent en charge", devis_envoye: "Devis envoyé",
  en_revision: "Révision", valide: "Validé", refuse: "Refusé", traite: "Dossier clôturé",
};

/* ── Étape missions ────────────────────────────────────────────────────── */

function StepMissions() {
  const missions = [
    {
      icon: BadgeCheck,
      title: "Valider les comptes",
      desc: "Vérifiez l'identité des nouveaux assurés directement depuis leur fiche client.",
    },
    {
      icon: Shield,
      title: "Piloter Magist'Assur",
      desc: "Suivez les souscriptions épargne et prévoyance : pièces, n° de police, statut.",
    },
    {
      icon: ClipboardList,
      title: "Répondre aux demandes",
      desc: "Cotations, sinistres, modifications : votre file de traitement arrive bientôt.",
    },
  ];
  return (
    <div className="w-full max-w-2xl">
      <StepTitle title="Votre mission" sub="Trois responsabilités, un seul tableau de bord." />
      <div className="mt-8 space-y-4">
        {missions.map((m, i) => (
          <InfoRow key={m.title} icon={m.icon} title={m.title} desc={m.desc} delay={i * 130} />
        ))}
      </div>
    </div>
  );
}

/* ── Étape interactive : mini-défis ────────────────────────────────────── */

function ChallengeRow({
  done, icon: Icon, title, children,
}: { done: boolean; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 backdrop-blur-sm transition-colors duration-500",
        done ? "border-emerald-400/25 bg-emerald-400/5" : "border-white/10 bg-white/5",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-300 ring-1 ring-white/10">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="flex-1 text-sm font-semibold text-white">{title}</p>
        <AnimatedCheck done={done} />
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StepTry() {
  const [done, setDone] = useState({ cmd: false, hover: false, notif: false });
  const [demoOpen, setDemoOpen] = useState(false);
  const [found, setFound] = useState<string | null>(null);

  // Défi 1 — le vrai raccourci Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setDemoOpen(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const allDone = done.cmd && done.hover && done.notif;

  return (
    <div className="w-full max-w-lg">
      <StepTitle title="À vous de jouer" sub="Trois mini-défis pour prendre vos outils en main — une minute chrono." />

      <div className="mt-7 space-y-3">
        <ChallengeRow done={done.cmd} icon={CommandIcon} title="Ouvrez la recherche rapide">
          {!demoOpen ? (
            <p className="text-xs text-slate-400">
              Appuyez sur{" "}
              <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">Ctrl</kbd>
              {" + "}
              <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">K</kbd>
              {" "}— le raccourci des pros.
            </p>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {found ? (
                <p className="text-xs text-emerald-300">Client trouvé : <span className="font-semibold">{found}</span> — exactement comme ça en vrai.</p>
              ) : (
                <Command className="rounded-xl border border-navy-100 bg-white shadow-xl">
                  <CommandInput placeholder="Cherchez « KOUASSI »…" />
                  <CommandList className="max-h-36">
                    <CommandEmpty>Aucun client.</CommandEmpty>
                    <CommandGroup>
                      {DEMO_CLIENTS.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.nom} ${c.prenoms} ${c.email}`}
                          onSelect={() => {
                            setFound(`${c.nom} ${c.prenoms}`);
                            setDone((d) => ({ ...d, cmd: true }));
                          }}
                          className="cursor-pointer"
                        >
                          <span className="text-sm font-medium text-navy-900">{c.nom} {c.prenoms}</span>
                          <span className="ml-2 text-xs text-navy-400">{c.profession}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </div>
          )}
        </ChallengeRow>

        <ChallengeRow done={done.hover} icon={MousePointerClick} title="Survolez une fiche client">
          <ClientHoverCard client={DEMO_CLIENTS[0]} contentClassName="z-[120]">
            <div
              onMouseEnter={() => setDone((d) => ({ ...d, hover: true }))}
              className="cursor-default rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-amber-400/40"
            >
              <p className="text-sm font-semibold text-white">KOUASSI Aya</p>
              <p className="text-xs text-slate-400">Magistrat · 07 07 00 11 22 — laissez la souris dessus…</p>
            </div>
          </ClientHoverCard>
        </ChallengeRow>

        <ChallengeRow done={done.notif} icon={Bell} title="Recevez une notification">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.success("Dossier RQ-2026-042 clôturé", {
                description: "KOUASSI Aya — Prévoyance Magist'Assur, traité par vous.",
              });
              setDone((d) => ({ ...d, notif: true }));
            }}
            className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 hover:text-white"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
            Simuler une notification
          </Button>
        </ChallengeRow>
      </div>

      {allDone && (
        <p className="mt-5 animate-in fade-in slide-in-from-bottom-2 text-center text-sm font-medium text-emerald-300 duration-500">
          Parfait — vous maîtrisez déjà les trois gestes clés.
        </p>
      )}
    </div>
  );
}

/* ── Étape workflow interactive ────────────────────────────────────────── */

function StepWorkflow() {
  const [i, setI] = useState(0);
  const status = WORKFLOW[i];

  return (
    <div className="w-full max-w-xl">
      <StepTitle title="Le cycle d'une demande" sub="Chaque dossier suit ce parcours — le client voit la même frise que vous." />

      <div className="mx-auto mt-8 max-w-lg rounded-2xl bg-white p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]" style={{ animation: "acs-rise 0.5s ease-out 100ms both" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy-900">Souscription Magist&apos;Assur — Épargne</p>
            <p className="text-xs text-navy-400">RQ-2026-0042 · KOUASSI Aya</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            {WORKFLOW_LABELS[status]}
          </span>
        </div>
        <RequestTimeline status={status} />
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Button
          size="sm"
          onClick={() => setI((v) => Math.min(v + 1, WORKFLOW.length - 1))}
          disabled={i === WORKFLOW.length - 1}
          className="bg-amber-400 font-semibold text-navy-950 hover:bg-amber-300 disabled:opacity-40"
        >
          <Play className="mr-1.5 h-3.5 w-3.5" /> Faire avancer le dossier
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setI(0)}
          className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 hover:text-white"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Rejouer
        </Button>
      </div>
    </div>
  );
}

/* ── Entrée ────────────────────────────────────────────────────────────── */

export function AgentOnboarding() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const { open, setOpen, close } = useOnboardingGate(
    initialized && user ? `acs_onboarding_v1_agent_${user.id}` : null,
  );

  if (!user) return null;

  const finish = () => {
    close();
    router.push("/agent/dashboard");
  };

  const steps = [
    <StepWelcome
      key="w"
      eyebrow="Espace Agent"
      name={user.prenoms?.split(" ")[0]}
      tagline="Gérez vos assurés, validez les comptes et pilotez les dossiers Magist'Assur — tout depuis votre tableau de bord."
    />,
    <StepMissions key="m" />,
    <StepTry key="t" />,
    <StepWorkflow key="w2" />,
    <StepFinal
      key="f"
      title="À vos marques"
      desc="Votre file de dossiers vous attend. La palette Ctrl+K deviendra vite votre réflexe."
      cta="Ouvrir mon espace"
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
