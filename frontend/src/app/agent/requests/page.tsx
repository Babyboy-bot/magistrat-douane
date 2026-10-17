"use client";

import { UnderDevelopment } from "@/components/under-development";

export default function Page() {
  return <UnderDevelopment featureName="Demandes" backHref="/agent/dashboard"
    description="consulter et traiter les demandes envoyées par les assurés (cotations, documents, questions) et y répondre directement." />;
}

