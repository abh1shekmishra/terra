import GlobeCanvas from "@/components/GlobeCanvas";
import EarthActivity from "@/components/EarthActivity";
import LayerPanel from "@/components/LayerPanel";
import DetailPanel from "@/components/DetailPanel";
import TimeScrubber from "@/components/TimeScrubber";

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
        <EarthActivity />
      </div>

      <div className="absolute bottom-6 left-6 z-10">
        <LayerPanel />
      </div>

      <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 justify-center px-4">
        <DetailPanel />
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 px-4">
        <TimeScrubber />
      </div>
    </main>
  );
}
