# CHAOS-PACT control plane requirements

- Mission Control must expose the selected project's execution history without revealing database query text.
- Database readiness must check the actual workspace schema, not only socket connectivity.
- Additive upgrades must retain existing rows and refuse destructive schema guesses.
- New installations may use the labelled Nexus Commerce sample; existing workspaces must not be replaced.
- Replay must be available without live service credentials or paid credits.
- Sample records must never qualify for HMAC-signed live evidence or verified publication.
- Operators must be able to inspect runs, filter statuses and timestamps, review evidence, and navigate every workspace destination.
- Network and console failures must remain distinguishable from infrastructure errors and cancellations.
- Deployment must use standard Next.js App Router functions and a committed Vercel configuration.
- The blueprint audit must make unimplemented and externally dependent requirements explicit.

This document is an authored specification. It is not a claim of Kane context approval or of 100% verified coverage.
