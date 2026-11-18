import { handle, need } from "@/lib/config";
import { receiptFor } from "@/lib/receipt";

export const dynamic = "force-dynamic";

function badge(label: string, color: string) {
  const w = 118 + label.length * 6.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="Kane CLI: ${label}"><rect width="${w}" height="20" rx="3" fill="#24292f"/><rect x="104" width="${w - 104}" height="20" rx="3" fill="${color}"/><rect x="104" width="4" height="20" fill="${color}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="7" y="14">CHAOS-PACT · Kane</text><text x="111" y="14">${label}</text></g></svg>`;
}

/** Public cryptographic verification endpoint (JSON certificate or SVG badge). */
export const GET = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const { id } = await params;
    need(/^[0-9a-f-]{36}$/i.test(id), 404, "Receipt not found.");
    const receipt = await receiptFor(id);
    need(receipt, 404, "Receipt not found.");
    if (new URL(req.url).searchParams.get("format") === "svg")
      return new Response(
        receipt!.valid ? badge("verified", "#2da44e") : receipt!.signed ? badge("invalid", "#cf222e") : badge("unsigned", "#6e7781"),
        { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } },
      );
    return Response.json(receipt, { status: 200 });
  });
