import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="flex items-center gap-3 justify-center">
          <Shield className="h-10 w-10 text-[hsl(222,47%,20%)]" />
          <div>
            <h1 className="text-2xl font-bold text-[hsl(222,47%,20%)]">ACS</h1>
            <p className="text-amber-600 text-xs font-medium">Magistrat & Douane</p>
          </div>
        </div>
        <div>
          <p className="text-7xl font-bold text-gray-200">404</p>
          <h2 className="text-xl font-semibold text-gray-700 mt-4">Page introuvable</h2>
          <p className="text-gray-500 mt-2">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <Link href="/login">
          <Button className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
