// The refusal of a commerce-role surface that holds no commerce region (Spec 48 FR-48-87: never SGS blocks imitating
// WooCommerce's forms). A cart, checkout, account or shop surface is WooCommerce's working piece in the page
// (lib/skeleton-commerce-region.mjs); when the writer finds no region for it, the page would be built from the draft's
// own blocks, a static imitation of the form WooCommerce draws. Three readers decide through this file:
//   - the skeleton writer raises a problem row (`noRegionProblem`);
//   - Fill refuses a skeleton whose surface has the commerce role and holds no region block (`commerceRefusal`);
//   - the site build refuses a stage 3 tree of the account page or of the shop, cart or checkout template copy that holds
//     none (`rowCommerceRole`, `commerceRefusal`).
// Only `commerceRoles` and `surfaceRefusal` read files (the decisions file, the client's page map).

import fs from 'fs';
import path from 'path';
import { isAccountRow } from './site-build-map.mjs';
import { commerceOf } from './skeleton-commerce-region.mjs';
import { DECISIONS_FILE } from './skeleton-facts.mjs';

// The problem text for a surface whose commerce role found no region: `region` is lib/skeleton-commerce-region.mjs::
// commerceRegion's result (null when no element reads as the region, `{ note }` when several do, so none is replaced).
// null when the surface has no commerce role or its region was found.
export function noRegionProblem( { surface, commerce, region } ) {
	if ( ! commerce?.role || region?.key ) {
		return null;
	}
	const why = region?.note ? region.note : 'no element of the draft reads as it';
	return `${ surface }: the ${ commerce.role } surface has no commerce region (${ why }), so WooCommerce's piece would not be placed and the page would imitate its form with the draft's own blocks (FR-48-87)`;
}

// Whether any block of `tree` (a list of { name, innerBlocks }) is `block`.
export function treeHoldsBlock( tree, block ) {
	return ( tree || [] ).some( ( n ) => n?.name === block || treeHoldsBlock( n?.innerBlocks, block ) );
}

// The commerce role of a page-map row whose own page tree is a commerce surface: the account page holds WooCommerce's
// account piece; null for any other row. The shop and product category rows build the shop template (the plan checks that
// copy by its template slug, lib/skeleton-commerce-region.mjs::COMMERCE_ROLES), and the cart and checkout pages keep
// WooCommerce's own content (lib/site-build-plan.mjs::keepsWooContent).
export const rowCommerceRole = ( row ) => ( isAccountRow( row ) ? 'account' : null );

// The refusal text for a tree of a commerce-role surface that holds no region block, else null. `roles` is
// rules.commerceRegion.roles ({ <role>: { block } }); `what` names the surface in the text.
export function commerceRefusal( { role, tree, roles, what } ) {
	const block = roles?.[ role ]?.block;
	if ( ! role || ! block || treeHoldsBlock( tree, block ) ) {
		return null;
	}
	return `${ what } is a ${ role } surface (WooCommerce's piece) and its tree holds no ${ block }, so it would be a static imitation of WooCommerce's form (FR-48-87); run the skeleton step and settle its commerce-region problem first`;
}

// rules.commerceRegion.roles from the standing decisions file ({ <role>: { block } }).
export const commerceRoles = () => JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ).rules.commerceRegion.roles;

// Fill's check of one surface: the surface's commerce role (lib/skeleton-commerce-region.mjs::commerceOf over the client's
// page map) against its skeleton `tree`. `entry` is the surface's sites/<client>/build/surfaces.json record. null when the
// surface has no commerce role or its tree holds the region block.
export function surfaceRefusal( { repo, client, entry, tree, surface } ) {
	const mapFile = path.join( repo, 'sites', client, 'build', 'page-map.json' );
	const commerce = commerceOf( entry, fs.existsSync( mapFile ) ? JSON.parse( fs.readFileSync( mapFile, 'utf8' ) ) : [] );
	return commerce ? commerceRefusal( { role: commerce.role, tree, roles: commerceRoles(), what: `surface "${ surface }"` } ) : null;
}
