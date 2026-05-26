'use client';

import { useState, useTransition } from 'react';

/**
 * Brand-styled Property form used by both /new and /[id]/edit. The action
 * is supplied by the caller (createProperty or updateProperty.bind(id)).
 *
 * Today the form is just name + address. Polygon-draw + USDA-zone preview
 * land in #10 part 2 -- they bolt on as additional fields without
 * changing the action shape.
 */
interface PropertyFormProps {
  action: (formData: FormData) => Promise<unknown>;
  initial?: { name: string; address: string | null };
  submitLabel: string;
}

export function PropertyForm({ action, initial, submitLabel }: PropertyFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        // Server Actions surface validation errors as thrown Errors; the
        // redirect path also throws (NEXT_REDIRECT) but is handled by Next
        // before reaching this catch. So anything we catch here is a real
        // failure to display.
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
          We&apos;ll geocode the address and drop a pin on the map. You can refine the
          parcel outline next.
        </span>
      </label>

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
