# 3D scenery prototype

Full-screen flight through the Chinese scenery capture, with the Phoenix as the player character.

## Run locally

1. Install dependencies: `pnpm install` (approve the `esbuild` and `webgpu` build scripts if prompted).
2. Generate the browser-ready scene: `pnpm run prepare:scene`.
3. Start the site: `pnpm dev`.

Open the local URL printed by Vite. The generated `public/scenery.sog` is ignored by Git; the original SPZ and GLB are not modified. Run `prepare:scene` again if the source scenery changes.

W / Up Arrow accelerates, S / Down Arrow slows, and A/D or Left/Right steers through a straight flight corridor. The single scenery capture shifts back under the Phoenix at the end of the corridor so the flight can continue without duplicating the splat. Click the scene once to focus keyboard controls. The Phoenix remains static; its GLB has no animation clips or usable wing rig.
