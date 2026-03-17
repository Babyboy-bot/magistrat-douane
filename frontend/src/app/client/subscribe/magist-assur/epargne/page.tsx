"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EpargnePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/client/subscribe/magist-assur/souscrire"); }, [router]);
  return null;
}
