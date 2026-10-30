// A block drawn in two surfaces' renders (Spec 48 §3.4 Fill, RC5): the mega panel's own look is drawn in the menu bar's
// panel, its drawer look (link rows, cards, shell) only while the drawer menu renders it. Calibration measures the drawer
// look under fixture variants rendered in the drawer context (data/render-contexts.json: the variant's instance name to
// the surfaces.json kind whose render it is), and records under `variants` which fixture variants reached each setting.
// A setting every reaching variant of which renders in another surface's context is drawn there: a Fill run on a surface
// of any other kind leaves it out of the block's slot map, so the surface's own element never answers for it (the bar's
// panel ground is the panel's `panelBg`, never also the drawer's `drawerBg`), and lists it as not read on this surface.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const RENDER_CONTEXTS = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'render-contexts.json' ), 'utf8' ) );

// The surface kind each fixture variant of a block renders in: { <variant index>: kind }, for the variants whose instance
// names a render context (fixtures: calibration-fixtures.json; contexts: data/render-contexts.json).
export function variantContexts( fixtures, block, contexts = RENDER_CONTEXTS ) {
	const out = {};
	( fixtures?.[ block ]?.variants || [] ).forEach( ( v, i ) => {
		const kind = contexts.byInstanceName?.[ v?.metadata?.name ];
		kind && ( out[ i ] = kind );
	} );
	return out;
}

// The settings of a slot map drawn only in another surface's render: { attr: kind } for each setting whose reaching
// variants all render in one context other than `surfaceKind` (a setting no variant list names is the block's own).
export function otherRenderSettings( cal, byVariant, surfaceKind ) {
	const out = {};
	for ( const [ attr, s ] of Object.entries( cal?.settings || {} ) ) {
		const kinds = ( s.variants || [] ).map( ( i ) => byVariant[ i ] ?? null );
		const kind = kinds.length && kinds.every( ( k ) => k && k === kinds[ 0 ] ) ? kinds[ 0 ] : null;
		kind && kind !== surfaceKind && ( out[ attr ] = kind );
	}
	return out;
}

// A calibration loader for a Fill run on a surface of kind `surfaceKind`: each block's slot map without the settings drawn
// only in another surface's render, those listed under `otherRender` ({ attr: kind }). calFor: the route's loader.
export function renderScoped( calFor, { fixtures, surfaceKind, contexts = RENDER_CONTEXTS } ) {
	const seen = new Map();
	return ( block ) => {
		if ( seen.has( block ) ) {
			return seen.get( block );
		}
		const cal = calFor( block );
		const other = cal ? otherRenderSettings( cal, variantContexts( fixtures, block, contexts ), surfaceKind ) : {};
		const scoped = cal && Object.keys( other ).length ? { ...cal, settings: Object.fromEntries( Object.entries( cal.settings ).filter( ( [ attr ] ) => ! other[ attr ] ) ), otherRender: other } : cal;
		seen.set( block, scoped );
		return scoped;
	};
}

// One report row per node whose block has settings drawn in another surface's render: { node, block, surfaceKind,
// settings, reason }. nodes: skeleton nodes ({ name, ref }).
export function otherRenderRows( nodes, calFor ) {
	return nodes.flatMap( ( n ) => {
		const other = calFor( n.name )?.otherRender || {};
		const kinds = [ ...new Set( Object.values( other ) ) ];
		return kinds.map( ( kind ) => {
			const settings = Object.keys( other ).filter( ( a ) => other[ a ] === kind );
			return { node: n.ref, block: n.name, surfaceKind: kind, settings, reason: `${ n.name } draws ${ settings.length } settings only in the ${ kind } surface's render (calibration reached them only under its ${ kind }-context variants), so this surface's element does not answer for them; they are drawn by the ${ kind } surface's own instance of this content, which this run does not read` };
		} );
	} );
}
