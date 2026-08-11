import GlobeCanvas from "@/components/GlobeCanvas";
import EarthActivity from "@/components/EarthActivity";
import LayerPanel from "@/components/LayerPanel";
import DetailPanel from "@/components/DetailPanel";
import TimeScrubber from "@/components/TimeScrubber";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05070d]">
      <GlobeCanvas />

      <header className="pointer-events-none absolute left-4 top-4 z-10 select-none sm:left-7 sm:top-7">
        <h1 className="text-xl font-semibold leading-none tracking-tight text-zinc-100 sm:text-[26px]">
          Terra
        </h1>
        <p className="mt-1.5 text-xs font-medium text-zinc-400 sm:mt-2 sm:text-sm">
          Live planetary data, in your browser
        </p>
      </header>

      <div className="absolute right-3 top-3 z-10 sm:right-6 sm:top-6">
        <EarthActivity />
      </div>

      <div className="absolute bottom-20 left-3 z-10 sm:bottom-6 sm:left-6">
        <LayerPanel />
      </div>

      <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex w-full -translate-x-1/2 justify-center px-4 sm:bottom-28">
        <DetailPanel />
      </div>

      <div className="absolute bottom-3 left-1/2 z-10 flex w-full max-w-[calc(100vw-1rem)] -translate-x-1/2 justify-center px-2 sm:bottom-6">
        <TimeScrubber />
      </div>
    </main>
  );
}
