import GlobeCanvas from "@/components/GlobeCanvas";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05070d]">
      <GlobeCanvas />

      <header className="pointer-events-none absolute left-6 top-6 z-10 select-none">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Terra
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Live planetary data, in your browser
        </p>
      </header>

      <footer className="pointer-events-none absolute bottom-5 left-6 z-10 text-xs text-white/30">
        Drag to rotate · scroll to zoom
      </footer>
    </main>
  );
}
