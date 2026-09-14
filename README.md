# DM Assistant

Client-only dungeon master app (Vite + React) for GitHub Pages. No server to host.

## Play on two devices (low friction)

Players should **not** sit on the DM desktop — that screen has notes and upcoming scenes.

1. Open the same site. First visit asks **DM or player** (remembered until **Switch role**).
2. DM goes to **Map**, clicks **Open player table**, and keeps that tab open.
3. Players create a character if they need one, download the CSV (and portrait), send it to the DM, then join with the 4-letter code or QR (`/?role=player&room=ABCD`).
4. They only see the map, pick a character, Move/Attack, and **Propose**. The DM **Accept / Decline** on the DM device.

Old `play.html` links still work — they redirect to the player path.

Live play uses a peer connection (internet required). No shared folders, no Google login.

CSV downloads in **Customize** are optional backups. **Hand out character files** gives each player their own CSV after a session.

## Features

- One site with a DM / Player gate
- In-app character creator (5e-lite + portrait stored as a data URL in the CSV)
- 2D desktop modules (drag/resize); phones stack in 1D
- Location rail, scenes, YouTube audio with in/out points
- Grid maps: import an image, paint walkable cells, place tokens (portraits on tokens)
- 5e-lite: speed, AC, attack bonus, damage dice, d20 (adv/dis)
- Character CSV import/export on Players
- Theme colors

## Develop

```bash
npm install
npm run dev
```

- Same URL: `http://localhost:5173/`
- Player join: `http://localhost:5173/?role=player&room=ABCD`

## Build

```bash
npm run build
npm run preview
```

GitHub Pages is served from `/DM-Assistant/` in production builds.
