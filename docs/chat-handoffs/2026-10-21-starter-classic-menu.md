# Handoff · 2026-10-21 · first fall and menu choice

The user requested the original intro leading to a fresh 12-point Solo Fall starter match, arena grinding on a win, then the original cursor-watching eye menu. Both Classic and New menus need complete options and a smooth, obvious top switch. The frozen Trijam build must remain separate.

Implementation: `src/main.ts` now routes normal visits through the intro and a fresh starter match when fall count is zero. `src/sim/world.ts` stores a starter flag in initial match options, grounds a player win at point 12, and records it in replay data. `SIM_VERSION` is 25. A top menu switch in `src/core/menuSwitcher.ts` swaps complete menu implementations and saves the chosen style. Classic is the default on new settings. The large Classic eye follows the pointer even with Reduce Motion, without animated lag.

The old checkout at `C:\PongFall\source` was dirty on `claude/friendly-wright-vtwgcm` before this work and was not edited. Work was done in `C:\PongFall\menu-flow` from production main. Validate and merge from this worktree. Keep `/jam/` frozen.

Follow-up v0.55.1: the top menu switch was reduced to a compact translucent control with gentle hover and focus emphasis. The menu implementations and simulation were unchanged.
