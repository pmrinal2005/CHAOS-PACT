"use client";

import { useEffect, useState } from "react";
import type { LabConfig } from "@/lib/lab";

type Props = {
  battle: string | null;
  config: LabConfig;
  price: number;
  revision: number;
};

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * A deliberately small storefront. Every fault the Red team can inject is a real behaviour
 * change driven by the battle's lab config, so Kane CLI observes genuine failures.
 */
export default function LabCheckout({ battle, config, price, revision }: Props) {
  const q = battle ? `?battle=${battle}` : "";
  const [session, setSession] = useState(false);
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [state, setState] = useState<"idle" | "processing" | "done">("idle");
  const [order, setOrder] = useState<{ orderId: string; total: number } | null>(null);
  // Mirrors a client cart store; the regression removes the guard, not the data.
  const [summary] = useState<{ items: { sku: string; qty: number }[] } | undefined>(
    config.cartSummaryGuard ? { items: [{ sku: "NX-ANC-700", qty: 1 }] } : undefined,
  );

  useEffect(() => {
    fetch(`/api/lab/session${q}`, { cache: "no-store" })
      .then((r) => r.ok && setSession(true))
      .catch(() => setSession(false));
  }, [q]);

  const total = +(price * (1 - (applied?.percent || 0) / 100)).toFixed(2);

  const apply = () => {
    const code = promo.trim().toUpperCase();
    const percent = config.promoCodes[code];
    if (percent) {
      setApplied({ code, percent });
      setPromoError("");
    } else {
      setApplied(null);
      setPromoError(`Promo code ${code || "(empty)"} is not valid.`);
    }
  };

  const pay = async () => {
    // With the guard removed this throws an unhandled TypeError, exactly as a real regression would.
    const count = config.cartSummaryGuard
      ? (summary?.items.length ?? 0)
      : (summary as unknown as { items: unknown[] }).items.length;
    if (!count) return;
    setState("processing");
    try {
      const res = await fetch(`/api/lab/checkout${q}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ promo: applied?.code || "" }),
      });
      if (!res.ok) return; // Silent failure: the spinner never resolves and no error is shown.
      setOrder(await res.json());
      setState("done");
    } catch {
      /* network failure is also silent in this storefront */
    }
  };

  return (
    <main className="lab-page">
      <header className="lab-nav">
        <span className="lab-brand">◆ Nexus Audio</span>
        <span className="lab-env">
          CHAOS LAB · STAGING{battle ? ` · battle ${battle.slice(0, 8)}` : " · baseline"}
          {revision ? ` · rev ${revision}` : ""}
        </span>
      </header>

      <section className="lab-grid">
        <article className="lab-product">
          <div className="lab-art" aria-hidden="true">
            <span />
          </div>
          <h1>Nexus ANC-700 Headphones</h1>
          <p>Adaptive noise cancelling, 40-hour battery, studio-grade drivers.</p>
          <aside className="lab-notes" aria-label="Release notes">
            <h2>Release notes</h2>
            <ul>
              {config.docsClaims.map((c) => (
                <li key={c.code}>
                  Use promo code <b>{c.code}</b> for {c.percent}% off your order.
                </li>
              ))}
            </ul>
          </aside>
        </article>

        <section className="lab-checkout" aria-label="Checkout">
          <h2>Checkout</h2>
          <p className="lab-session" aria-live="polite">
            {session ? "Session ready" : "Starting session…"}
          </p>
          <div className="lab-line">
            <span>ANC-700 × 1</span>
            <span>{money(price)}</span>
          </div>
          {applied && (
            <div className="lab-line lab-discount">
              <span>Promo {applied.code}</span>
              <span>−{applied.percent}%</span>
            </div>
          )}
          <div className="lab-line lab-total">
            <span>Order total</span>
            <strong data-testid="order-total">{money(total)}</strong>
          </div>
          <div className="lab-promo">
            <label htmlFor="promo">Promo code</label>
            <div>
              <input
                id="promo"
                value={promo}
                placeholder="Enter code"
                onChange={(e) => setPromo(e.target.value)}
              />
              <button type="button" onClick={apply}>
                Apply
              </button>
            </div>
            {promoError && <p className="lab-error">{promoError}</p>}
          </div>

          <div className="lab-cta-zone">
            <button
              type="button"
              className="lab-pay"
              onClick={pay}
              disabled={state === "processing"}
            >
              {state === "processing" ? "Processing…" : "Pay now"}
            </button>
            {config.ctaBanner === "overlay" ? (
              <div className="lab-banner lab-banner-overlay">
                🎉 Holiday sale — free shipping on every order!
              </div>
            ) : (
              <div className="lab-banner">🎉 Holiday sale — free shipping on every order!</div>
            )}
          </div>

          {state === "done" && order && (
            <div className="lab-confirm" role="status">
              <strong>Order confirmed</strong>
              <span>
                Order number <code data-testid="order-id">{order.orderId}</code> ·{" "}
                {money(order.total)} charged (test mode)
              </span>
            </div>
          )}
        </section>
      </section>
      <footer className="lab-foot">
        Owned sabotage target for CHAOS-PACT battles. No real payments are processed.
      </footer>
    </main>
  );
}
