import { describe, it, expect, beforeEach } from "vitest";
import { useLayerStore } from "@/store/useLayerStore";

describe("useLayerStore", () => {
  beforeEach(() => {
    useLayerStore.setState({
      enabled: {
        earthquakes: true,
        flights: false,
        events: false,
        satellites: false,
        wind: false,
        air: false,
        launches: false,
      },
    });
  });

  it("starts with only earthquakes enabled", () => {
    const { enabled } = useLayerStore.getState();
    expect(enabled.earthquakes).toBe(true);
    expect(enabled.flights).toBe(false);
    expect(enabled.events).toBe(false);
  });

  it("toggles a layer on and off", () => {
    useLayerStore.getState().toggle("flights");
    expect(useLayerStore.getState().enabled.flights).toBe(true);
    useLayerStore.getState().toggle("flights");
    expect(useLayerStore.getState().enabled.flights).toBe(false);
  });

  it("sets a layer explicitly", () => {
    useLayerStore.getState().setEnabled("events", true);
    expect(useLayerStore.getState().enabled.events).toBe(true);
  });

  it("does not affect other layers when toggling one", () => {
    useLayerStore.getState().toggle("events");
    expect(useLayerStore.getState().enabled.earthquakes).toBe(true);
    expect(useLayerStore.getState().enabled.flights).toBe(false);
  });
});
