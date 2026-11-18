"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, LogIn, Info, ArrowRight, ArrowLeft,
  ShieldCheck, Users, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { BrandEmblem } from "@/components/brand";
import type { Profession } from "@/lib/types";

type Mode = "login" | "register";

const EASE = "ease-[cubic-bezier(0.65,0,0.35,1)]";

const getDashboardUrl = (role?: string): string => {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "agent": return "/agent/dashboard";
    default: return "/client/dashboard";
  }
};

/* ── Formulaire de connexion ── */
function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const success = await login(identifier, password);
    if (success) {
      toast.success("Connexion réussie");
      router.replace(getDashboardUrl(useAuthStore.getState().user?.role));
    } else {
      toast.error("Identifiants incorrects");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-navy-900">Connexion</h2>
      <p className="mt-1.5 text-sm text-navy-400">Accédez à votre espace personnel sécurisé</p>

      <form onSubmit={handleLogin} className="mt-7 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email ou numéro de téléphone</Label>
          <Input
            id="identifier" type="text" autoComplete="username"
            placeholder="Votre email ou numéro de téléphone"
            value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password" type={showPassword ? "text" : "password"}
              placeholder="Votre mot de passe" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10"
            />
            <button
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/reset-password"
            className="text-sm font-medium text-navy-700 hover:text-amber-700 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connexion...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Se connecter
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

/* ── Formulaire d'inscription ── */
function RegisterForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenoms: "",
    professionType: "" as Profession | "",
    professionDetail: "",
    telephone: "+225 ",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nom, prenoms, professionType, telephone, email, password, confirmPassword } = form;

    if (!nom || !prenoms || !professionType || !telephone.replace(/^\+225\s*$/, "").trim() || !email || !password || !confirmPassword) {
      toast.error("Tous les champs obligatoires doivent être remplis");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        nom,
        prenoms,
        profession: form.professionDetail,
        profession_type: professionType,
        telephone,
        email,
        password,
      });

      const loginSuccess = await login(email, password);
      if (loginSuccess) {
        toast.success("Inscription réussie ! Vous êtes maintenant connecté.");
        const dashboardUrl = getDashboardUrl(useAuthStore.getState().user?.role);
        setTimeout(() => { window.location.href = dashboardUrl; }, 800);
      } else {
        toast.success("Inscription réussie ! Veuillez vous connecter.");
        router.push("/login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-navy-900">Inscription</h2>
      <p className="mt-1.5 text-sm text-navy-400">Créez votre compte pour accéder à la plateforme</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" placeholder="KOUASSI" value={form.nom}
              onChange={(e) => handleChange("nom", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prenoms">Prénoms *</Label>
            <Input id="prenoms" placeholder="Jean-Baptiste" value={form.prenoms}
              onChange={(e) => handleChange("prenoms", e.target.value)} className="h-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Vous êtes <span className="text-red-500">*</span></Label>
          <Select value={form.professionType} onValueChange={(v) => handleChange("professionType", v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Sélectionnez votre catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="magistrat">Magistrat</SelectItem>
              <SelectItem value="douanier">Douanier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="professionDetail">Précisez votre fonction *</Label>
          <Input
            id="professionDetail"
            placeholder={
              form.professionType === "magistrat" ? "Ex: Juge d'instruction, Procureur..."
              : form.professionType === "douanier" ? "Ex: Inspecteur des douanes, Contrôleur..."
              : "Votre profession"
            }
            value={form.professionDetail}
            onChange={(e) => handleChange("professionDetail", e.target.value)}
            className="h-10"
          />
        </div>

        {(form.professionType === "magistrat" || form.professionType === "douanier") && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-xs leading-relaxed text-amber-800">
              <strong>Note :</strong> Votre compte devra être vérifié par un agent ACS.
              L&apos;accès sera actif après validation de votre identité professionnelle (sous 24h ouvrées).
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone *</Label>
          <Input id="telephone" type="tel" placeholder="+225 XX XX XX XX XX"
            value={form.telephone} onChange={(e) => handleChange("telephone", e.target.value)} className="h-10" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" placeholder="exemple@email.com" required
            value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="h-10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Mot de passe *</Label>
            <div className="relative">
              <Input
                id="reg-password" type={showPassword ? "text" : "password"}
                placeholder="Min. 8 caractères" autoComplete="new-password"
                value={form.password} onChange={(e) => handleChange("password", e.target.value)}
                className="h-10 pr-9"
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmation *</Label>
            <Input
              id="confirmPassword" type="password" placeholder="Retapez-le" autoComplete="new-password"
              value={form.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-1 h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Inscription...
            </span>
          ) : (
            "M'inscrire"
          )}
        </Button>
      </form>
    </div>
  );
}

/* ── Panneau overlay (CTA dans le volet coulissant) ── */
function OverlayPanel({
  visible, direction, emblem, title, lead, cta, ctaIcon: CtaIcon, onSwitch, compact = false,
}: {
  visible: boolean;
  direction: "left" | "right" | "up" | "down";
  title: React.ReactNode;
  lead: string;
  cta: string;
  ctaIcon: typeof ArrowRight;
  emblem?: boolean;
  onSwitch: () => void;
  compact?: boolean;
}) {
  const hiddenSlide = {
    left: "-translate-x-1/3",
    right: "translate-x-1/3",
    up: "-translate-y-1/3",
    down: "translate-y-1/3",
  }[direction];

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center text-center text-white transition-all duration-700",
        compact ? "gap-3 p-6" : "gap-6 p-12",
        EASE,
        visible
          ? "translate-x-0 translate-y-0 opacity-100 delay-200"
          : cn("pointer-events-none opacity-0", hiddenSlide),
      )}
    >
      {emblem && <BrandEmblem variant="dark" className={compact ? "w-14 opacity-95" : "w-24 opacity-95"} />}
      <div className="space-y-3">
        <h3 className={cn("font-display font-semibold leading-tight", compact ? "text-2xl" : "text-3xl")}>{title}</h3>
        <p className={cn("mx-auto max-w-xs leading-relaxed text-white/65", compact ? "text-xs" : "text-sm")}>{lead}</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.currentTarget.blur(); onSwitch(); }}
        className={cn(
          "group mt-1 inline-flex items-center gap-2.5 rounded-full border-2 border-white/40 font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:border-amber-300 hover:bg-amber-300 hover:text-navy-950",
          compact ? "px-6 py-2 text-[11px]" : "px-8 py-2.5 text-[13px]",
        )}
      >
        {cta}
        <CtaIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </div>
  );
}

