'use client';

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import type { ParcelOutline } from '@/lib/properties/queries';
import { buildBaseStyle, DEFAULT_VIEW } from '@/lib/map/config';

import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface PropertyMapProps {
  /** Optional center; falls back to the continental US wide view. */
  center?: { lat: number; lon: number } | null;
  /** Map height in CSS units. Width is always 100%. */
  height?: string;
  /** When true, drop a marker on `center`. Default true. */
  showMarker?: boolean;
  /**
   * Read-only outline overlay shown on the show page. Ignored when the map
   * is in `editable` mode -- in that case the draw control owns the polygon
   * state.
   */
  outline?: ParcelOutline | null;
  /** When true, mount the polygon-draw control + emit changes via onOutlineChange. */
  editable?: boolean;
  /** Existing outline to load into the draw control on mount (edit flow). */
  initialOutline?: ParcelOutline | null;
  /** Fires whenever the user finishes drawing / editing / deleting the polygon. */
  onOutlineChange?: (outline: ParcelOutline | null) => void;
}

const OUTLINE_FILL_LAYER = 'parcel-outline-fill';
const OUTLINE_LINE_LAYER = 'parcel-outline-line';
const OUTLINE_SOURCE = 'parcel-outline';

/**
 * Shared MapLibre + Esri map (#10).
 *
 * Two modes:
 *   - read-only: renders a center marker + optional `outline` polygon over
 *     the basemap.
 *   - editable: mounts `mapbox-gl-draw` (compatible with MapLibre via the
 *     small constructor option) so the user can draw / edit a single
 *     polygon. Emits the current outline as a GeoJSON Polygon (or null)
 *     through `onOutlineChange`.
 *
 * Client-only via `use client`; MapLibre touches the DOM directly so server
 * rendering is a no-op.
 */
export function PropertyMap({
  center,
  height = '420px',
  showMarker = true,
  outline,
  editable = false,
  initialOutline,
  onOutlineChange,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Latest callback in a ref so the map-init effect doesn't re-fire when the
  // parent re-renders with a fresh function identity for `onOutlineChange`.
  const onChangeRef = useRef(onOutlineChange);
  useEffect(() => {
    onChangeRef.current = onOutlineChange;
  }, [onOutlineChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = center
      ? [center.lon, center.lat]
      : DEFAULT_VIEW.center;
    const initialZoom = center ? 16 : DEFAULT_VIEW.zoom;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Our `BaseStyle` is a hand-typed subset of MapLibre's
      // `StyleSpecification`. Cast bridges the index-signature mismatch.
      style: buildBaseStyle() as unknown as maplibregl.StyleSpecification,
      center: initialCenter,
      zoom: initialZoom,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

    let marker: maplibregl.Marker | null = null;
    if (center && showMarker) {
      marker = new maplibregl.Marker({ color: 'oklch(72% 0.13 80)' })
        .setLngLat([center.lon, center.lat])
        .addTo(map);
    }

    // mapbox-gl-draw wants a `mapboxgl` global with `Marker`/`LngLat` -- in
    // MapLibre we shim it before constructing the control.
    let draw: MapboxDraw | null = null;
    const handleDrawChange = () => {
      if (!draw) return;
      const fc = draw.getAll();
      const polygon = fc.features.find(
        (f) => f.geometry?.type === 'Polygon',
      );
      if (!polygon) {
        onChangeRef.current?.(null);
        return;
      }
      const geom = polygon.geometry as ParcelOutline;
      onChangeRef.current?.({ type: 'Polygon', coordinates: geom.coordinates });
    };

    map.on('load', () => {
      if (editable) {
        // The library reads `mapboxgl.LngLat` from window.mapboxgl at
        // construction time. Provide MapLibre's class under that name.
        (window as unknown as { mapboxgl?: typeof maplibregl }).mapboxgl ??= maplibregl;
        draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, trash: true },
          defaultMode: 'simple_select',
        });
        // The draw control adds itself as a MapLibre IControl despite its
        // mapbox name; the runtime API is identical.
        map.addControl(draw as unknown as maplibregl.IControl);

        if (initialOutline) {
          draw.add({
            type: 'Feature',
            properties: {},
            geometry: initialOutline,
          });
        }

        map.on('draw.create', handleDrawChange);
        map.on('draw.update', handleDrawChange);
        map.on('draw.delete', handleDrawChange);
      } else if (outline) {
        map.addSource(OUTLINE_SOURCE, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: outline },
        });
        map.addLayer({
          id: OUTLINE_FILL_LAYER,
          type: 'fill',
          source: OUTLINE_SOURCE,
          paint: {
            'fill-color': 'oklch(72% 0.13 80)',
            'fill-opacity': 0.25,
          },
        });
        map.addLayer({
          id: OUTLINE_LINE_LAYER,
          type: 'line',
          source: OUTLINE_SOURCE,
          paint: {
            'line-color': 'oklch(72% 0.13 80)',
            'line-width': 2,
          },
        });
      }
    });

    return () => {
      marker?.remove();
      map.remove();
    };
    // `outline` and `initialOutline` are intentionally not re-listened to:
    // changing them after mount should remount the map (rare path). Caller
    // can `key={...}` the component to force a remount when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, showMarker, editable]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border-glass"
      style={{ height }}
    />
  );
}
