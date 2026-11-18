import { handle, need } from "@/lib/config";
import { setSetting } from "@/lib/kane";

export const dynamic = "force-dynamic";
const KEYS = ["operator", "notification_prefs", "inbox_read_at", "credit_budget"];

export const PUT = (req: Request) =>
  handle(async () => {
    const { key, value } = await req.json();
    need(KEYS.includes(key), 400, "Unknown setting.");
    if (key === "credit_budget") need(Number.isFinite(value) && value > 0 && value <= 10_000_000, 400, "Budget must be a positive number.");
    if (key === "operator")
      need(value && typeof value.name === "string" && typeof value.email === "string" && value.name.length <= 80 && value.email.length <= 160, 400, "Operator needs a name and email.");
    await setSetting(key, value);
    return Response.json({ ok: true });
  });
