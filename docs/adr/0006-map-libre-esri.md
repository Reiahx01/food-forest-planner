# 0006 — MapLibre GL JS renderer + Esri World Imagery raster tiles

- **Status:** Accepted (2026-05-24)
- **Deciders:** @Reiahx01

## Context

The map is the **primary surface of the product**, not a widget embedded on a page. Users spend their session inside the map, drawing parcels, placing elements, toggling sectoring overlays. The map renderer and tile source decisions are therefore load-bearing in a way they wouldn't be for an app where the map is a contact-page niceity.

Two independent decisions are bundled here because their constraints interact:

1. **Map renderer** (the JavaScript library that draws tiles, vectors, and interactive layers).
2. **Tile source** (the imagery the renderer consumes for the base layer).

Constraints:

- **Distribution under AGPL-3.0** (see ADR-0001). The renderer must be license-compatible. The tile source's ToS must not encumber AGPL forks.
- **Free-tier cost ceiling** at expected v1 scale (low five-figure monthly active users with mid-five-figure tile loads).
- **Imagery quality.** Satellite/aerial imagery must be sharp enough to draw a parcel from. Vector basemaps without imagery are insufficient for this product.
- **Attribution requirements** must be acceptable in a permanent footer / map-corner ribbon.
- **Self-hostability for forks.** A self-hosted instance should be able to swap to a different tile source without rewriting application code.

## Decision

**Renderer: MapLibre GL JS.** An OSS fork of pre-relicense Mapbox GL JS, BSD-3-Clause, maintained by a multi-stakeholder community (AWS, MapTiler, Microsoft, others). No tokens, no per-request rate limit on the renderer itself.

**Tile source: Esri World Imagery (raster basemap)** via the public ArcGIS REST tile service:

```
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
```

Free for use under Esri's [Terms of Use for Living Atlas](https://www.esri.com/en-us/legal/terms/full-master-agreement) with required attribution: **"Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community"**. Attribution rendered persistently in the map's bottom-right via MapLibre's `attributionControl`.

**Tile abstraction layer.** The tile-source URL lives in **one config file** (`app/map/tile-sources.ts`) keyed by a `TileSource` enum. Application code references the enum, not the URL. Swapping to a different source (a self-hosted MapTiler instance, USGS National Map, etc.) is a one-line config change.

### What we render on top of the base imagery

- **Parcel outlines** drawn by the user (GeoJSON in MapLibre vector layers).
- **Elements** (points, lines, polygons) styled per `ElementTypeModule.paint` (see ADR-0002).
- **Sectoring overlays** (sun-path arcs, wind rose, water flow) as MapLibre vector layers with semi-transparent fills.

All overlay layers consume brand tokens (ADR-0004) for color so the map chrome reads as part of the product, not stock GIS output.

## Consequences

**Accepted positives:**

- **Renderer is free, fast, and license-compatible**. MapLibre actively releases (multiple versions per year as of 2026), has a healthy maintainer pool, and is the default choice for most new OSS map projects.
- **Tile source is free at our scale** and Esri's imagery is among the best globally available at zoom levels relevant to parcel-scale work (z16–z19).
- **Renderer + tile source are decoupled**. Swapping to OpenStreetMap raster tiles, MapTiler, or self-hosted serves only requires changing one URL in config.
- **No vendor lock-in via API key** — the public Esri endpoint requires no key. A self-hoster gets the same UX with zero signup.
- **Attribution is honest and prominent**, which matters for the project's relationship to the OSS geospatial community.

**Accepted negatives:**

- **Esri ToS reserves the right to change terms** for the public Living Atlas service. If they introduce a rate limit, a registration requirement, or remove the service, we have to swap tile sources. Mitigated by the abstraction layer — swap is config-only, not code-level.
- **Raster imagery is bandwidth-heavy.** Z18 tiles are ~50–150KB each. A user panning aggressively can pull megabytes of tiles per minute. Mitigated by browser cache + MapLibre's built-in tile cache + (optionally, later) a CDN proxy in front of Esri.
- **No vector basemap means no styling control over the basemap itself.** Roads, labels, terrain — what Esri ships is what we get. Mitigated by the fact that for a planning tool, the base imagery is reference, not aesthetic — we don't want users distracted by stylized basemap chrome.
- **AGPL distribution of the rendered map** raises subtle questions about whether tiles fetched at runtime count as combined work. The conservative answer is "tiles are runtime data, like server responses, not bundled work" — this is the prevailing community interpretation but is not a court ruling.

## Alternatives considered

- **Mapbox GL JS + Mapbox tiles**. Polished, widely-used, but the late-2020 relicense made the JS library proprietary + token-required and the BSL license is incompatible with AGPL. Rejected on license grounds.
- **Google Maps Platform**. Familiar UX, but ToS restricts derivative works and screenshot use in ways AGPL contributors would chafe against; cost above the free tier scales aggressively. Rejected.
- **Leaflet + OpenStreetMap tiles**. Leaflet is older and lighter than MapLibre but lacks WebGL rendering — performance on a editor with hundreds of layered overlays would suffer. OSM tiles are great for vector basemaps but the imagery is not at parcel-resolution quality globally. Rejected on performance + imagery-quality grounds.
- **Self-hosted vector tile pipeline** (Tilemaker / Tegola / Martin). Highest control, lowest runtime cost at scale, but the maintainer burden of running a tile pipeline against worldwide PBF data is unacceptable for a solo project. Revisit at v2 if traffic justifies it.
- **MapLibre + OpenAerialMap / USGS National Map** for imagery. OpenAerialMap coverage is uneven globally; USGS is US-only. Rejected as the primary; could be a tile-source enum option for users who prefer them.

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **Esri changes terms** for the public World Imagery endpoint — introduces rate limits, requires API keys, or removes the public service. → Swap to MapTiler (paid, generous free tier) or a self-hosted source via the tile-source abstraction. The renderer doesn't change.
- **Mapbox GL JS relicenses back to permissive** (extremely unlikely, included for completeness). → Reopen renderer choice; tile source is unaffected.
- **Tile traffic exceeds a monthly threshold** suggesting we're abusing Esri's free service. Specifically: > 10M tile requests / month sustained for two months. → Move to a paid provider or self-host before we get rate-limited.
- **A meaningful interactive performance regression** at high zoom + many overlay layers. → Reopen renderer choice (Mapbox-GL fork, Deck.gl on top of MapLibre, etc.).
- **An AGPL combined-work ruling** clarifies that fetched tiles are bundled work. → Reopen tile-source choice; favor self-hostable sources only.
