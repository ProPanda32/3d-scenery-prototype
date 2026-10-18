# 3D scenery prototype

Full-screen interactive viewer for the Chinese scenery capture.

## Run locally

1. Install dependencies: `pnpm install` (approve the `esbuild` and `webgpu` build scripts if prompted).
2. Generate the browser-ready scene: `pnpm run prepare:scene`.
3. Start the site: `pnpm dev`.

Open the local URL printed by Vite. The generated `public/scenery.sog` is ignored by Git; the original SPZ and GLB are not modified. Run `prepare:scene` again if the source scenery changes.

Drag to look around, use the mouse wheel to zoom, and right-drag (or Shift-drag) to pan. The viewer opens from a fixed position inside the scenery, looking across the valley. The original Phoenix model remains an untouched project asset and is not loaded into the viewer.
