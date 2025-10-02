# XSLT Refactor Rollback Plan

## Trigger Conditions
- Any P0/P1 incident linked to template rendering, markup regressions, or translation loss.
- Sustained performance degradation >10% for 15 minutes compared to baseline.
- Critical admin UI breakage reported by at least two editors.

## Immediate Actions (≤ 5 minutes)
1. Set `XSL_REFACTOR=off` in the affected environment (Kubernetes secret or `.env`).
2. Flush opcode + xslcache pools if enabled (`php bin/cache:clear --xslt`).
3. Announce the rollback in #incident-response and assign roles (driver, comms, scribe).

## Verification (≤ 10 minutes)
- Hit the 10-page smoke suite to confirm legacy templates render correctly.
- Check that `X-Timer` metrics return to baseline within ±5%.
- Review application logs for lingering libxslt warnings.

## Post-Rollback (≤ 15 minutes)
- Capture the incident timeline and root cause hypotheses in Confluence.
- Create follow-up tasks for reproduction, test coverage gaps, and monitoring improvements.
- Keep the flag off until fixes land and pass staging regression.

## Reference
- Legacy entry point: `site/modules/default/transformers/main.legacy.xslt`.
- Flag location: environment variable `XSL_REFACTOR` (overrides `features.xsl_refactor`).
- Responsible on-call rotation: `@frontend-oncall`.
