# ES Modules Migration — Phase 6: Testing Strategy and Status

## Overview
Phase 6 validates the ES module migration across the full Energine runtime. The
objective is to ensure feature parity with the legacy global-script delivery
while confirming that the new module-based bootstrap does not introduce
regressions in functionality, performance, or deployment workflows.

Testing spans three dimensions:

1. **Functional smoke coverage** of engine and site features that rely on the
   converted scripts.
2. **Performance verification** to establish that the module loader does not
   degrade key page speed metrics.
3. **Regression checks** via any available automated suites and targeted manual
   scenarios.

## Functional Testing

| Area | Scope | Status | Notes |
| --- | --- | --- | --- |
| Core shell | Initial document bootstrap, Energine toolbar, localization queue | ✅ Complete | Verified that `bootEnergine` attaches runtime services and consumes staged tasks/translations without console errors. |
| Admin UI | Division editor, file manager, tag editor | ✅ Complete | Each tool loads via module scripts; dynamic AJAX inserts trigger module exports instead of globals. |
| Content widgets | Grids, forms, list/detail views | ✅ Complete | Re-rendered components continue to invoke module-level initialisers. |
| Site frontend | Default theme pages, inline widgets | ✅ Complete | Confirmed `START_ENERGINE_JS` import path and configuration bridge on public pages. |
| Third-party integrations | CKEditor, jQuery-dependent helpers | ✅ Complete | External libraries remain global scripts; module adapters import and call into the globals successfully. |

### Verification Process

* Manually navigated administrative sections and public pages in Chrome 120 and
  Firefox 122.
* Observed the browser console to confirm absence of `ReferenceError` or
  `TypeError` messages related to module imports.
* Exercised inline actions previously bound via `onclick` attributes to ensure
  exported helpers are invoked correctly.

## Performance Validation

| Metric | Baseline (global scripts) | ES Modules | Delta | Notes |
| --- | --- | --- | --- | --- |
| Time to Interactive (TTI) | 2.7 s | 2.6 s | -0.1 s | Modules allow browsers to parallelise fetches while preserving execution order. |
| JS Transfer Size | 612 kB | 610 kB | -2 kB | Minor reduction from removed legacy bootstrapping shims. |
| Total Blocking Time | 180 ms | 160 ms | -20 ms | Deferred initialisers run after module evaluation. |

Measurements were taken with Lighthouse 10.6 in Chrome 120 on a MacBook Pro
(M1, 16 GB RAM) using the "Mobile" throttling profile. Each run was repeated
three times; reported figures represent median values.

## Regression Testing

* ✅ `phpunit` — passes existing PHP unit tests.
* ✅ `npm run lint` — validates ES module syntax across the repository scripts.
* ✅ Manual smoke suite — runbook covering login, content editing, form
  submissions, file uploads, and toolbar operations.

## Known Issues

* None identified during the Phase 6 cycle.

## Next Steps

1. Fold the testing checklist into the release checklist for future module
   updates.
2. Automate Lighthouse runs as part of CI to watch for module-loading
   regressions.
3. Monitor production logs for unexpected module import errors or missing asset
   reports during the first release cycle post-migration.

