'use client';

import { useState, useTransition } from 'react';

import { PropertyMap } from './PropertyMap';

import type { ParcelOutline } from '@/lib/properties/queries';

/**
 * Brand-styled Property form used by both /new and /[id]/edit. Owns the
 * polygon-draw state and feeds it back to the parent action via a hidden
 * `parcel_outline` input (JSON-encoded GeoJSON Polygon).
 *
 * Today the form is name + address + parcel outline. Role-aware client
 * assignment lands in #12; outline editing on existing properties picks up
 * the current value via `initial.outline`.
 */
interface PropertyFormProps {
  action: (formData: FormData) => Promise<unknown>;
  initial?: {
    name: string;
    address: string | null;
    center?: { lat: number; lon: number } | null;
    outline?: ParcelOutline | null;
  };
  submitLabel: string;
}

export function PropertyForm({ action, initial, submitLabel }: PropertyFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<ParcelOutline | null>(initial?.outline ?? null);

  function handle(formData: FormData) {
    setError(null);
    // Inject the drawn outline as JSON before the action runs. Empty string
    // means "no outline" -- the action clears the column on update.
    formData.set('parcel_outline', outline ? JSON.stringify(outline) : '');
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        if (err instanceof Error && !err.message.startsWith('NEXT_REDIRECT')) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <form action={handle} className="flex flex-col gap-5">
      <label htmlFor="name" className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-text-muted">Name</span>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name ?? ''}
          placeholder="Home acreage, Smith client, ..."
          className="h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
        />
      </label>

      <label htmlFor="address" className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
          Address (optional)
        </span>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={initial?.address ?? ''}
          placeholder="123 Main St, Anytown, USA"
          className="h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
        />
        <span className="text-xs text-text-muted">
          We&apos;ll geocode the address, drop a pin, and look up the USDA hardiness
          zone. Draw the parcel below.
        </span>
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-xs uppercase tracking-[0.16em] text-text-muted">
          Parcel outline (optional)
        </legend>
        <p className="text-xs text-text-muted">
          Use the polygon tool on the map to trace the boundary. Click each corner;
          double-click the last one to close the shape. The trash icon clears it.
        </p>
        <PropertyMap
          editable
          center={initial?.center ?? null}
          initialOutline={initial?.outline ?? null}
          onOutlineChange={setOutline}
        />
      </fieldset>

      {error ? (
        <p role="alert" className="text-xs text-state-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-md border border-border-chrome px-5 text-sm font-medium disabled:opacity-60"
        style={{
          background: 'var(--gradient-accent-chrome)',
          color: 'var(--color-text-inverse)',
          boxShadow: 'var(--shadow-chrome)',
        }}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
