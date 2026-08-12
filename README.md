# Terra

An interactive 3D globe that renders live planetary data in the browser — real-time
flights, earthquakes, satellites, and surface wind on a photoreal Earth you can spin,
zoom, and inspect.

Most "live data globe" sites do one thing: Flightradar shows planes, nullschool shows
wind, USGS shows quakes. Terra puts them on a single globe, each as a toggleable layer,
all from real public data.

## Layers

- **Flights** — live aircraft from OpenSky (ADS-B). Search by airline or flight number;
  click a plane for its real flown track, route, aircraft type, and a photo of the
  airframe.
- **Earthquakes** — USGS real-time feed, sized by felt radius, with tectonic plate
  boundaries and depth-on-click.
- **Satellites** — CelesTrak TLEs propagated with SGP4: orbit trails, a "ride the
  satellite" camera, and launch/mission metadata.
- **Wind** — live global surface wind (Open-Meteo) as an animated particle-flow field.
- **Natural events** — wildfires, storms, and volcanoes from NASA EONET.

Every layer is real data, correctly geolocated, and refreshed on its own cadence.

## Tech

- Next.js (App Router), React, TypeScript
- React Three Fiber / three.js, with custom GLSL shaders for the Earth (day/night
  terminator, city lights, tangent-space normal mapping, atmosphere)
- Zustand for state, TanStack Query for data, with server-side proxy routes for CORS
  and caching
- satellite.js for SGP4 orbital propagation

## Data sources

USGS · OpenSky · CelesTrak · Open-Meteo · NASA EONET · adsbdb · planespotters — all
free and public.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Notes on data honesty

- Flight coverage is whatever OpenSky sees (roughly 6–11k aircraft) — excellent over
  Europe and North America, sparser elsewhere. It is not the full picture a paid feed
  like Flightradar24 has.
- Scheduled flight routes come from public databases and can be outdated, so a route is
  only drawn when it matches the aircraft's live position. The detail panel labels each
  field as live telemetry or looked-up reference data.
