import type { Metadata } from "next";
import { ensureSchema } from "@/db/bootstrap";
import { getLab, LAB_PRICE } from "@/lib/lab";
import LabCheckout from "./LabCheckout";
import "./lab.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nexus Audio · Checkout (CHAOS LAB)",
  description:
    "CHAOS-PACT's owned sabotage target. Red-team faults are applied here and refereed by Kane CLI in a real browser.",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ battle?: string }> };

export default async function LabPage({ searchParams }: Props) {
  await ensureSchema();
  const battle = (await searchParams).battle || null;
  const lab = await getLab(battle);
  return (
    <LabCheckout
      battle={battle && /^[0-9a-f-]{36}$/i.test(battle) ? battle : null}
      config={lab.config}
      price={LAB_PRICE}
      revision={lab.revision}
    />
  );
}
