# XSLT Refactor Rollout Plan

## Overview
This plan breaks the release into four controlled stages with an explicit feature flag (`XSL_REFACTOR`) and validation gates.

## Stage 1 — Core bundle & facade (Week 1)
- Enable `XSL_REFACTOR=off` in production to keep legacy templates active.
- Deploy code with dual pipelines and smoke-test 10 baseline pages via synthetic monitoring.
- Validate cache behaviour (`document.xslcache=1`) and ensure no libxslt warnings.

## Stage 2 — Fields module split (Week 2)
- Switch the flag to `on` in staging, execute the XSpec suite, and run manual regression for forms.
- Compare HTML snapshots against golden templates and review console logs for DOE remnants.
- Prepare rollback checklist and confirm `main.legacy.xslt` parity.

## Stage 3 — Containers & lists (Week 3)
- Turn flag on for 20% of production traffic (canary servers) using environment configuration.
- Monitor response times, error rates, and DOM diffs for the advanced container/list pages.
- If metrics remain within ±3% for 48 hours, expand to 100%.

## Stage 4 — Cleanup & documentation (Week 4)
- Remove DOE/exslt leftovers, update the developer guide, and publish performance report.
- Present lessons learned in the team sync and close the rollout tracker.

## Communication
- Send weekly status updates to #frontend-core with highlights and next steps.
- Record flag flips (date, environment, approver) in the release journal.
- Notify support when the refactor is fully enabled to update troubleshooting scripts.

## Exit Criteria
- Flag enabled everywhere with no open P0/P1 issues.
- XSpec + smoke suite green for two consecutive runs post-rollout.
- Performance deltas within ±5% of staging benchmarks.
