"use client";

import { useEffect, useRef } from "react";

const FOV = 640;
const BASE_TILT = -0.42;

type P3 = { x: number; y: number; z: number };

/** Sphère de Fibonacci — répartition uniforme des points. */
function fibSphere(n: number): P3[] {
  const pts: P3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pts.push({ x: Math.cos(t) * r, y: y * r, z: Math.sin(t) * r });
  }
  return pts;
}

function circle(n: number, r: number, plane: "xz" | "xy"): P3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return plane === "xz" ? { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r } : { x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 };
  });
}

const rotX = (p: P3, a: number): P3 => ({
  x: p.x,
  y: p.y * Math.cos(a) - p.z * Math.sin(a),
  z: p.y * Math.sin(a) + p.z * Math.cos(a),
});
const rotZ = (p: P3, a: number): P3 => ({
  x: p.x * Math.cos(a) - p.y * Math.sin(a),
  y: p.x * Math.sin(a) + p.y * Math.cos(a),
  z: p.z,
});

function drawShield(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.bezierCurveTo(10, -24, 20, -21, 26, -17);
  ctx.bezierCurveTo(26, 5, 18, 20, 0, 28);
  ctx.bezierCurveTo(-18, 20, -26, 5, -26, -17);
  ctx.bezierCurveTo(-20, -21, -10, -24, 0, -26);
  ctx.closePath();
}

/**
 * Scène 3D canvas : globe doré en rotation + anneaux orbitaux gyroscopiques
 * + bouclier lumineux au centre — « l'assuré au cœur de la couverture ».
 */
export function GlobeScene({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    const mouse = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };

    const sphere = fibSphere(360);
    const ringA = circle(90, 1.34, "xz").map((p) => rotX(p, 0.45));
    const ringB = circle(70, 1.42, "xy").map((p) => rotZ(rotX(p, 0.9), 0.5));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);

    const draw = () => {
      t += 0.0042;
      tilt.x += (mouse.y * 0.5 - tilt.x) * 0.045;
      tilt.y += (mouse.x * 0.7 - tilt.y) * 0.045;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.47;
      const R = Math.min(w, h) * 0.3;
      const cosX = Math.cos(BASE_TILT + tilt.x);
      const sinX = Math.sin(BASE_TILT + tilt.x);
      const breath = 1 + Math.sin(t * 0.7) * 0.012;

      const project = (p: P3, spin: number) => {
        const c = Math.cos(t * spin + tilt.y);
        const s = Math.sin(t * spin + tilt.y);
        const x1 = p.x * c + p.z * s;
        const z1 = -p.x * s + p.z * c;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const sc = FOV / (FOV + z2 * R);
        return { x: cx + x1 * R * sc * breath, y: cy + y1 * R * sc * breath, z: z2 };
      };

      // Globe — points dorés, profondeur par alpha/taille
      for (const p of sphere) {
        const q = project(p, 1);
        const depth = (1 - q.z) / 2;
        ctx.fillStyle = `rgba(251, 191, 36, ${(0.05 + depth * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 0.6 + depth * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Anneaux orbitaux — gyroscope, vitesses légèrement différentes
      for (const [ring, spin, alpha] of [
        [ringA, 0.55, 0.28],
        [ringB, -0.38, 0.22],
      ] as const) {
        for (const p of ring) {
          const q = project(p, spin);
          const depth = (1 - q.z) / 2;
          ctx.fillStyle = `rgba(253, 230, 138, ${(0.05 + depth * alpha).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 0.8 + depth * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bouclier au centre — l'assuré protégé, fixe face au spectateur
      const S = R * 0.62 * breath;
      const pulse = 0.3 + Math.sin(t * 1.1) * 0.08;
      ctx.save();
      ctx.translate(cx, cy - S * 0.05);
      ctx.scale(S / 60, S / 60);
      ctx.shadowColor = "rgba(251, 191, 36, 0.6)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse + 0.15})`;
      ctx.lineWidth = 2.4;
      drawShield(ctx);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Coche intérieure
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-2.5, 8);
      ctx.lineTo(11, -8);
      ctx.strokeStyle = `rgba(253, 230, 138, ${pulse + 0.25})`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
