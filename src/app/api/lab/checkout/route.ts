import { handle } from "@/lib/config";
import { getLab, LAB_PRICE } from "@/lib/lab";

export const dynamic = "force-dynamic";

/** Owned chaos-lab checkout API. Its behaviour comes from the battle's lab config file. */
export const POST = (req: Request) =>
  handle(async () => {
    const battle = new URL(req.url).searchParams.get("battle");
    const { config } = await getLab(battle);
    if (config.checkoutApi === "error_500")
      return Response.json(
        { error: "payment_intent_failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    const body = (await req.json().catch(() => ({}))) as { promo?: string };
    const code = String(body.promo || "").trim().toUpperCase();
    const percent = config.promoCodes[code] || 0;
    const total = +(LAB_PRICE * (1 - percent / 100)).toFixed(2);
    const orderId = `LAB-${Date.now().toString(36).toUpperCase()}`;
    return Response.json(
      { orderId, total, promoApplied: percent ? code : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
