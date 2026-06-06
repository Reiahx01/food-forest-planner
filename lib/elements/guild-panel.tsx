'use client';

import type { GuildAttributes } from './guild';
import type { ElementPanelProps } from './types';

/**
 * Right-sidebar attribute editor for a Guild (#14 part 2). Controlled — the
 * editor host owns the attributes and debounce-saves each `onChange`.
 *
 * The center-tree + companion fields are plain species-id text inputs for now;
 * #15 swaps them for the SpeciesPicker. `errors` surfaces server-side Zod /
 * domain errors inline (the host keeps save disabled until the center tree set).
 */
const FIELD =
  'h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid';
const LABEL = 'text-xs uppercase tracking-[0.16em] text-text-muted';

export function GuildPanel({ value, onChange, errors }: ElementPanelProps<GuildAttributes>) {
  const centerError = errors?.centerTreeSpeciesId?.[0];

  return (
    <div className="flex flex-col gap-5">
      <label htmlFor="guild-center-tree" className="flex flex-col gap-2">
        <span className={LABEL}>Center tree (species ID)</span>
        <input
          id="guild-center-tree"
          type="text"
          required
          aria-invalid={centerError ? true : undefined}
          aria-describedby={centerError ? 'guild-center-tree-error' : undefined}
          value={value.centerTreeSpeciesId}
          onChange={(e) => onChange({ ...value, centerTreeSpeciesId: e.target.value })}
          placeholder="Pick a species — picker arrives in #15"
          className={FIELD}
        />
        {centerError ? (
          <span id="guild-center-tree-error" role="alert" className="text-xs text-state-danger">
            {centerError}
          </span>
        ) : null}
      </label>

      <label htmlFor="guild-spacing" className="flex flex-col gap-2">
        <span className={LABEL}>Spacing (metres, optional)</span>
        <input
          id="guild-spacing"
          type="number"
          min="0"
          step="0.1"
          value={value.spacingMeters ?? ''}
          onChange={(e) =>
            onChange({ ...value, spacingMeters: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className={FIELD}
        />
      </label>

      <label htmlFor="guild-notes" className="flex flex-col gap-2">
        <span className={LABEL}>Notes (optional)</span>
        <textarea
          id="guild-notes"
          rows={3}
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value === '' ? undefined : e.target.value })}
          placeholder="Mulch heavily; underplant with comfrey…"
          className="rounded-md border border-border-glass bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
        />
      </label>
    </div>
  );
}
