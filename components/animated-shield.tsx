"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";

/** Enhanced pointer-reactive CSS 3D visual for HashGuard representing protected value. */
export function AnimatedShield({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      // Map to CSS custom properties for transform
      node.style.setProperty("--pointer-x", `${x * 12}deg`);
      node.style.setProperty("--pointer-y", `${-y * 12}deg`);
    };
    const leave = () => {
      node.style.setProperty("--pointer-x", "0deg");
      node.style.setProperty("--pointer-y", "0deg");
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`shield-stage ${compact ? "shield-stage-compact" : ""}`}
      aria-label="A protected transaction inside a HashGuard shield"
      role="img"
    >
      {/* Background radial lines and grid */}
      <div className="shield-grid" />
      <div className="shield-halo" />

      {/* Orbit paths */}
      <div className="orbit orbit-one">
        <span className="orbit-node">
          <Icon name="spark" className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
          HSK Chain
        </span>
      </div>
      <div className="orbit orbit-two">
        <span className="orbit-node orbit-node-cyan">
          <Icon name="user" className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
          0x742d…8f44
        </span>
      </div>

      {/* Central 3D Shield Object */}
      <div className="shield-object">
        <div className="shield-core">
          <div className="shield-core-ring" />
          <Icon name="shield" className="h-16 w-16 text-emerald-400" />
          <span>Protected</span>
          <div className="absolute bottom-4 flex items-center gap-1 text-[9px] font-bold tracking-[0.1em] text-cyan-400/80">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            ESCROW LIVE
          </div>
        </div>
      </div>

      {/* Ambient Floating Particle Core */}
      <div className="shield-particle particle-a" />
      <div className="shield-particle particle-b" />
      <div className="shield-particle particle-c" />
    </div>
  );
}
