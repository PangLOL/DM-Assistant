# DM Assistant

An all-in-one dungeon master assistant for world building, scene encounters, on-the-fly character tracking, and YouTube-based soundscapes — no backend required.

## Features

- **World building** — Locations with size, biome, atmosphere, default weather, and default music/ambience
- **Scene building** — Multiple scenes per location, encounters, linked enemies/NPCs, scene weather and audio overrides
- **Player tracker** — Roles, personality, traits, buffs/debuffs, skills, skill points, HP, and combat stats (editable live)
- **Enemy / NPC tracker** — Same live stat editing for foes and supporting cast
- **YouTube audio engine** — Dual music + ambience channels with URL, in-point, and out-point trimming (loops inside the window)

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

Open the app, pick a scene on **Session**, and use **Play scene audio** to drive the bottom audio dock.
