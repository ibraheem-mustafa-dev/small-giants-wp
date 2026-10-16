/**
 * The entrance clip reveal's edge and anchor for the editor-canvas emitter: the twin of
 * `includes/motion/class-sgs-motion-clip-edge.php`. When any device tier of an end chooses a single edge or an anchor,
 * that end's uniform holder `--sgs-me-<end>-clip` is replaced, in every tier that sets a clip value, by the four edge
 * holders `--sgs-me-<end>-clip-<t|r|b|l>`: the amount on the chosen edge and 0% elsewhere (all four on `all`). An
 * anchor (`x-sgs-clip-anchors`) starts the edge on its measured side at `var(<property>, <amount>)` and on the opposite
 * side at `calc(100% - var(<property>, <100 - amount>%))`; on any other edge it is not written and is reported.
 * An `open` entrance's close amount follows the same edge (`applyCloseClipEdge`): `--sgs-me-close-to-clip` becomes the
 * four `--sgs-me-close-to-clip-<t|r|b|l>`, so a one-edge wipe closes only its edge.
 *
 * @package SGS\Blocks
 */

import { ME_PREFIX, TIERS, valueCss } from './motion-schema';
import defs from '../../../../components/motion/motion-defs';

const EDGES = { top: 't', right: 'r', bottom: 'b', left: 'l' };
const OPPOSITE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
const has = ( obj, key ) => Object.prototype.hasOwnProperty.call( obj, key );

/** The schema's anchor rows. */
export function clipAnchors() {
	return defs[ 'x-sgs-clip-anchors' ] || {};
}

function complement( amount ) {
	const rest = 100 - Number( amount );
	return `${ Number.isInteger( rest ) ? rest : Number( rest.toFixed( 4 ) ) }%`;
}

function edges( def, amount, edge, anchor, report ) {
	const css = String( valueCss( def, 'clip', amount ) );
	const out = {};
	Object.entries( EDGES ).forEach( ( [ name, suffix ] ) => {
		out[ suffix ] = edge === 'all' || name === edge ? css : '0%';
	} );
	if ( anchor === 'none' ) {
		return out;
	}
	const row = clipAnchors()[ anchor ];
	const side = row ? String( row.measuredFrom || '' ) : '';
	const prop = row ? String( row.property || '' ) : '';
	if ( ! EDGES[ side ] || ! /^--[a-z0-9-]+$/.test( prop ) || ( edge !== side && OPPOSITE[ side ] !== edge ) ) {
		report( { id: 'clip-anchor-edge', anchor, edge } );
		return out;
	}
	out[ EDGES[ edge ] ] = edge === side ? `var(${ prop }, ${ css })` : `calc(100% - var(${ prop }, ${ complement( amount ) }))`;
	return out;
}

/**
 * Rewrite each end's clip holders for a single edge or an anchor.
 *
 * @param {Object}   tiers  Per-tier entrance values.
 * @param {Object}   decls  Per-tier declarations (mutated).
 * @param {Function} report Called with a drop record when an anchor cannot apply.
 */
export function applyClipEdge( tiers, decls, report = () => {} ) {
	[
		[ 'from', 'EntranceFrom' ],
		[ 'to', 'EntranceTo' ],
	].forEach( ( [ end, def ] ) => {
		let amount = null;
		let edge = 'all';
		let anchor = 'none';
		let single = false;
		const settings = {};
		TIERS.forEach( ( tier ) => {
			const values = tiers[ tier ][ end ] && typeof tiers[ tier ][ end ] === 'object' ? tiers[ tier ][ end ] : {};
			let set = false;
			if ( has( values, 'clip' ) && valueCss( def, 'clip', values.clip ) !== null ) {
				amount = values.clip;
				set = true;
			}
			if ( has( values, 'clipEdge' ) && valueCss( def, 'clipEdge', values.clipEdge ) !== null ) {
				edge = String( values.clipEdge );
				set = true;
			}
			if ( has( values, 'clipFromAnchor' ) && valueCss( def, 'clipFromAnchor', values.clipFromAnchor ) !== null ) {
				anchor = String( values.clipFromAnchor );
				set = true;
			}
			if ( set && amount !== null ) {
				settings[ tier ] = [ amount, edge, anchor ];
				single = single || edge !== 'all' || anchor !== 'none';
			}
		} );
		if ( ! single ) {
			return;
		}
		const uniform = `${ ME_PREFIX }${ end }-clip`;
		Object.entries( settings ).forEach( ( [ tier, [ a, e, n ] ] ) => {
			delete decls[ tier ][ uniform ];
			Object.entries( edges( def, a, e, n, report ) ).forEach( ( [ suffix, css ] ) => {
				decls[ tier ][ `${ uniform }-${ suffix }` ] = css;
			} );
		} );
	} );
}

/**
 * Rewrite an `open` entrance's close clip holder for a single edge (the twin of `Sgs_Motion_Clip_Edge::close`).
 *
 * The close amount closes the edge the entrance insets: the from-value's `clipEdge`, else the to-value's. When any tier
 * resolves to a single edge, every tier that sets a close amount or an entrance edge gets the four holders
 * `--sgs-me-close-to-clip-<t|r|b|l>` in place of the uniform one; a tier inherits the wider tier's amount and edges.
 *
 * @param {Object} base  The entrance base layer (`values`, `close`, `devices`).
 * @param {Object} decls Per-tier close declarations (mutated).
 */
export function applyCloseClipEdge( base, decls ) {
	const plain = ( v ) => ( v && typeof v === 'object' && ! Array.isArray( v ) ? v : {} );
	let amount = null;
	const ends = { from: 'all', to: 'all' };
	let single = false;
	const settings = {};
	TIERS.forEach( ( tier ) => {
		const source = tier === 'desktop' ? plain( base ) : plain( base?.devices?.[ tier ] );
		const values = tier === 'desktop' ? plain( base?.values ) : source;
		const close = plain( plain( source.close ).to );
		let set = false;
		if ( has( close, 'clip' ) && valueCss( 'EntranceCloseTo', 'clip', close.clip ) !== null ) {
			amount = close.clip;
			set = true;
		}
		[
			[ 'from', 'EntranceFrom' ],
			[ 'to', 'EntranceTo' ],
		].forEach( ( [ end, def ] ) => {
			const endValues = plain( values[ end ] );
			if ( has( endValues, 'clipEdge' ) && valueCss( def, 'clipEdge', endValues.clipEdge ) !== null ) {
				ends[ end ] = String( endValues.clipEdge );
				set = true;
			}
		} );
		const edge = ends.from !== 'all' ? ends.from : ends.to;
		if ( set && amount !== null ) {
			settings[ tier ] = [ amount, edge ];
			single = single || edge !== 'all';
		}
	} );
	if ( ! single ) {
		return;
	}
	const uniform = `${ ME_PREFIX }close-to-clip`;
	Object.entries( settings ).forEach( ( [ tier, [ a, e ] ] ) => {
		delete decls[ tier ][ uniform ];
		Object.entries( edges( 'EntranceCloseTo', a, e, 'none', () => {} ) ).forEach( ( [ suffix, css ] ) => {
			decls[ tier ][ `${ uniform }-${ suffix }` ] = css;
		} );
	} );
}
