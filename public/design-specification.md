> Historical design specification for the retained Vite prototype. The current Next.js workspace, data provenance, and deployment boundaries are documented in README.md and docs/BLUEPRINT_AUDIT.md.

# CHAOS-PACT: Interior Experience Specification

## Product Intent

The authenticated workspace is an operator console. It prioritizes the current verification state, the evidence supporting that state, and the next meaningful action. The interface avoids promotional content and treats every run as an inspectable record.

## Visual Language

- **Foundation:** Obsidian surfaces, restrained glass gradients, one-pixel graphite dividers, and compact corner radii.
- **Gold:** Trusted results, passed executions, selection, primary actions, and verification coverage.
- **Crimson:** Caught failures, the Saboteur, and destructive actions.
- **Cyan:** Healing activity, the Healer, and successful repairs.
- **Green:** Operational availability and affirmative qualification checks.
- **Typography:** Space Grotesk headings, DM Sans interface text, and IBM Plex Mono for identifiers, times, logs, quantities, and annotations.
- **Imagery:** A surveyed obsidian mountain range establishes Mission Control. The red and cyan operators establish the Arena. Product frames are reserved for evidence and device comparisons.
- **Motion:** Brief panel entrances, a subtle live beacon, and timed execution events. Reduced-motion preferences suppress decorative animation.

## Persistent Workspace

The header contains the product identity, current location, operational status, command search, activity inbox, and operator profile. The icon rail provides ten stable destinations. A gold edge marker denotes the active destination; labels appear on hover or keyboard focus.

The context sidebar contains the project switcher, failing runs, pending review, active battles, recent evidence, execution-credit balance, repository, branch, and specification. Its lower edge contains the environment selector and workspace guide. A narrow footer displays worker availability, region, version, and UTC time.

On smaller screens, the context sidebar becomes a dismissible drawer. The rail remains accessible, dashboard panels stack, and dense tables scroll within their own boundaries. Dialogs fit the viewport, retain keyboard focus, and dismiss with Escape.

## First-Run Setup

1. **Repository:** Search the repository picker, compare branch and commit recency, and select one repository. Continue remains unavailable until selection.
2. **Targets:** Enter staging and production URLs. A valid address receives a green indicator. URL validation must never be presented as proof of network reachability.
3. **Specification:** Drop or browse for a Markdown document. A parsing state transitions to the filename and indexed requirement count. Invalid types and oversized documents receive an explicit error.
4. **Starting mode:** Choose recommended instant replay or save a live configuration. A disconnected worker is explicitly identified. Completing setup selects the project and opens its dashboard.

## Mission Control

**Live Pulse** places total, passed, caught, and healed counts above a 24-hour activity strip. Time-range selection changes both the counts and the chart. Hover and focus expose a run summary. Selecting a tick enters the execution theater.

**Qualification Tracker** presents the three latest-run signals with text, icons, and status colors. Its footer links directly to the referenced run.

**Active Battles** pairs a red/cyan stage preview with battle identifiers, scenarios, state labels, and two-tone duration strips. Each row opens that battle in the Arena.

**Credit Economics** combines a calibrated fuel gauge with a four-category consumption breakdown. The detail link opens the full billing view.

**Coverage Health** pairs a percentage with a segmented coverage bar. Flags identify gaps and link to the selected requirement in the assurance map.

## Project Record

The project header names the codebase and exposes repository context, target configuration, manual execution, specification synchronization, and destructive actions. Overview, Run history, Battles, Evidence, Coverage, and Settings preserve the project context.

History rows expose identifiers, UTC times, surface, device, exit code, duration, and credits. Failures with a confirmed verdict carry a gold 740 marker. Search, status filters, pagination, and evidence links support investigation without losing the original execution record.

## Execution Theater

The principal pane alternates between typed stream events and captured browser frames. Playback supports pause and replay. Events distinguish start, progress, assertion, bifurcation, and completion.

The inspector contains collapsible metadata, the six-domain DevTools scorecard, extracted values, and a failure-only verdict. Commit identifiers and extracted values are copyable. Reviewed verdicts leave the pending-review queue; a healing action creates a local Arena replay.

The action bar exports the evidence pack, opens its viewer, repeats the specification, or generates a portable replay link.

## Evidence Vault

The artifact catalog supports assertion/path search, platform and result filters, an age interval, and project selection. Tiles use captured product frames, a status ribbon, a summary, and trace indicators.

The viewer expands the selected frame, retains the step identity, and supports both filmstrip selection and arrow-key scrubbing. A collapsible inspector contains network events, console events, storage, and a YAML summary. Export remains available without leaving the viewer.

## Adversarial Arena

A launch bar chooses a predefined scenario, project, and branch. The stage contrasts the two teams without relying on color alone. Six timestamped nodes progress from Queued through Sabotaging, Detected, Healing, Auditing, and Resolved.

Separate logs explain each team's current action. The audit reveals a fixture diff and three checks: no weakened assertions, no introduced hardcoded constants, and respected scope boundaries. History rows expand to show attempts, time, stage inspection, and a linked execution replay.

All scenario activity in the demonstration is a deterministic local replay. No remote target is changed.

## Coverage & Assurance

Document nodes appear on the left, test specifications on the right. Solid gold, dashed neutral, and amber relationships express trusted, derived, and stale states. The graph offers direct panning, wheel/button zoom, reset, a minimap, and a legend.

Selecting a gap focuses its relationship. Generating a specification links the requirement, updates the coverage count, removes the gap, and exposes the generated Markdown artifact for inspection and download.

## Post-Mortem Publishing

Drafts and published records occupy separate columns. Moving an unverified draft to the published column is rejected with an actionable explanation. Publishing is also accessible from the editor without dragging.

The split editor combines Markdown, a formatting toolbar, evidence selection, and a live reading preview. The preview includes a before/after frame control and verification state. Changing content invalidates verification. A valid title, substantive analysis, and a sealed evidence reference are required before publication.

## Integrations & Devices

Integration rows expose independent enablement and configuration. GitHub configuration includes the protected branch, required check, and a pull-request comment preview. Schedules include frequency and UTC time. Slack configuration selects the channel and event class. Webhooks expose a validated endpoint and payload preview.

The device grid provides explicit selection, viewport dimensions, operating system, and cached/replaying/completed states. A batch run applies the same specification to each selected target, consumes the corresponding local credit budget, and links each result to its theater.

## Team, Billing & Settings

Team management distinguishes active operators from pending invitations. Local invitation links may be copied, accepted, or revoked. Editor and Viewer roles may be changed without disturbing the workspace owner.

Billing combines remaining balance, historical usage, and a comparable plan table. Plan changes require confirmation and carry existing consumption forward. Sandbox plan changes never charge a payment method.

Settings contain profile identity, masked local API keys, secret rotation, alert preferences, and project lifecycle controls. Key creation and revocation are explicit. Destructive project actions require the exact project name. Archive retains the project; deletion removes the project and execution history.

## Delivery Boundaries

The interactive prototype is local-first and persists its workspace on the current browser. Repository choices, workers, browser captures, and integrations are demonstration fixtures. No GitHub account, external worker, notification service, or payment provider is connected. Portable replay links contain their own non-secret execution snapshot.
