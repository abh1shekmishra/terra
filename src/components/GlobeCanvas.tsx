"use client";

import dynamic from "next/dynamic";

/**
 * WebGL/Three.js must only run in the browser, so we load the globe with
 * server-side rendering disabled. Keeping this in its own client component
 * lets the page itself stay a normal server component.
 */
const Scene = dynamic(() => import("./globe/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading globe…
    </div>
  ),
});

export default function GlobeCanvas() {
  return <Scene />;
}
