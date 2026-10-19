import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="max-w-md space-y-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <BrandMark />
          <div className="text-left">
            <h1 className="font-display text-2xl font-semibold text-navy-900">ACS</h1>
            <p className="text-xs font-medium text-amber-700">Magistrat &amp; Douane</p>
          </div>
        </div>
        <div>
          <p className="font-display text-7xl font-semibold text-navy-100">404</p>
          <h2 className="mt-4 font-display text-xl font-semibold text-navy-800">Page introuvable</h2>
          <p className="mt-2 text-sm text-navy-400">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <Link href="/login">
          <Button className="rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
