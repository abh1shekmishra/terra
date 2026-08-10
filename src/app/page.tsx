import GlobeCanvas from "@/components/GlobeCanvas";
import EarthquakeHud from "@/components/EarthquakeHud";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05070d]">
      <GlobeCanvas />

      <header className="pointer-events-none absolute left-7 top-7 z-10 select-none">
        <h1 className="text-[26px] font-semibold leading-none tracking-tight text-zinc-100">
          Terra
        </h1>
        <p className="mt-2 text-sm font-medium text-zinc-400">
          Live planetary data, in your browser
        </p>
      </header>

      <div className="absolute right-6 top-6 z-10">
        <EarthquakeHud />
      </div>

      <footer className="pointer-events-none absolute bottom-6 left-7 z-10 text-xs font-medium tracking-wide text-zinc-500">
        Drag to rotate · scroll to zoom · hover a marker for details
      </footer>
    </main>
  );
}
