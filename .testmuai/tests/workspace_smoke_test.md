---
mode: testing
url: "{{workspace_url}}"
timeout: 120
tags: [smoke, control-plane, web]
---
# Mission Control workspace smoke verification

## Open the control plane
Open {{workspace_url}}. Verify Mission Control is visible, with no raw SQL error on screen.

## Inspect the ledger
Open Run ledger. Verify the run table or its legitimate empty state appears. Return to Mission Control.

## Inspect evidence and audit boundaries
Open Evidence vault and verify its catalog or empty state is visible. Open Blueprint audit and filter by Missing. Confirm that sample records are never described as genuine signed evidence.

## Verify application health
Assert there are no unhandled browser exceptions. Verify that the workspace response succeeds for a configured database. Do not change settings, dispatch a cloud job, or publish an article.
