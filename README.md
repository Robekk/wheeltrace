# WheelTrace

Live, read-only telemetry dashboard for **Squeekchain** — the hamster economy on Sepolia.

![WheelTrace](cover.png)

## What it does

WheelTrace consumes two public Squeekchain endpoints and turns them into a live instrument panel:

- `GET https://api.squeekchain.com/v1/status` — hamster measurement (`rpmMilli`,
  `speedMmPerSecond`, `distanceMm`, `cumulativeWorkUnits`, `coreStatus`, `provenance`,
  `observedAt`, `freshness`) plus builder anchor/projection and oracle state.
- `GET https://api.squeekchain.com/v1/economy/state` — `chain.indexedThroughBlock`,
  `chain.safeThroughBlock`, `release.id`, supply and block-reward blocks.

The canvas wheel rotates at the **measured RPM integrated in real time**, so it shows the hamster's
actual cadence rather than an animation loop. A second canvas plots an RPM trace sampled in the
browser, and the panel carries block height, block progress, cumulative work units, distance,
settled round, indexed block, live supply in SQK and the provenance flag.

Everything is **read-only**: no keys, no signatures, no transactions. If the API is unreachable the
page falls back to a bundled snapshot and labels itself `snapshot` instead of pretending to be live.

## Squeekchain integration

This project exists only because of the Squeekchain public API — every number on screen comes from
it, and the wheel's entire motion model is driven by `measurement.rpmMilli`.

## Run it

```bash
node build.js                 # bundles src/core.js + src/html.js + snapshot.json -> index.html
node server.js                # http://127.0.0.1:8899  (static files + /api/wheel proxy)
```

## Layout

```
src/core.js     API reads + normalisation (measurement, builder, economy)
src/html.js     the whole page: style, markup, canvas wheel, RPM trace
src/index.js    Cloudflare Worker variant (/api/wheel, /api/history with KV + cron sampler)
build.js        emits the single-file index.html and asserts it (one document, one script, parses)
server.js       zero-dependency local host with a CORS-free /api/wheel proxy
snapshot.json   fallback snapshot bundled into the build
```

## Licence

MIT
