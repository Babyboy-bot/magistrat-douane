"use client";

import { UnderDevelopment } from "@/components/under-development";

export default function Page() {
  return <UnderDevelopment featureName="Sinistres" backHref="/agent/dashboard"
    description="enregistrer les sinistres déclarés par les assurés, joindre les pièces et suivre leur traitement jusqu'à l'indemnisation." />;
}

