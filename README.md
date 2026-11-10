# SFA Domes · booking prototype

Live: https://mealy-webook.github.io/sfa-domes/

A clickable prototype of the SFA Domes Dammam website by Webook: sports and courts, court booking, ladies hours,
open games, training programs, checkout, the booking confirmation and My account (tickets, saved courts, children).

**Demo mode.** GitHub Pages can't run the server, so on github.io the browser plays the server's part
(`f/demo-api.js`): you start signed in as the demo account Sara, sign-in accepts any password, payments go to a test
payment page (no money moves) and everything you book is saved in your own browser only.
Add `?demo-reset=1` to any page to start over.

**Run it with the real server** (Node 18+): `node server.js` → http://localhost:4788. PayTabs keys go in `.env`
(see `.env.example`); without them payments stay in test mode.

Fonts: Loew Next files here are a personal-use demo and need a licence before launch.
