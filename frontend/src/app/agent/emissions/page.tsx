"use client";

import { UnderDevelopment } from "@/components/under-development";

export default function Page() {
  return <UnderDevelopment featureName="Émissions" backHref="/agent/dashboard"
    description="outil interne de gestion du portefeuille : création des émissions, encaissements, import/export Excel du parc." />;
}
