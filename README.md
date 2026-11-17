# Campus Canteen — frontend-only edition

A canteen pre-booking demo built with **HTML, CSS and vanilla JavaScript only**. There is no Java, no Node server and no database: the app's data layer runs in the browser and persists to `localStorage`, so every screen works exactly like the full stack version.

## Run it

Just open `index.html` — double-click it, or drag it into a browser. There is no server and nothing to install.

`index.html` loads `js/app.bundle.js`, a single classic script, so it also works on a plain `file://` page. Hosting it is optional: any static host works too (GitHub Pages, Netlify, a college web server).

If you want to run it from a local server instead:

```bash
python3 -m http.server 3000   # then open http://localhost:3000
```

## Demo accounts

Password for every seeded account: `demo1234`

| Role | Accounts |
|---|---|
| Student | `aarav@campus.edu`, `diya@campus.edu`, `kabir@campus.edu`, `rohan@campus.edu` |
| Canteen staff | `staff@campus.edu` (Main Canteen), `staff.north@campus.edu` (North Block Counter), `staff.library@campus.edu` (Library Kiosk) |
| Admin | `admin@campus.edu` |

## What it does

- **Students** browse the menu with search, canteen filter and category pills, add dishes to a cart (buttons show how many are added), book a pickup slot for today, track orders, cancel up to an hour before, and rate collected dishes.
- **Staff** run one canteen: they add and edit that canteen's dishes, toggle availability, and move orders through Confirmed → Preparing → Ready → Completed in their own queue.
- **Admins** manage accounts (create, edit, revoke, delete), canteens, the full menu including today's pick, all orders and review moderation.

Cart lines from different canteens become one booking per canteen, since each counter hands over its own food.

## How it works without a backend

- `js/backend.js` is a browser-side port of the original Java API: same routes, same validation, same error messages (login, menu, orders, reviews, accounts, counters).
- `js/api.js` keeps the same `request()` interface the UI already used, so no page code changed — it just calls `backend.js` instead of `fetch`.
- Data lives in `localStorage` under `canteen.db.v1`; sessions are tokens in `canteen.tokens.v1`.

**Limitations of a browser-only build:** data is per browser (not shared between devices or students), passwords are visible in the page source, and admin-only rules are enforced in the browser rather than on a server. That makes it ideal for a demo or presentation, not for real use.

To start over with fresh seed data, clear the site's storage in DevTools (Application → Storage → Clear site data) and reload.

## Project layout

```
index.html          single page shell and boot fallback
css/styles.css      the whole design system
js/app.js           routing, state, cart, form handlers (entry module)
js/api.js           request() + session storage
js/backend.js       browser-side API and seed data
js/ui.js            shared rendering helpers
js/pages/           login, student, staff, admin and profile screens
js/app.bundle.js    generated: all modules in one classic script
build.js            turns js/*.js into js/app.bundle.js
food/               dish photos
```

## Editing the code

`js/app.bundle.js` is generated — don't edit it by hand. The real source is the module files next to it (`js/*.js`, `js/pages/*.js`); after changing any of them, rebuild the bundle:

```bash
node build.js
```

That's the only tool needed — it uses nothing but Node itself, no packages.
