# ES Modules Migration – Phase 5 Checklist

## Configuration review
- `system.jsmap.php` remains the authoritative dependency graph for Energine-managed bundles; the entries continue to use the historical `scripts/{path}.js` layout so runtime loaders can tag vendor bundles as classic scripts while emitting modules for first-party code.【F:system.jsmap.php†L1-L66】【F:engine/core/modules/share/gears/Document.class.php†L257-L307】

## Build & tooling updates
- Updated both setup console entry points to read dependency edges from either legacy `ScriptLoader.load()` calls or modern `import` statements, normalise module specifiers against `HTDOCS_DIR/scripts`, and ignore external URLs or non-JS assets when regenerating `system.jsmap.php`. This keeps the CLI utility usable during the ES module rollout without breaking older code that still relies on `ScriptLoader` declarations.【F:setup/Setup.class.php†L1138-L1211】【F:engine/setup/Setup.class.php†L1132-L1205】
- Added helper resolvers to safely resolve relative and bare module specifiers to file-based keys so the generated map stays compatible with the server-side loader logic.【F:setup/Setup.class.php†L1197-L1211】【F:engine/setup/Setup.class.php†L1191-L1205】

## Follow-up actions
- Once all first-party scripts stop using `ScriptLoader.load`, the generator can drop the legacy branch and rely solely on static `import` analysis.
- Consider wiring the generator into a CI hook so configuration drift (missing or renamed files) is caught before deployment.
