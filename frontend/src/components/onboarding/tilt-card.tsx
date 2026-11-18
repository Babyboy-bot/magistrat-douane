"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Carte 3D inclinable au survol avec reflet — perspective CSS native. */
export function TiltCard({
  children,
  className,
  max = 10,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glare, setGlare] = useState<React.CSSProperties>({ opacity: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg)`,
    });
    setGlare({
      opacity: 1,
      background: `radial-gradient(circle at ${50 + px * 100}% ${50 + py * 100}%, rgba(255,255,255,0.16), transparent 62%)`,
    });
  };

  const onLeave = () => {
    setStyle({ transform: "perspective(900px) rotateY(0deg) rotateX(0deg)" });
    setGlare({ opacity: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("relative transition-transform duration-200 ease-out will-change-transform", className)}
      style={{ transformStyle: "preserve-3d", ...style }}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={glare}
      />
    </div>
  );
}
