# Block 5 Verification Guide

This guide summarizes how to validate the Energine non-blocking JavaScript rollout across the four target scenarios.

## 1. Build the production bundles

1. Install the build toolchain (requires network access):
   ```bash
   npm install
   ```
2. Produce the bundles:
   ```bash
   npm run build
   ```
   The command should create `public/assets/site.js` and `public/assets/admin.js` without additional chunk files in production mode.

## 2. Browser smoke tests

Open the site in a browser and exercise the UI for each combination below. Use the browser developer tools (Network + Console) to observe requests and runtime errors.

| Mode | Expected Requests | Notes |
|------|-------------------|-------|
| Guest, `debug=1` | Multiple `<script type="module" src="…">` tags matching the legacy order | Verify the public features render as before and that the console shows no `ReferenceError`. |
| Admin, `debug=1` | Same `<script type="module" …>` list plus admin modules | Confirm the admin UI (e.g., toolbar, page editor) behaves normally and no missing globals appear. |
| Guest, `debug=0` | Single `site.js` request with `defer` | Validate the public pages load with no blocking scripts or console errors. |
| Admin, `debug=0` | `site.js` and `admin.js`, both `defer` | Ensure admin tools initialize correctly while guests do not fetch `admin.js`. |

## 3. Lighthouse / PageSpeed

Run Lighthouse or PageSpeed Insights against a production-mode page to verify the **Render-blocking resources** audit passes (no warnings about synchronous scripts).

## 4. Troubleshooting tips

- If the build step fails locally, check Node/NPM versions and that the registry is reachable.
- When debugging module mode issues, confirm required globals are explicitly attached to `window` in their respective source files.
- Clear caches or perform a hard refresh when toggling between debug and production modes to avoid stale bundles.
