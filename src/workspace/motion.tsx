"use client";

import { useEffect, useRef, useState } from "react";

/** True when the visitor asked the OS to reduce motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Animated number that eases from its previous value to the next one. */
export function CountUp({
  value,
  decimals = 0,
  duration = 900,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current === value ? 0 : from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);
  return <>{shown.toFixed(decimals)}</>;
}

const ORBIT_STAGES = ["Baseline", "Sabotage", "Referee", "Heal", "Audit", "Pass", "Publish"];

/**
 * The closed loop as a living diagram: Kane CLI referees at the centre while the Red-Team
 * saboteur and Blue-Team healer orbit it. The highlighted arc shows the latest battle's stage.
 */
export function LoopOrbit({
  stage,
  blocked,
  label,
}: {
  stage: number;
  blocked: boolean;
  label: string;
}) {
  const r = 118;
  const arc = (i: number) => {
    const a0 = (i / ORBIT_STAGES.length) * Math.PI * 2 - Math.PI / 2 + 0.05;
    const a1 = ((i + 1) / ORBIT_STAGES.length) * Math.PI * 2 - Math.PI / 2 - 0.05;
    const p = (a: number) => `${150 + r * Math.cos(a)},${150 + r * Math.sin(a)}`;
    return `M${p(a0)} A${r},${r} 0 0 1 ${p(a1)}`;
  };
  return (
    <div className="loop-orbit" aria-label={`Closed loop status: ${label}`} role="img">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="orbit-sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="150" cy="150" r="140" fill="url(#orbit-core)" />
        <g className="orbit-ring ring-slow">
          <circle cx="150" cy="150" r="140" fill="none" stroke="#ffffff14" strokeDasharray="2 7" />
        </g>
        <g className="orbit-ring ring-fast">
          <circle cx="150" cy="150" r="92" fill="none" stroke="#a78bfa30" strokeDasharray="38 14" />
        </g>
        {ORBIT_STAGES.map((s, i) => (
          <path
            key={s}
            d={arc(i)}
            fill="none"
            strokeLinecap="round"
            strokeWidth={i === stage ? 7 : 4}
            className={`orbit-arc ${i < stage ? "done" : ""} ${i === stage ? (blocked ? "blocked" : "now") : ""}`}
          />
        ))}
        <g className="orbit-ring ring-sweep">
          <path d="M150 10 A140 140 0 0 1 271 80" fill="none" stroke="url(#orbit-sweep)" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="orbit-satellites">
          <g className="sat sat-red">
            <circle cx="150" cy="58" r="17" />
            <text x="150" y="63" textAnchor="middle">R</text>
          </g>
          <g className="sat sat-blue">
            <circle cx="150" cy="242" r="17" />
            <text x="150" y="247" textAnchor="middle">B</text>
          </g>
        </g>
        <circle className="orbit-core-pulse" cx="150" cy="150" r="40" />
        <circle cx="150" cy="150" r="33" className="orbit-core" />
        <text x="150" y="146" textAnchor="middle" className="orbit-core-title">KANE</text>
        <text x="150" y="162" textAnchor="middle" className="orbit-core-sub">REFEREE</text>
      </svg>
      <span className={`orbit-caption ${blocked ? "blocked" : ""}`}>
        <i />
        {label}
      </span>
    </div>
  );
}
