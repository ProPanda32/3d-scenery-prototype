# 3D scenery prototype

Full-screen Gaussian splat viewer for the Chinese scenery capture. The Phoenix GLB is reserved for a later step.

## Run locally

1. Install dependencies: `pnpm install` (approve the `esbuild` and `webgpu` build scripts if prompted).
2. Generate the browser-ready scene: `pnpm run prepare:scene`.
3. Start the site: `pnpm dev`.

Open the local URL printed by Vite. The generated `public/scenery.sog` is ignored by Git; the original SPZ and GLB are not modified. Run `prepare:scene` again if the source scenery changes.

Drag to look around, use the wheel or pinch to zoom, right-drag or Shift-drag to pan, and use WASD plus Q/E to move through the scene. Hold Shift while using WASD to move faster.
