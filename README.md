# DM Assistant

Client-only dungeon master app (Vite + React) for GitHub Pages. No server to host.

## Play on two devices (low friction)

Players should **not** sit on the DM desktop — that screen has notes and upcoming scenes.

1. DM opens the main app, goes to **Map**, clicks **Open player table**.
2. A 4-letter code and QR/link appear. Keep that tab open.
3. Players open `play.html` on their phones (or scan the QR) and enter the code.
4. They only see the map, pick a character, Move/Attack, and **Propose**. The DM **Accept / Decline** on the DM device.

Live play uses a peer connection (internet required). No shared folders, no Google login.

CSV downloads in **Customize** are optional backups, not the live protocol.

## Features

- 2D desktop modules (drag/resize); phones stack in 1D
- Location rail, scenes, YouTube audio with in/out points
- Grid maps: import an image, paint walkable cells, place tokens
- 5e-lite: speed, AC, attack bonus, damage dice, d20 (adv/dis)
- Character CSV import/export on Players
- Theme colors

## Develop

```bash
npm install
npm run dev
```

- DM: `http://localhost:5173/`
- Players: `http://localhost:5173/play.html`

## Build

```bash
npm run build
npm run preview
```

GitHub Pages is served from `/DM-Assistant/` in production builds.