/* ── Composant principal : carte à panneau coulissant ── */
export function AuthSlider({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const isLogin = mode === "login";

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(getDashboardUrl(user.role));
    }
  }, [isAuthenticated, user, router]);

  // L'URL suit le mode actif (/login ↔ /register) sans rechargement.
  useEffect(() => {
    window.history.replaceState(null, "", isLogin ? "/login" : "/register");
  }, [isLogin]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-ivory p-4 sm:p-6 lg:p-10">
      {/* halo décoratif d'arrière-plan */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-navy-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

      {/* ══════════ Desktop : carte à panneau coulissant ══════════ */}
      <div className="relative hidden min-h-[740px] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-30px_rgb(16_28_52/0.45)] ring-1 ring-navy-100 lg:block">

        {/* Moitié gauche : formulaire de connexion */}
        <div
          aria-hidden={!isLogin}
          className={cn(
            "absolute inset-y-0 left-0 w-1/2 transition-all duration-700", EASE,
            isLogin ? "translate-x-0 opacity-100 delay-200" : "pointer-events-none -translate-x-12 opacity-0",
          )}
        >
          <div className="flex h-full flex-col justify-center overflow-y-auto px-12 py-10 xl:px-16">
            <LoginForm />
          </div>
        </div>

        {/* Moitié droite : formulaire d'inscription */}
        <div
          aria-hidden={isLogin}
          className={cn(
            "absolute inset-y-0 right-0 w-1/2 transition-all duration-700", EASE,
            !isLogin ? "translate-x-0 opacity-100 delay-200" : "pointer-events-none translate-x-12 opacity-0",
          )}
        >
          <div className="flex h-full flex-col justify-center overflow-y-auto px-12 py-10 xl:px-16">
            <RegisterForm />
          </div>
        </div>

        {/* Panneau coulissant marine */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-10 w-1/2 overflow-hidden transition-transform duration-700", EASE,
            isLogin ? "translate-x-full" : "translate-x-0",
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(130%_130%_at_20%_0%,var(--color-navy-700)_0%,var(--color-navy-900)_50%,var(--color-navy-950)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_26px,rgb(255_255_255/0.025)_26px_27px)]" />
          <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          {/* Face "→ inscription" : visible quand le panneau couvre l'inscription (mode login) */}
          <OverlayPanel
            visible={isLogin}
            direction="left"
            emblem
            title={<>Nouveau sur <span className="text-amber-300">ACS</span> ?</>}
            lead="Rejoignez la plateforme réservée aux magistrats et douaniers. Créez votre compte en quelques minutes."
            cta="Créer un compte"
            ctaIcon={ArrowRight}
            onSwitch={() => setMode("register")}
          />

          {/* Face "→ connexion" : visible quand le panneau couvre la connexion (mode register) */}
          <OverlayPanel
            visible={!isLogin}
            direction="right"
            title={<>Bon retour <span className="text-amber-300">parmi nous</span></>}
            lead="Vous avez déjà un compte ? Connectez-vous pour retrouver vos contrats et vos demandes."
            cta="Se connecter"
            ctaIcon={ArrowLeft}
            onSwitch={() => setMode("login")}
          />

          {/* Liseré de confiance en bas du panneau */}
          <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-6 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-amber-300/70" />Données chiffrées</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-300/70" />Magistrats &amp; douaniers</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-amber-300/70" />Accès sécurisé</span>
          </div>
        </div>
      </div>

      {/* ══════════ Mobile / tablette : même carte, panneau marine en haut ══════════ */}
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-30px_rgb(16_28_52/0.45)] ring-1 ring-navy-100 lg:hidden">

        {/* Panneau marine — mêmes faces qu'en desktop, glissement vertical */}
        <div className="relative min-h-[280px] shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(130%_130%_at_20%_0%,var(--color-navy-700)_0%,var(--color-navy-900)_50%,var(--color-navy-950)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_26px,rgb(255_255_255/0.025)_26px_27px)]" />
          <div className="pointer-events-none absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />

          {/* Face "→ inscription" */}
          <OverlayPanel
            visible={isLogin}
            direction="up"
            compact
            emblem
            title={<>Nouveau sur <span className="text-amber-300">ACS</span> ?</>}
            lead="Rejoignez la plateforme réservée aux magistrats et douaniers."
            cta="Créer un compte"
            ctaIcon={ArrowRight}
            onSwitch={() => setMode("register")}
          />

          {/* Face "→ connexion" */}
          <OverlayPanel
            visible={!isLogin}
            direction="down"
            compact
            title={<>Bon retour <span className="text-amber-300">parmi nous</span></>}
            lead="Connectez-vous pour retrouver vos contrats et vos demandes."
            cta="Se connecter"
            ctaIcon={ArrowLeft}
            onSwitch={() => setMode("login")}
          />

          {/* Liseré de confiance */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3.5 text-[9px] text-white/40">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-amber-300/70" />Données chiffrées</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-amber-300/70" />Magistrats &amp; douaniers</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-amber-300/70" />Accès sécurisé</span>
          </div>
        </div>

        {/* Formulaire — glissement doux au changement de mode */}
        <div className="max-h-[58vh] overflow-y-auto px-6 py-7 sm:px-8">
          <div key={mode} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            {isLogin ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>
      </div>
    </div>
  );
}
