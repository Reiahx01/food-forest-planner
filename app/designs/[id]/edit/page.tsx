import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PropertyMap } from '@/app/properties/PropertyMap';
import { getCurrentAccount } from '@/lib/auth/session';
import { getDesign } from '@/lib/designs/queries';
import { getProperty } from '@/lib/properties/queries';

import { ElementSidebar } from './ElementSidebar';

/**
 * Empty editor shell (#13). Full-screen MapLibre centered on the Property's
 * parcel; left sidebar lists the six element types as stubs (clicks tooltip
 * "coming in #14"); right sidebar is collapsed (it surfaces in #14 alongside
 * the panel-component pattern).
 *
 * Notably no <Nav> here: this is a focused canvas, not a navigation surface.
 * A breadcrumb back to the Design show page lives at the top-left of the
 * canvas as a small chip.
 */
export default async function DesignEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const { id } = await params;
  const design = await getDesign(id);
  if (!design) redirect('/properties');

  // Pull the parent Property so the map opens on the right view.
  const property = await getProperty(design.propertyId);
  if (!property) redirect('/properties');

  return (
    <div className="flex h-screen flex-col bg-surface-base">
      <header className="flex shrink-0 items-center justify-between border-b border-border-glass bg-surface-raised/40 px-5 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/designs/${design.id}`}
            className="text-xs uppercase tracking-[0.16em] text-text-muted hover:text-state-hover"
          >
            ← {design.name}
          </Link>
          <span className="text-xs text-text-muted">on {property.name}</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
          Editor shell · element placement coming in #14
        </span>
      </header>
      <div className="flex min-h-0 flex-1">
        <ElementSidebar />
        <div className="relative flex-1">
          {/*
           * The shared PropertyMap component is reused here -- it already
           * renders the parcel outline + center marker. The interactive
           * element layers from #14 will mount on top via map.addLayer
           * from each ElementTypeModule's `buildMapLayers` factory.
           */}
          <PropertyMap
            center={property.center}
            outline={property.parcelOutline}
            height="100%"
            showMarker={false}
          />
        </div>
      </div>
    </div>
  );
}
