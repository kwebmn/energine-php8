# ES Modules Migration – Phase 5 Checklist

## Configuration review
- `<javascript>` blocks inside `*.component.xml` are now the single source of truth: behaviours list their module entry points, while classic vendors are enumerated through `<library loader="classic">…</library>` so the runtime can tag them accordingly. `system.jsmap.php` has been removed from the workflow.【F:engine/core/modules/share/gears/Document.class.php†L248-L360】

## Build & tooling updates
- Both setup console entry points now treat the legacy script-map command as a no-op that merely removes any leftover `system.jsmap.php` file, preventing stale dependency data from reappearing.【F:setup/Setup.class.php†L320-L343】【F:engine/setup/Setup.class.php†L315-L338】

## Follow-up actions
- Audit remaining documentation and automation that referenced `system.jsmap.php` to ensure teams use component XML as the canonical configuration surface.
- Consider adding lightweight validation (e.g. lint rule or setup check) to flag behaviours that rely on classic vendors without declaring the corresponding `<library>` node.
