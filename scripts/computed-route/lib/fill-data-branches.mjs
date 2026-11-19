// Fill's draft read shows the data branches the surface's inventory read (lib/skeleton-data-branches.mjs). The inventory marks
// each element a branch shows only for some data with `branch: { component, hosts, keys }`, and the skeleton holds a block for
// it; Fill reads the draft at rest, where that element is not rendered, so its look would never be read. Before Fill reads a
// page, the same keys are forced at the same seam (lib/skeleton-data-branches.mjs::forceRenderVals: the mounted logic's own
// renderVals, re-rendered through its setState), every branch at once: each forced branch is one the draft hides at rest and
// its opposite stays as it is, so they never displace each other. A surface whose inventory marks no branch is read at rest,
// exactly as before.
import { forceRenderVals } from './skeleton-data-branches.mjs';
import { SERVED_ROOT } from './key-space.mjs';

// The patches to force for one surface's inventory: [ { hosts, keys } ], one per host list, with the keys of every branch the
// inventory read on those hosts. None when the inventory marks no element.
export function branchesShown( inventory ) {
	const out = new Map();
	for ( const e of inventory?.elements || [] ) {
		const b = e.branch;
		if ( ! b?.keys ) {
			continue;
		}
		// A mark saved before marks named their hosts holds the component alone: it is forced where the inventory's hosts rule
		// forces it (lib/skeleton-data-branches.mjs::inventoryBranches), the component and the served root.
		const hosts = b.hosts?.length ? b.hosts : [ b.component, SERVED_ROOT ];
		const id = JSON.stringify( hosts );
		out.has( id ) || out.set( id, { hosts, keys: {} } );
		Object.assign( out.get( id ).keys, b.keys );
	}
	return [ ...out.values() ];
}

// Forces the patches on a page Fill opened (after it settled); returns how many host instances it reached (0: nothing forced,
// the page is as it was).
export async function showBranches( page, branches = [] ) {
	let reached = 0;
	for ( const b of branches || [] ) {
		reached += await page.evaluate( forceRenderVals, { hosts: b.hosts, patch: b.keys } );
	}
	return reached;
}
