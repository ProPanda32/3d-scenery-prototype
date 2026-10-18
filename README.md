# 3D scenery prototype

Full-screen flight through the Chinese scenery capture, with the Phoenix as the player character.

## Run locally

1. Install dependencies: `pnpm install` (approve the `esbuild` and `webgpu` build scripts if prompted).
2. Generate the browser-ready scene: `pnpm run prepare:scene`.
3. Start the site: `pnpm dev`.

Open the local URL printed by Vite. The generated `public/scenery.sog` is ignored by Git; the original SPZ and GLB are not modified. Run `prepare:scene` again if the source scenery changes.

W / Up Arrow accelerates, S / Down Arrow slows and can reverse, and A/D or Left/Right steers within a gently guided closed flight loop. The Phoenix asset has no animation clips, skin, bones, or separate wing objects, so it remains a static model while flying.
