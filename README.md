# DM Assistant

An all-in-one dungeon master assistant for world building, scene encounters, on-the-fly character tracking, and YouTube-based soundscapes — no backend required.

## Features

- **Modular dashboard** — show/hide and drag-reorder live modules
- **Location rail** — dedicated vertical list; toggle one location at a time
- **Scene picker** — Default (location weather/audio) or user-defined scenes per location
- **World building** — Locations with size, biome, atmosphere, default weather, and default music/ambience
- **Scene building** — Multiple scenes per location, encounters, linked enemies/NPCs, scene weather and audio overrides
- **Player tracker** — Roles, personality, traits, buffs/debuffs, skills, skill points, HP, and combat stats (editable live)
- **Enemy / NPC tracker** — Same live stat editing for foes and supporting cast
- **YouTube audio engine** — Dual music + ambience channels with URL, in-point, and out-point trimming (loops inside the window)
- **Theme (phase 1)** — Base, accent, and text color customization
- **Mobile-ready** — Responsive layout; location rail becomes a drawer on small screens

Data persists in `localStorage`. Export/import JSON from the Audio tab.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Open the app, toggle a **location** from the left rail, pick **Default** or a custom scene, and rearrange dashboard modules under **Customize**. Theme colors (base / accent / text) apply live.
