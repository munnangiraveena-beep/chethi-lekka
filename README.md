# చేతి లెక్క

A tiny Telugu web app for everyday land and money calculations, made for elders. It has big text and big buttons, works offline, and can be added to the home screen.

- **విస్తీర్ణం (area):** gajam, cents, sq.ft, sq.m, acres. Type in any box and the others update.
- **పొడవు (length):** links, feet, metres, centimetres.
- **స్థలం (plot area):** rectangle, triangle, or any 4-sided plot (4 sides + 1 diagonal). Draws the shape as you type and shows the area in every unit. You can add a photo of the plot for reference; it stays on the phone.
- **లెక్కలు (calculator):** a simple calculator with Indian number grouping (1,00,000).
- **వడ్డీ (interest):** rupee interest (₹ per ₹100 per month) or % per year; simple or compound; a duration or two dates.

## Run locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy

These are plain static files with no build step. Import the repo into Vercel and deploy it as is.

When you change any file, bump `CACHE` in `sw.js` so installed phones pick up the update.
