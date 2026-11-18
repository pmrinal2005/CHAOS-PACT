# CHAOS-PACT Mission Control

A responsive, local-first prototype of the CHAOS-PACT post-login workspace. The code-free interior design specification is available at `public/design-specification.md` and from **Workspace guide** inside the app.

## Explore

Start with the seeded Nexus Commerce workspace. Select a timeline tick to inspect a run, open an evidence pack to scrub its captured steps, or enter the Arena to play a controlled scenario. The project switcher includes the four-step setup wizard.

The application also includes requirement coverage, verified post-mortem publishing, integration configuration, cross-device comparisons, team invitations, credit plans, and operator settings. The command palette is available with Ctrl+K or Cmd+K.

## Run

- `npm install` installs the dependencies.
- `npm run dev` starts the Vite development server.
- `npm run build` produces the production app in `dist/`.
- `npx tsc --noEmit` checks the application types.
- With the development server on port 5173, `npx playwright test tests/workspace.spec.ts` exercises the main workflows. Install Chromium with `npx playwright install chromium` first.

## Architecture

- `src/App.tsx` connects the navigation shell to the twelve workspace screens.
- `src/workspace.tsx` owns hash navigation, project context, local persistence, execution state, credit balances, and inbox preferences.
- `src/Dashboard.tsx` renders Mission Control and its linked telemetry widgets.
- `src/Dialogs.tsx` contains onboarding, execution configuration, search, notifications, and the workspace guide.
- `src/Execution.tsx`, `src/Evidence.tsx`, and `src/Operations.tsx` handle inspection and simulation workflows.
- `src/Publishing.tsx`, `src/Administration.tsx`, and `src/Settings.tsx` contain workspace management.
- `src/integrity.ts` signs exported local evidence payloads with Web Crypto HMAC-SHA256.
- `src/ui.tsx` contains the shared accessible dialogs, controls, gauge, tables, and captured-frame presentation.

## Local Boundaries

Workspace data persists in this browser under the `chaos-pact-v1:` storage prefix. All executions and battle scenarios are local fixtures. URLs are validated without probing remote systems. Integration settings do not send external requests, team invites are local links, and plan changes do not process payments.

Replay links embed a non-secret execution snapshot and can be opened in a separate browser. Evidence exports contain fixture metadata, step annotations, traces, and a local signature. Signing keys are demonstration credentials, not production secrets.
