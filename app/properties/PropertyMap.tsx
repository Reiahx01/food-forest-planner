'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { buildBaseStyle, DEFAULT_VIEW } from '@/lib/map/config';

import 'maplibre-gl/dist/maplibre-gl.css';

interface PropertyMapProps {
  /** Optional center; falls back to the continental US wide view. */
  center?: { lat: number; lon: number } | null;
  /** Map height in CSS units. Width is always 100%. */
  height?: string;
  /** When true, drop a marker on `center`. Default true. */
  showMarker?: boolean;
}

/**
 * Shared MapLibre + Esri map (#10). Today this renders a basemap + an
 * optional center marker. The polygon-draw control ships in #10 part 2
 * and is added here as an additional optional prop -- the surrounding
 * code doesn't need to change.
 *
 * Client-only by `use client`; MapLibre touches the DOM directly so
 * server rendering is a no-op.
 */
export function PropertyMap({ center, height = '420px', showMarker = true }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = center
      ? [center.lon, center.lat]
      : DEFAULT_VIEW.center;
    const initialZoom = center ? 16 : DEFAULT_VIEW.zoom;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Our `BaseStyle` is a hand-typed subset of MapLibre's
      // `StyleSpecification`. The shapes are compatible at runtime; the
      // cast is the cheapest way to bridge the index-signature mismatch.
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

    return () => {
      marker?.remove();
      map.remove();
    };
  }, [center, showMarker]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border-glass"
      style={{ height }}
    />
  );
}
