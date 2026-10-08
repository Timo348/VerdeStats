# VerdeStats

Analyze Spotify Extended Streaming History entirely on your device. VerdeStats is a static browser application: the server receives no history uploads and no analysis results. JSON parsing, ZIP extraction and all calculations run in a dedicated Web Worker. No Spotify account connection or external media requests are used.

## Features

- Full, searchable song, artist and album rankings, sorted by listening time or plays, with detail pages and monthly history.
- Correct identity handling, inclusive end dates, overlap deduplication and recursive ZIP support.
- Music and podcast filters, automatic date coverage, year/month/custom periods and minimum listening seconds.
- Hover/focus details for hour cells, calendar days and timeline bars: listening time, plays and top three tracks/artists.
- Apostrophe/accent-tolerant search across titles, artists and albums; flexible word order, relevant global results and keyboard navigation.
- Forgotten favourites and personal milestones, with current-period rankings.
- Daily calendar, weekday/hour heatmap, daily/weekly/monthly/yearly charts, unique music counts and active-day averages.
- Listening streaks, record days, inferred sessions, repeat-heavy days/weeks and top-5/top-10 concentration.
- Skip/shuffle/offline ratios with explicit known-value coverage, device groups and country-code totals.
- GitHub-inspired dark layout, compact top-seven widgets, English/German translation and in-session dashboard widget ordering.

The approved first-stage scope is points 1–45 except the timezone selector and import diagnostic report. The timezone automatically follows your browser. Comebacks, first-in-import labels and prior-period comparisons were removed at the user’s request. Subsequent-year comparisons, recaps, image/PDF/CSV exports, profiles, permanent archives and Spotify API integration are outside this stage.

The complete original 75-point proposal, approved follow-up work and excluded features are recorded in [plan.md](plan.md). It reflects the later decisions to remove comparison labels and comebacks, keep all history in browser memory, and exclude Spotify integration.

## Run locally

Node.js 24 or newer:

```sh
npm ci --ignore-scripts
npm start
```

Open http://localhost:3000. `PORT` can change the development server port. The development server is read-only and rejects POST requests; there are no upload or analysis APIs.

## Docker

```sh
docker compose up -d --build
```

Open http://localhost:30008. The container serves only static assets on port 8080, runs without root, uses a read-only filesystem and does not mount personal files or an upload volume. The Compose port is bound to loopback for a reverse proxy on the host. For a proxy in another container, use a shared private Docker network instead.

The included Nginx configuration disables access and HTTP error logs, rejects methods other than GET/HEAD, sets a Content Security Policy that blocks application network requests, and disallows framing. Independently inspect the public reverse proxy, firewall/GeoIP monitoring and hosting configuration; this repository cannot attest to their logging settings.

## Static hosting

```sh
npm run build
```

Deploy the contents of `dist/` to a static web server. ZIP support is bundled locally, including its licence. Build dependencies are needed only during generation; the deployed application needs no Node runtime. Preserve the response headers from `nginx.conf` on other hosting systems. Do not add analytics, remote fonts or external scripts without re-evaluating the privacy claims.

## Use your data

Request **Extended streaming history** in Spotify's account privacy settings, follow its confirmation instructions, and open the downloaded ZIP or all history JSON files together. Nested ZIP folders are supported. The ordinary account-data export is a different format; use the extended export. The expandable on-page tutorial links to the official Spotify instructions.

Import calculates the initial dashboard using the full available music period. Filters recalculate within browser memory. Click a song/artist/album for details, a calendar cell or time-series bar to open its period, and use the navigation for complete rankings and listening behaviour. Choose **Discard data** to reset the application and terminate its worker. Reloading starts with an empty analysis. Original files are never changed.

## Privacy and storage

Only the explicitly selected language is stored under `verdestats-language` in Local Storage. Spotify histories, results and dashboard settings are not written to Local Storage, Session Storage, IndexedDB or cookies. Widget choices last only for the current page. Original file fields such as historic IP addresses, usernames and user-agent values are discarded during normalization. Country, device, timing and content fields remain in local memory for the requested analyses.

Clearing the data releases application references, clears displayed results and terminates the worker. Browser/OS memory reclamation is not a secure-erasure guarantee. The public server still processes connection metadata when delivering assets. See [the technical privacy review](docs/DATENSCHUTZ-PRUEFUNG.md); operator-specific legal notices are provided by the hosting website.

## Calculation definitions

- A play is a valid imported event passing the selected content/time/duration filters. Zero-duration events can remain when minimum seconds is zero.
- Timestamp fields denote the **end** of a stream. Calendar, hourly and monthly buckets use that end time in your browser's local timezone, including local inclusive date boundaries.
- Identities use Spotify URIs when available; fallbacks combine the title and artist (album identity also includes its artist). Different recordings with different URIs stay separate.
- Deduplication removes identical normalized listening events across overlapping files. Repeated plays at different times remain.
- Forgotten favourites need repeated previous listening and a long absence relative to the analysed period.
- Sessions are an estimate: reconstructed starts (`end - played duration`) separated by at most 30 minutes are grouped. They do not establish your activity or location.
- Boolean ratios exclude unknown values from the denominator and show coverage. No inference that every skipped track is disliked.
- Album pages describe tracks present in your export, not the album's complete official track list. Country codes do not establish precise places or travel routes.
- Empty results show no fabricated busiest hour/day. No population percentile or official Spotify Wrapped comparison is inferred.

Client import limits accommodate typical long histories: 200 files, 512 MiB per file, 2 GiB total/expanded JSON and two million valid events. Very large exports still depend on available browser memory. Limits protect your device, not a remote upload service.

## Verify

```sh
npm run check
npm test
npm audit
docker build -t verdestats:test .
```

Tests use synthetic histories and the included example. They verify calculation boundaries, duplicate/identity handling, insights, ZIP safeguards and the absence of server upload routes. CI checks syntax, tests, dependencies and the Docker build.

## License

MIT. Bundled fflate also uses the MIT license, provided alongside the deployed script.
