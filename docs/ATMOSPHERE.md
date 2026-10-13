# PongFall: atmosphere (look, sound, the unknown)

Render and audio are strictly downstream of the simulation: they read it and never feed back. Lore is intentionally thin; more will be shared.

## The shaft
The arena falls down a huge dark shaft. Depth is communicated by parallax layers moving at different speeds (far to near): giant distant silhouettes, a far wall with tiny lit windows and rings, girders, pipes and cables, wall rails with depth markers ("0412 m"), then in front: huge dark beams that rush past (kept off the arena so play stays readable), debris and dust streaking upward, light shafts, wind gust ribbons. Layers also shift sideways as the arena sways, by depth.
The arena itself moves in the air (render only): drag lifts it, wind pushes and rolls it, buffeting shakes it, score surges drop it. **Reduce Motion** (settings, also on by default when the OS asks) removes shake, roll, smear and heavy streaks.

## Fog (shader)
Fog is a WebGL fragment shader (`src/render/fogGL.ts`): domain-warped fbm noise streaked along the fall, advected by the wind, sheared by the arena's velocity, stirred by impacts (paddle hits, glass breaks, squishes, scores) and lit by the eyes' glow. Two passes: behind the structure and in front, with the arena cleared so play stays readable. It falls back automatically to the cheap sprite fog (`src/render/fog.ts`) if WebGL is missing or frames run slow.

## The eyes and the unknown
- **Wall eyes** (foreground): set into the riveted wall plates (`render/wall.ts`): recessed, bolted sockets cut into the plate, eyeballs sunk into them, and lids made of the wall's own plate metal with seams and rivets. They recoil into the wall when hit. Hit them to wake the shaft and drop tears.
- **Background eyes:** many, barely visible, organic with slit pupils, closed until woken. When the wall eye next to one is hit, it glows.
- **The face:** from about the halfway point of the game (by score, time, or depth in Sandbox) the scattered background eyes fade away and a single huge eye appears deep in the shaft, breathing a faint glow behind a closed lid with a thin glowing seam. Its pair is one wall eye on the opposite wall: when that wall eye is hit, the huge eye opens and glows and the pair answers with a halo. Together they make a face that is never fully seen. What it is, is not explained yet.

## Sound (procedural WebAudio, no files)
- **Falling air:** two selectable sound profiles. **Classic** preserves the original resonant, whistling wind and low rumble. **Dynamic** uses a broad, non-tonal rush, soft high air, and low rumble that swell with fall speed and gusts. Choose either from Main menu Settings or in-game Sound settings; the choice persists between visits.
- **Pong blips (placeholders):** flat square beeps for paddle, wall and serve, and a two-tone for score. Meant to be replaced.
- **Glass:** crack = a sharp tick with a few high tinkles; break = a bright noise burst, 16 staggered tinkles (2-9 kHz) and a low thump. The tinkle schedule is a deterministic pure function (tested).
- **Eyes:** a wet squish (downward pitch glide, swept band-pass, wobble). Also thrust whoosh, tear slice/collect, power-up and boost.
- Volume, mute, and falling sound profile persist; the context unlocks on the first click, key or touch; `M` mutes.

## Where things are
`src/render/shaft.ts` (layers), `fogGL.ts` + `fog.ts` (fog), `eyes.ts` (eyes, face, render-only effects), `glass.ts` (panes, cracks, shards), `wind.ts` (gusts, gauge), `draw.ts` (assembly, HUD); `src/audio/cues.ts` (pure recipes) and `engine.ts`.
