# November 7, 2026 — LOK controller standard adoption

Goal: make arcade games usable with controllers across browser hosts, including mobile hosts exposing multiple controllers, with shared standards and per-app configurations.

Inspected: `AGENTS.md`, `CLAUDE.md`, `src/core/createPongFall.ts`, `controls.ts`, `mainMenu.ts`, mode/replay paths and current update feed. The existing Local 2-player mode makes this the first safe gameplay adopter. No new multiplayer simulation was invented.

Changed: vendored `lib/lok-input/`; `src/core/controllerPanel.ts`, `controllerActions.ts`, its test, `CONTROLLERS.md`, `createPongFall.ts`, `mainMenu.ts`, `src/changelog.ts`, `public/lok-updates.json`, package version 0.8.5. Shared input has stable player slots, radial deadzones and focus-neutral handling; PongFall adds direct recorded game commands, per-app button remapping, arm aim/flip, pause and menu navigation. Attract mode remains independent. Simulation version stays unchanged because command semantics and replay rules did not change.

Checks: TypeScript/Vite build passes; 84 tests pass using `node --import tsx --test 'src/**/*.test.ts'`. Shared input tests pass in the ecosystem/hub package. Browser visual verification could not run: Chromium's Unix socket is blocked, and a separate browser could not reach localhost. Xbox Menu handoff, actual controller mappings, multi-controller iPhone 17 Pro play, layout and audio need physical/preview checks.

Status: ready for review, not deployed. No live database/auth changes. Next: review PR, run browser/device checks, then adopt the same package in the next app. Phone QR pairing and universal cloud saves remain separate work.
