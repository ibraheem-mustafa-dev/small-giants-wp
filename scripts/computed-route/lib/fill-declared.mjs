// Declared values for Fill (Spec 48 FR-48-8, code first): what the draft's code sets on each target, beyond Fill's own
// property list. readDraft reads every author-declared longhand from Chrome's matched styles
// (scripts/parity/lib/devtools.mjs::declaredValues with every name); this module picks the ones Fill must also judge
// (`extraProps`) and reads their rendered values in the page (`readExtras`), so a property the draft authors is read
// from its code and confirmed by its render, never dropped because it is not on the list.

import { createRequire } from 'module';

// mdn-data's property list: a shorthand's `computed` is the list of longhands it sets.
const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );
export const isShorthand = ( p ) => Array.isArray( MDN[ p ]?.computed ) && MDN[ p ].computed.some( ( l ) => l !== p );

// A CSS-wide keyword states the property's default (an implied longhand of a shorthand reads `initial`): nothing to
// write unless the block overrides it, which the block's calibrated default shows.
export const CSS_WIDE = /^(?:initial|inherit|unset|revert|revert-layer)$/i;
// Motion timings belong to the motion writer (lib/fill-motion.mjs), which reads them from the animation inventory.
const MOTION = /^(?:transition|animation)(?:-|$)/;

// The properties whose rendered value is a used value (CSSOM's resolved value: the laid-out size or offset), so a
// rendered pixel figure is never the draft's intent: they are written only from a declared value the code states.
// `width` keeps its own rule (lib/fill-resolve.mjs, usedValueTarget) and the column tracks theirs (the computed tracks
// read as ratios, lib/normalise.mjs::tracksSetting).
export const USED_VALUE = [ 'height', 'top', 'right', 'bottom', 'left', 'grid-template-rows' ];

// The declared properties of one target that Fill does not read already: { prop: declared } (motion timings, CSS-wide
// keywords and shorthands left out: a shorthand is read through its longhands, and one written with var() reaches
// Chrome without them). `read` is Fill's own list (lib/fill-read.mjs::PROPS).
export function extraProps( declared, read ) {
	return Object.fromEntries( Object.entries( declared || {} ).filter( ( [ p, v ] ) => ! read.includes( p ) && ! MOTION.test( p ) && ! isShorthand( p ) && ! CSS_WIDE.test( String( v ).trim() ) ) );
}

// The extra properties a target's code declares at some read width but whose rendered value is not read at another:
// { id: { width: [prop] } }. result: lib/fill-read.mjs::readDraft's result so far; read: Fill's own list.
export function missingExtras( result, read, widths ) {
	const out = {};
	const union = {};
	for ( const w of widths ) {
		for ( const [ id, declared ] of Object.entries( result.declared?.[ w ] || {} ) ) {
			Object.keys( extraProps( declared, read ) ).forEach( ( p ) => ( union[ id ] ??= new Set() ).add( p ) );
		}
	}
	for ( const [ id, props ] of Object.entries( union ) ) {
		for ( const w of widths ) {
			const snap = result.widths?.[ w ]?.[ id ];
			const lack = snap && ! snap.missing ? [ ...props ].filter( ( p ) => undefined === snap.styles?.[ p ] ) : [];
			if ( lack.length ) {
				( out[ id ] ??= {} )[ w ] = lack;
			}
		}
	}
	return out;
}

// In-page: the rendered value of each extra property of each job's element: { id: { prop: value } }.
function computedOf( [ list, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const out = {};
	for ( const { id, finder, props } of list ) {
		const el = resolve( finder );
		if ( el ) {
			const cs = getComputedStyle( el );
			out[ id ] = Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
		}
	}
	return out;
}

// The rendered values of every target's extra properties at the page's current width. jobs: [{ id, finder }];
// extras: { id: { prop: declared } }. Returns { id: { prop: rendered } }.
export async function readExtras( page, jobs, extras, resolveSrc ) {
	const list = jobs.filter( ( j ) => Object.keys( extras[ j.id ] || {} ).length ).map( ( j ) => ( { id: j.id, finder: j.finder, props: Object.keys( extras[ j.id ] ) } ) );
	return list.length ? page.evaluate( computedOf, [ list, resolveSrc ] ) : {};
}

// The draft value Fill judges for a used-value property: the declared value where the code states a plain length or
// percentage, never the rendered pixels; null when the code states none at that width (a keyword, a calc, a variable).
export function usedValueDraft( declared ) {
	const v = String( declared ?? '' ).trim();
	return /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%|rem|em|vh|vw)$/.test( v ) || '0' === v ? v : null;
}

// A used-value property's draft per width: { draft, notPlain }. `draft` keeps the widths whose code states a plain
// value; `notPlain` lists the widths whose code states another form (a keyword such as auto, a track list, calc()), so
// the caller names them rather than writing pixels or dropping them unseen. A width the code states nothing at keeps the
// block's default. declaredAt(width) → the declared value there.
export function usedValueDrafts( draft, declaredAt ) {
	const out = { draft: {}, notPlain: [] };
	for ( const w of Object.keys( draft ) ) {
		const declared = declaredAt( w );
		const plain = usedValueDraft( declared );
		if ( null !== plain ) {
			out.draft[ w ] = plain;
		} else if ( null != declared && ! CSS_WIDE.test( String( declared ).trim() ) && 'auto' !== String( declared ).trim() ) {
			out.notPlain.push( { width: Number( w ), declared } );
		}
	}
	return out;
}
