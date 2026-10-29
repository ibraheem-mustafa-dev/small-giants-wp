// The name a catalogue attribute shows shoppers (Spec 48 FR-48-92), read from what the draft shows for the choice, never
// made up from its state key (R-47-4):
//   - the code's own label for the choice (lib/catalogue-facets.mjs::groupLabel: an element of an array literal naming the
//     choice's key with a `label`, `title`, `name` or `heading`);
//   - else the heading the draft's template shows for the choice's option loop, read from the fact record
//     (build/intake/facts.json, lib/fact-record.mjs): the loop (`<sc-for>`) whose list is the render value the choice's
//     options are kept under (`flavs`), on the product page first and then in each choice flow's component; going up from
//     the loop, the nearest earlier sibling holding words gives its first plain text ("3 · Flavours"), less the step number
//     the choice flow's own rule strips (data/skeleton-decisions.json rules.choiceFlow.stepNumber).
// A choice the draft names nowhere keeps the name its key gives, and the reader says so.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { groupLabel } from './catalogue-facets.mjs';

const BOUND = /\{\{/;
const HOPS = 4;
const here = path.dirname( fileURLToPath( import.meta.url ) );

// The step-number rule of the choice flow (the same one its question headings are stripped by), as a RegExp.
export function stepNumberRule() {
	const decisions = JSON.parse( fs.readFileSync( path.join( here, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) );
	const pattern = decisions.rules?.choiceFlow?.stepNumber?.patterns?.[ 0 ];
	return pattern ? new RegExp( pattern ) : null;
}

// The heading the template shows for the option loop drawing `binding`, in the first of `components` that draws one, or
// null. record: the fact record (its `elements`); strip: the step-number RegExp.
export function loopHeading( record, components, binding, strip = null ) {
	const els = record?.elements || {};
	const tpl = ( k ) => els[ k ]?.template;
	const kids = new Map();
	for ( const [ k, v ] of Object.entries( els ) ) {
		const p = v.template?.parent;
		p && ( kids.get( p ) ?? kids.set( p, [] ).get( p ) ).push( k );
	}
	const kidsOf = ( k ) => ( kids.get( k ) || [] ).slice().sort( ( a, b ) => Number( tpl( a ).n ) - Number( tpl( b ).n ) );
	const plain = ( k ) => {
		const w = String( tpl( k )?.words ?? '' ).replace( /\s+/g, ' ' ).trim();
		return w && ! BOUND.test( w ) ? w : '';
	};
	const firstText = ( k ) => [ k, ...kidsOf( k ).flatMap( function all( c ) {
		return [ c, ...kidsOf( c ).flatMap( all ) ];
	} ) ].map( plain ).find( Boolean ) || '';
	for ( const component of components.filter( Boolean ) ) {
		const loop = Object.keys( els ).find( ( k ) => tpl( k ).component === component && 'sc-for' === tpl( k ).realTag && ( tpl( k ).holes || [] ).some( ( h ) => 'attr:list' === h.where && h.path === binding ) );
		for ( let c = loop, hop = 0; c && tpl( c )?.parent && hop < HOPS; c = tpl( c ).parent, hop++ ) {
			const before = kidsOf( tpl( c ).parent ).filter( ( k ) => Number( tpl( k ).n ) < Number( tpl( c ).n ) );
			const text = before.map( firstText ).filter( Boolean ).pop();
			if ( text ) {
				const name = strip ? text.replace( strip, '' ).trim() : text;
				return name || null;
			}
		}
	}
	return null;
}

// The label of one choice: { label, from: 'code' | 'template' | 'key' }. ctx: the catalogue sources; record: the fact record
// or null; components: the product page's component, then each choice flow's; fallback: the name the key gives.
export function choiceLabel( { ctx, record, components, choice, fallback, strip } ) {
	const code = groupLabel( ctx, choice.key );
	if ( code ) {
		return { label: code, from: 'code' };
	}
	const shown = choice.name ? loopHeading( record, components, choice.name, strip ) : null;
	return shown ? { label: shown, from: 'template' } : { label: fallback, from: 'key' };
}
