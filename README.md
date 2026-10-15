# PhizChat Goalkeeper Demo

An interactive goalkeeper game prototype for mobile. The interface supports Chinese, English, and Brazilian Portuguese. It runs in a browser inside an iPhone or Pixel 10 preview frame.

## Run locally

Use a current Node.js release and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To produce the static build, run `npm run build`. The output is written to `dist/client/` and can be served as a single-page application. `vercel.json` contains the routing and output settings for Vercel.

## What the demo contains

Users can check in, complete simulated tasks to earn game points, play five-shot goalkeeper matches, use points for revival shots, and inspect a simulated cash balance in Wallet. Game progress is saved in the browser. The Wallet screen has a reset control.

This prototype does not connect to real identity verification, a social graph, or a payout service. Its rewards and task actions are illustrative.

## Project structure

`src/Prototype.tsx` implements the screens and local demo state. `src/prototype.css` contains game-specific styling. `src/mobile/` contains the device preview and interaction components. `public/assets/` contains artwork, device chrome, and game models. `scripts/check-mobile-runtime.mjs` verifies the bundled mobile runtime before development and build.
