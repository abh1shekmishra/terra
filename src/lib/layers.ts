/**
 * The registry of data layers. Each layer is a self-contained data source that
 * renders onto the shared globe; the control panel and the scene both read from
 * this list, so adding a new layer is a matter of adding an entry (plus its
 * renderer) rather than touching the plumbing.
 */
export type LayerId = "earthquakes" | "flights" | "events";

export interface LayerMeta {
  id: LayerId;
  label: string;
  description: string;
  source: string;
  color: string; // accent used for the dot + legend
  available: boolean; // false = built but not shipped yet ("Soon")
}

export const LAYERS: LayerMeta[] = [
  {
    id: "earthquakes",
    label: "Earthquakes",
    description: "Seismic events, past 24h",
    source: "USGS",
    color: "#f59e0b",
    available: true,
  },
  {
    id: "flights",
    label: "Flights",
    description: "Live air traffic",
    source: "OpenSky",
    color: "#38bdf8",
    available: false,
  },
  {
    id: "events",
    label: "Natural events",
    description: "Wildfires, storms, volcanoes",
    source: "NASA EONET",
    color: "#fb7185",
    available: false,
  },
];
