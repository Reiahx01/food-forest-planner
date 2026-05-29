'use client';

/**
 * Left-rail element-type list for the editor shell (#13).
 *
 * Each entry is a stub button: clicking shows a tooltip "Element placement
 * lands in #14" via the native `title` attribute. The real interaction (draw
 * mode + module-driven panels) wires up in #14 via the ElementTypeModule
 * interface.
 *
 * Kept as a `use client` component because the future stub-click behavior
 * will become real client-side state (selected element type, draw mode).
 */
const ELEMENT_TYPES = [
  { id: 'guild', label: 'Guild', summary: 'Center tree + companions' },
  { id: 'pond', label: 'Pond', summary: 'Water feature' },
  { id: 'swale', label: 'Swale', summary: 'Earthwork line' },
  { id: 'path', label: 'Path', summary: 'Movement / access' },
  { id: 'bed', label: 'Bed', summary: 'Annual / herb bed' },
  { id: 'building', label: 'Building', summary: 'Structure footprint' },
] as const;

export function ElementSidebar() {
  return (
    <aside
      aria-label="Element types"
      className="flex h-full w-72 shrink-0 flex-col gap-2 border-r border-border-glass bg-surface-raised/40 px-4 py-5 backdrop-blur-md"
    >
      <p className="px-2 pb-2 text-xs uppercase tracking-[0.18em] text-text-muted">
        Elements
      </p>
      {ELEMENT_TYPES.map((e) => (
        <button
          key={e.id}
          type="button"
          title="Element placement lands in #14"
          className="flex flex-col items-start gap-0.5 rounded-md border border-border-glass bg-surface-glass px-3 py-2 text-left hover:border-border-solid disabled:opacity-60"
          disabled
        >
          <span className="text-sm font-medium text-text-primary">{e.label}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {e.summary}
          </span>
        </button>
      ))}
      <p className="mt-3 px-2 text-[10px] text-text-muted">
        Click an element to drop it on the map. Coming in #14.
      </p>
    </aside>
  );
}
