# 3D scenery prototype

Full-screen guided journey through the Chinese scenery capture.

## Run locally

1. Install dependencies: `pnpm install` (approve the `esbuild` and `webgpu` build scripts if prompted).
2. Generate the browser-ready scene: `pnpm run prepare:scene`.
3. Start the site: `pnpm dev`.

Open the local URL printed by Vite. The generated `public/scenery.sog` is ignored by Git; the original SPZ and GLB are not modified. Run `prepare:scene` again if the source scenery changes.

The camera begins above the river, travels toward the distant mountains, then fades briefly to restart the route. Move the mouse over the scene to look around while the journey continues. The Phoenix appears as a distant figure in the sky and gently turns and drifts with the pointer. The original SPZ and GLB assets are not modified.
