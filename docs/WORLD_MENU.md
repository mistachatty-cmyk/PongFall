# The world menu

The menu is the live shaft. One canvas runs a real attract world (your arena with a real rally, the other arenas, the walls and their eyes). Every control is an object in that world.

- **Signs** hang from your arena's ceiling: Mode, Difficulty, Other arenas (plus NPC drift on the floor). Click one and the options unfold below it as plaques; locked ones print what opens them ("after 3 falls").
- **The ball is PLAY.** It rests on the arena floor. Click it and the camera pushes in; the match starts without a page change.
- **Objects on tethers** around the arena open the rest: Jukebox (music library), Stat board, Easel (PongPainter), Wardrobe (Arena Sides), LilEye, Door (multiplayer), Cassettes (saved matches), Game Lab, Gear (settings). Opening one flies the camera to it and the page appears in a framed screen over the world; Esc or Back flies out.
- **Keyboard and screen readers:** a hidden list of real buttons mirrors every object (Tab, arrows, Enter). Enter with nothing focused starts the match.
- **Phones:** the objects stack in rows above and below the arena (`isPortrait`).
- **Reduced motion:** no drift, no sway, instant camera.
- **Classic menu:** `?menu=classic` (or `localStorage pongfall.classicMenu = 1`) brings back the page of buttons.

Code: `src/world/menuModel.ts` (pure: objects, slots, unlocks, camera framing, keyboard order; tested), `src/world/propArt.ts` (sprites), `src/world/worldMenu.ts` (canvas, input, pages). `render/draw.ts` gained a camera pan and two layer hooks (`visuals.layers.arena` and `.world`) that the menu draws its objects through. Everything is render-only.

The pause menu is done too (0.41.0, `pauseWorld.ts`): the camera pulls back from your arena and the choices become objects around it. The end-of-match choices are objects in the match's world as well (0.42.0, `endWorld.ts`). Still to come: moving the multiplayer door and Game Lab pages out of the classic menu.

## Look (0.43.0)
Objects are drawn from palette-driven art (`src/world/art/objects.ts`, drawn by `propArt.ts` `drawProp`) and the plaques by `objectField.ts`, both reading the palette in `look.ts` (theme + accent colour + plaque finish from Settings). See `docs/ART_DIRECTION.md`.

## Menu style (0.44.0)
`menuStyle` in Settings (or `?menu=world|classic`) chooses between this live-world menu and the original page menu for the menu, pause and results together. `src/world/parity.ts` lists every feature and where each menu reaches it; `parity.test.ts` fails if either side loses one.

## Knockable objects (0.54.0)
When a ball is outside your arena in the live-world menu it collides with the objects around it (`world/propPhysics.ts`, stepped from `worldMenu.ts` after each attract-world step). A hit shoves and spins the prop and reflects the ball; a damped spring floats the prop back to its spot and clamps how far it can go. The menu world is not recorded, so none of this touches the simulation or replays. Reduce Motion keeps props still; opening a page snaps them home. `?menuphysics` exposes `window.__pfMenuWorld` and `window.__pfMenuBodies` for tests.
