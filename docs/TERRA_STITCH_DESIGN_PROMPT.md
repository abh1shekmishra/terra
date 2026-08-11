# TERRA — "The Living Earth" · Master UI/UX Design Prompt (for Google Stitch)

## How to use this document
Stitch designs best one screen at a time from a clear brief. So:
1. Paste **PART B — Global Style System** at the top of *every* Stitch generation (it's the shared language).
2. Then paste **one screen block** from PART D per generation.
3. Keep the same style tokens across screens so the set feels like one product.

A note on scope for the build later (does not change the design): design the **entire** vision below, but tag each screen as **V1 (ship first)** or **Later**. V1 = a finished, applyable product. "Later" = the ambitious differentiators we add after.

---

## PART A — What Terra is (and the feeling)

**Terra is an interactive 3D digital twin of Earth** that fuses live planetary data (earthquakes, flights, weather/wind, wildfires, ocean, air quality, satellites, solar/space weather, aurora) into one cinematic, explorable experience — with time travel, event relationships, spatial investigation, and a natural-language command interface.

**The globe is the product.** The UI frames the Earth; it never buries it in a dashboard.

**First reaction target:** "What *is* this? It looks like a real product, not a demo."
**Second reaction:** "I want to touch it."

**It must feel:** cinematic, intelligent, restrained, premium, technical, believable — like a *planetary intelligence console*.

**It must NOT feel like:** Google Maps · a SaaS admin dashboard · a weather app · a Three.js experiment · a neon cyberpunk HUD · a crypto dashboard · a chatbot wrapped around a globe · a pile of map toggles.

**Core user journeys to support (design for these):**
- *Glance:* open Terra → immediately grasp "what's happening on Earth right now."
- *Explore:* toggle systems (geology, atmosphere, ocean, human, space) and watch them live.
- *Inspect:* click any event → rich contextual detail + cross-dataset context + source link.
- *Investigate:* pick a place + time + radius → a focused situation report.
- *Travel time:* scrub the last 24h/7d and watch the planet evolve; "What changed?"
- *Relate:* see how events connect (solar flare → CME → storm → aurora).
- *Ask:* type a question in plain language; Terra operates the globe to answer it.

---

## PART B — GLOBAL STYLE SYSTEM (paste on every generation)

Design a premium, dark, cinematic web application. Full-bleed 3D Earth as the environment; all UI floats over it as restrained glass surfaces.

**Color — environment & neutrals**
- Space background: `#05070d` (near-black, faint navy undertone). Stars very subtle.
- Primary text: `#f4f4f5` (near-white). Secondary: `#a1a1aa`. Tertiary/labels: `#71717a`.
- Never pure black or pure white.

**Color — surfaces (glass panels)**
- Panel fill: `rgba(9,9,11,0.60)` with backdrop blur (18–24px). Hairline border `rgba(255,255,255,0.10)`. Soft, low shadow only for floating panels. One consistent corner radius (16–20px large panels, 10–12px chips).

**Color — interactive / brand accent**
- Electric cyan-blue `#38bdf8`, used sparingly for focus, active state, links, the wordmark pulse.
- Live indicator: emerald `#34d399` (small pulsing dot).

**Color — DATA SEMANTICS (fixed meanings; reuse everywhere)**
- Earthquakes (by magnitude): green `#4ade80` → yellow `#facc15` → orange `#f97316` → red `#ef4444`.
- Flights: sky/cyan `#38bdf8` (brighter = higher altitude).
- Wildfires: warm orange `#f97316`. Volcanoes: red `#ef4444`. Severe storms: cyan `#38bdf8`. Sea/lake ice: pale cyan `#a5f3fc`.
- Ocean: deep blue → cyan gradient. Air quality (AQI): green `#22c55e` → yellow → orange → red → violet `#a21caf`.
- Aurora: green `#22c55e` / cyan / violet — used *very* sparingly, atmospheric not neon.
- Solar / space weather: amber-gold `#fbbf24`. Satellites: cool silver-white, group-tinted.

**Typography**
- Modern geometric/neo-grotesque sans (Geist, Inter, or similar). Feel: Linear / Vercel / Apple / aerospace — not a gaming HUD.
- Scale (approx): Display 28–34 / Title 18–20 / Body 13–14 / Label 10–11 uppercase tracked / Micro 9–10.
- Measurements, coordinates, timestamps, magnitudes, altitudes → **tabular / monospaced numerals** (selective, not everywhere).

**Spacing & layout**
- 4px base scale (4/8/12/16/24/32). Generous negative space. Group by proximity — gap *within* a group visibly tighter than *between* groups.

**Elevation**
- One language: hairline borders for structure; soft low shadows only for things that truly float (panels, menus). No stacked border+heavy-shadow+glow on one element.

**Motion**
- UI transitions 120–220ms, ease-out entering / ease-in leaving. Animate transform + opacity only.
- *Data* motion is physics, not decoration: quakes pulse, aircraft glide, storms drift, satellites orbit, wind flows, aurora breathes.
- Nothing gratuitous loops. Respect `prefers-reduced-motion` with a genuine reduced (not broken) experience.

**Iconography**
- Thin, precise line icons (1.5px), consistent set. Restrained.

**Effects discipline**
- No rainbow gradients, no giant glowing borders, no glassmorphism on everything, no decorative chrome. Every glow/blur must carry meaning (a data value, focus, or depth).

---

## PART C — GLOBAL LAYOUT & NAVIGATION

Full-screen 3D Earth. Floating, contextual controls that appear/disappear rather than permanently boxing the globe.

- **Top-left — identity:** small `TERRA` wordmark; beneath it, tiny `THE LIVING EARTH`. Do not make a big logo.
- **Top-center or top-left — Mode switcher** (the primary nav), 6 modes: **LIVE · EXPLORE · INVESTIGATE · SPACE · INSIGHTS · ASK TERRA**. Active mode subtle but unmistakable (underline/soft pill, accent text).
- **Top-right — Live status + Earth Activity readout** (typographic, not cards).
- **Left — contextual Layer controller** (Explore) or mode tools.
- **Right — contextual Detail / context panel** (slides in on selection).
- **Bottom — Time Machine scrubber** (persistent but slim; expands when used).
- **Bottom-left or floating — Ask Terra command bar.**
- Legends appear near their active layer, compact.

Regions must **compose** (layer panel + detail panel + time scrubber can coexist without crowding the globe). On smaller screens they collapse to sheets/drawers (see PART E).

---

## PART D — SCREENS (paste one block at a time into Stitch)

> Each block: **Purpose · Layout · Components · Copy · Interactions · Motion · States · Tier.**

### D1 — LIVE EARTH (home) — **V1**
- **Purpose:** The hero. Instantly answer "what's happening on Earth now."
- **Layout:** Full-bleed rotating Earth (real textures, day/night terminator, city lights, atmosphere rim, clouds, stars), slightly zoomed out (viewed from space — never load zoomed-in). Minimal overlays.
- **Components:**
  - Top-left identity block.
  - Top-right **Earth Activity** readout (typographic list, no cards):
    ```
    LIVE · 12:42 UTC
    EARTH ACTIVITY
    38   significant earthquakes
    312  active fires
    1,842 aircraft
    24   major weather systems
    17   space events
    ```
  - **Planetary Activity indicator** (subtle): a refined bar or circular meter labeled `PLANETARY ACTIVITY`, representing aggregated live intensity. Clickable → "Why is activity high?" breakdown (`Earthquakes +18% · Weather +31% · Fires +22% · Space +14%`). Make explicit it's an aggregated visualization, not a scientific "Earth score."
  - Bottom hint: `Drag to rotate · scroll to zoom · click a marker`.
- **Interactions:** rotate/zoom; hover marker → mini tooltip; click marker → Detail panel (D3); click empty → dismiss.
- **Motion:** slow auto-rotate when idle; markers pulse; gentle atmospheric shimmer.
- **States:** first-load "assembling live Earth…" (elegant), data-refresh subtle, offline banner.
- **Tier:** V1.

### D2 — LAYER CONTROLLER (Explore) — **V1 (core), grows Later**
- **Purpose:** Turn planetary systems on/off — the composable heart of Terra. NOT 20 ugly checkboxes.
- **Layout:** Left floating panel, collapsible category groups.
- **Groups & layers (with live count + status dot):**
  - **GEOLOGY:** Earthquakes · Volcanoes · Tectonic plates
  - **ATMOSPHERE:** Weather · Wind · Clouds · Lightning · Air quality · Storms
  - **BIOSPHERE:** Wildfires · Natural events
  - **OCEAN:** Temperature · Currents · Sensors (Argo) · Sea level
  - **HUMAN:** Flights · Shipping · Infrastructure (cables)
  - **SPACE:** Satellites · Debris · Solar activity · Aurora · Space weather
- **Row anatomy:** icon · name · live count · toggle · category-color dot. Group header collapsible with an aggregate count.
- **Interactions:** toggle; multiple simultaneously; **Isolate** (alt/hold or explicit action) → dims all but one; **Show all / Hide all**; per-layer **opacity** slider (where meaningful); per-layer legend + filter (e.g., min magnitude, altitude band).
- **States:** layer loading (shimmer count), empty ("no active events"), error ("feed unavailable, retrying"), "Soon" for not-yet-built layers.
- **Motion:** rows expand/collapse smoothly; toggles slide.
- **Tier:** V1 = Earthquakes/Flights/Events live + framework; the rest fill in over time.

### D3 — MARKER DETAIL PANEL — **V1**
- **Purpose:** Rich, contextual inspector for any selected event. Cross-dataset context is the signature.
- **Layout:** Right slide-in panel; Earth stays visible; on select, globe gently recenters the event.
- **Variant — Earthquake:**
  ```
  ● M5.7   mww          [TSUNAMI]   ✕
  128 km SSW of Sand Point, Alaska
  ── LOCATION 55.0°N 160.0°W   DEPTH 32 km   WHEN 12 min ago
  ── INTENSITY MMI 5.2   FELT REPORTS 214   ALERT [orange]
  ── SIGNIFICANCE 465    STATUS reviewed    FELT RADIUS ~354 km
  NEARBY ACTIVITY   14 aftershocks within 200 km
  ENVIRONMENT       Heavy rainfall · Wind 24 km/h        (Later)
  INFRASTRUCTURE    3 submarine cables within 500 km      (Later)
  SPACE             4 satellites overhead                 (Later)
  [ View on USGS ↗ ]   [ Explore connections → ]
  ```
- **Variant — Flight:** callsign, country, altitude, speed, heading+compass, vertical rate (climb/descent), squawk, ICAO24; (Later: aircraft type, route origin→destination, follow-cam).
- **Variant — Natural event:** category, title, reported date, track-point count, source link.
- **Interactions:** close (✕ / empty click); external link (new tab); "Explore connections" → Event Graph (D11). Cross-dataset rows only shown when data exists.
- **Motion:** slide+fade in 180ms; recenter globe.
- **Tier:** V1 (with the three current layers); cross-dataset rows Later.

### D4 — WEATHER & WIND FLOW — **Later (flagship "wow")**
- **Purpose:** Atmospheric, not icon-based. Feel the weather.
- **Modes toggle:** Temperature · Wind · Precipitation · Pressure · Cloud cover.
- **Wind Flow:** animated particle field following real wind vectors flowing over the surface; rotate the globe while flow continues. Altitude select: Surface / 10m / 850 hPa / 500 hPa. Subtle flow-speed legend (`0—20—40—60 km/h →`). Never overwhelm with particles.
- **Temperature/precip/pressure:** soft surface gradient fields, restrained.
- **States:** loading field, region without data (graceful gaps).
- **Tier:** Later (Tier 1 differentiator — Open-Meteo, keyless).

### D5 — OCEAN MODE — **Later**
- Same physical Earth; ocean data surfaces as **animated currents**, temperature gradients, sensor/Argo points, sea-level. Extremely subtle blue/cyan. Ocean feels alive. Click a sensor → measurements.

### D6 — AIR QUALITY MODE — **Later**
- Atmospheric **field** (soft volumetric/surface gradient), not thousands of dots. Legend: Good → Moderate → Poor → Very Poor (AQI colors). Click a region → nearby monitoring stations + real PM2.5/NO₂/etc. Time-scrub supported.

### D7 — SPACE MODE (Satellites) — **Later (major "holy shit")**
- **Purpose:** Zoom out; thousands of satellites orbit in real motion.
- **Layout:** Camera pulls back, Earth shrinks; orbital objects appear. Group toggles: Earth-observation · Weather · GPS · Comms · Space stations · Starlink · Scientific · Debris. Satellites small, not giant.
- **Satellite detail:** name, orbit (LEO/MEO/GEO), altitude, velocity, inclination, operator, current sub-point (e.g., "over India"), next pass. Primary action: **VIEW FROM SATELLITE**.
- **Tier:** Later (CelesTrak TLE, keyless; compute orbits client-side — great perf/math story).

### D8 — SATELLITE CAMERA MODE — **Later**
- Selecting "View from satellite" → cinematic camera transition into the satellite's orbital position; Earth fills the viewport from above; camera can travel the orbit track. Minimal overlay: name, altitude, inclination, next pass. Cinematic.

### D9 — SOLAR / SPACE-WEATHER MODE (Sun → Earth) — **Later (top "wow")**
- **Purpose:** Visualize the chain: ☀️ Sun → solar flare → CME propagating → Earth impact → geomagnetic storm → aurora.
- **Layout:** Sun off to one side; when a real CME/flare exists, show the event traveling toward Earth; on arrival, aurora + geomagnetic indicators respond.
- **Solar event detail:** class (e.g., M3.2), detected time, source region, related CME, Earth-impact status, geomagnetic risk. If not Earth-directed: clearly state "No Earth-directed impact detected."
- **Aurora sublayer:** subtle atmospheric glow around high-latitude regions, intensity from real data (NOAA OVATION). Never neon.
- **Rule:** never invent scientific causality — use real linked events (NASA DONKI) or state "spatially/temporally related."
- **Tier:** Later (NASA DONKI + NOAA SWPC, keyless).

### D10 — TIME MACHINE — **Later (flagship)**
- **Purpose:** Turn Terra into a planetary time machine.
- **Layout:** Slim bottom temporal scrubber; expands on use.
  ```
  08:00      09:00      10:00      11:00      NOW
  ●───────────●──────────●──────────●──────────◉
  ◀◀  ▶  ▶▶     window: [1H][6H][24H][7D][30D]
  ```
- **Interactions:** play / pause / rewind / FF / drag; change window preset. Layers update to the selected moment where historical data exists. Globe stays fully interactive while time moves.
- **Time-lapse:** `PLAY LAST 24 HOURS` → the Earth becomes a living movie (quakes pop, flights move, storms travel, fires evolve, satellites orbit, aurora shifts). Minimal cinematic playback controller. **This is a signature demo moment.**
- **States:** "no historical data for this layer at this time" (graceful).

### D11 — "WHAT CHANGED?" — **Later**
- **Purpose:** Homepage-worthy hook. Compare now vs a past point.
- **Layout:** prominent action `WHAT CHANGED?` → delta view:
  ```
  WHAT CHANGED?  · since 1 hour ago
  +14 earthquakes  +3 major fires  +8 storm systems  +2 space events
  NEW ACTIVITY
  🇯🇵 Japan   M5.4 earthquake
  🇨🇦 Canada  Fire activity +32%
  ☀️ Solar    M-class flare detected
  ```
- Each result clickable → globe focuses that event. Globe visually transitions between the two states.

### D12 — EVENT GRAPH (relationships) — **Later (unique)**
- **Purpose:** Show how events relate — spatially/temporally, or via real linked data — without implying false causality.
- **Layout:** From a selected event, a node graph (side panel or immersive):
  ```
  M5.7 EARTHQUAKE
    ├─ 14 aftershocks
    ├─ 4 satellites overhead
    ├─ 3 submarine cables nearby
    └─ regional weather
  ```
  or the solar chain: `SOLAR FLARE → CME → GEOMAGNETIC STORM → AURORA`.
- **Critical UI distinction:** visually differentiate **confirmed/linked relationships** (solid) from **spatial/temporal correlation** (dashed) with a legend. Never imply causality without evidence.
- Nodes clickable → transition to that event → investigative browsing.

### D13 — INSIGHTS (Earth Moments + Anomalies) — **Later**
- **Earth Moments:** Terra surfaces interesting *combinations* (e.g., "Indonesia: M5.7 + 23 aftershocks + heavy rain + 4 volcanoes nearby + 2,400 flights + 7 satellites overhead → INVESTIGATE"). A refined chronological feed — editorial, NOT social-media styled.
- **Anomalies:** compares current activity vs available historical baseline: "Japan seismic activity +42% above recent baseline · Confidence High · Window 6h." Make explicit it's an analytical signal, **not a prediction**.
- Each item clickable → Investigate (D14) focused on it.

### D14 — INVESTIGATE MODE — **Later (Tier-2 core)**
- **Purpose:** Deep dive: location + time + radius + datasets → a situation report.
- **Flow (stepper or compact form):** LOCATION (search city/country/coord/region) · TIME (window) · RADIUS (50/100/250/500/1000 km) · DATA (which layers).
- **Result view:** globe auto-focuses; right panel situation report:
  ```
  TOKYO · LAST 72 HOURS · 500 KM
  EARTHQUAKES 47  (strongest M5.8)
  WEATHER     Heavy precipitation
  FIRES       4 active
  FLIGHTS     1,284 nearby
  SATELLITES  11 passes
  INFRASTRUCTURE 3 submarine cables
  ```
  Everything clickable → drills into detail/graph.

### D15 — ASK TERRA (AI command console) — **Later (Tier-3)**
- **Purpose:** Natural language operates the globe — NOT a generic chat window. A *command console for the planet*.
- **Layout:** floating command bar (bottom / lower-left): `Ask Terra anything…  ⌕`. Example prompts as ghost suggestions:
  - "Show M5+ earthquakes around Japan, last 24h."
  - "What changed in Europe in the last 6 hours?"
  - "Which satellites are over India right now?"
  - "Active fires within 500 km of major airports."
- **Interaction sequence (design all four states):**
  1. **Input** (focused bar, suggestions).
  2. **Interpreting** (subtle "Terra is looking…" with the parsed intent shown as chips: `region: Japan · type: earthquake · min mag: 5 · window: 24h`).
  3. **Acting** (globe rotates/zooms, layers activate, camera focuses — visible, cinematic).
  4. **Result** (a concise result panel + one-line explanation of *what Terra did*, e.g., "Enabled Earthquakes, filtered M≥5, focused Japan, found 6 events.").
- **Principle:** Terra *operates the visualization*; it doesn't answer from its own knowledge. Show the tools it used.

### D16 — FIRST-RUN / ONBOARDING (optional) — **Later**
- A 10-second cinematic: Earth assembles from space; one line: "Terra — a living map of your planet." A "Skip" and a subtle "Try: what's happening near me?" Keep it optional and skippable; never gate the product.

### D17 — EARTH X-RAY (stretch "holy shit") — **Later / optional**
- Earth becomes semi-transparent: tectonic plates, earthquake **depth below surface** (a vertical hypocenter marker), ocean trenches, atmospheric layers, satellite orbits. Clicking a quake shows its true depth as a cross-section. A gorgeous, unusual Three.js moment — reserve as a showcase.

---

## PART E — CROSS-CUTTING (design these patterns once, reuse)

**Universal states (every data surface needs all four):**
- *Loading:* elegant shimmer / "assembling…" — never a raw spinner alone.
- *Empty:* meaningful copy ("No active events in view").
- *Error:* honest + recovering ("USGS feed unreachable — retrying").
- *Offline:* slim top banner; last-updated timestamp visible.

**Legends:** compact, near their layer; magnitude/altitude/AQI/temperature scales as small gradient bars with 3–4 ticks.

**Responsive / mobile:**
- Globe stays full-bleed. Panels become bottom sheets / slide-over drawers. Mode switcher → bottom tab bar or compact menu. Time scrubber → collapsible. Layer controller → sheet. Touch: one-finger rotate, pinch zoom, tap select, long-press isolate. Design **desktop + a mobile variant** for D1, D2, D3, D10, D15 at minimum.

**Accessibility (call these out in the designs):**
- Every control keyboard-reachable; visible focus ring (accent `#38bdf8`, 2px). Sufficient contrast on all text over the globe (use panel backing where needed). `prefers-reduced-motion` = calmer globe, no auto-timelapse.
- A **data-table fallback** view for each active layer (accessible list of the same events) — a rare, senior touch; design a clean "list view" toggle.
- Icons paired with text labels; color never the *only* signal (pair with shape/label).

**Data-viz component library to produce (reusable):** status dot · live badge · magnitude/AQI/altitude legend bar · stat row (label + tabular value) · category chip · toggle row · glass panel · detail-panel shell · node-graph node/edge (solid vs dashed) · time scrubber · command bar · activity meter.

---

## PART F — DELIVERABLES CHECKLIST (what to produce in Stitch)

**V1 (ship-first set — design these first):**
1. Live Earth home (D1) — desktop + mobile
2. Layer controller (D2) — desktop + mobile sheet
3. Marker detail panel — earthquake / flight / event variants (D3)
4. Loading / empty / error / offline states (E)
5. Legends + core component library (E)

**Later (differentiators — design after V1):**
6. Time Machine + time-lapse (D10) — desktop + mobile
7. "What Changed?" delta (D11)
8. Investigate mode + results (D14)
9. Event Graph (D12)
10. Insights: Earth Moments + Anomalies (D13)
11. Ask Terra console: input / interpreting / acting / result (D15)
12. Space mode + satellite detail + satellite-cam (D7, D8)
13. Solar/space-weather + aurora (D9)
14. Weather/Wind flow (D4), Ocean (D5), Air quality (D6)
15. Onboarding (D16), Earth X-ray (D17)

**For each screen, produce:** the layout, the populated (real-copy) state, and its loading/empty/error variants. Keep the Global Style System identical across all.

---

*Design the whole vision. We build it in tiers — V1 first so it can ship, the rest as the flagship grows.*
