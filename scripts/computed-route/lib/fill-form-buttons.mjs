// The words of a multi-step form's own buttons (Spec 48 FR-48-57). The skeleton absorbs the draft's Next and Back buttons
// into the form block (lib/skeleton-form-steps.mjs, rules.formSteps), which draws its own Previous, Next and Submit buttons;
// this reads the words the draft's buttons show so the form's buttons show them too:
//   - a button is the form's Next or Back by the same test the skeleton absorbs it by (lib/skeleton-form-step-parts.mjs::
//     navRole: its words or click handler), among the form component's buttons outside any loop (the fact record);
//   - its words are its template's own text, or the one text hole it prints (a hole the record reads as a string; a hole
//     holding an element, an icon, is no words). A hole is followed through the draft's logic (the object `renderVals`
//     returns, lib/intake-ast-eval.mjs); a value chosen by a test (`isReview ? 'Submit application' : 'Continue'`) shows
//     on the last step when the test compares a position with `<list>.length - 1` (`===`, `>=`, or the negation);
//   - the Next button's last-step words are the form's `submitLabel` and its other words its `nextLabel`; a Next button
//     with one set of words gives `nextLabel` only, and the Back button's words are `prevLabel`.
// A button whose words cannot be read (static text beside a hole, a hole the logic does not resolve, a test it cannot
// place) writes nothing and is a note; a button with no words writes nothing.
import fs from 'node:fs';
import { propName } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, oneString } from './intake-ast-eval.mjs';
import { rootData } from './fill-list-items.mjs';
import { navRole } from './skeleton-form-step-parts.mjs';
import { DECISIONS_FILE } from './skeleton-facts.mjs';

const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const HOLE = /\{\{[^}]*\}\}/g;

// The standing rules the skeleton absorbs the buttons by: data/skeleton-decisions.json `rules.formSteps`.
export const stepRules = () => JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ).rules?.formSteps ?? {};

// Whether a test holds on the last step: true, false, or null when it is not a comparison with `<list>.length - 1`.
const lastIndex = ( n ) => 'BinaryExpression' === n?.type && '-' === n.operator && 'length' === propName( n.left ) && 'NumericLiteral' === n.right?.type && 1 === n.right.value;
const ON_RIGHT = { '===': true, '==': true, '>=': true, '!==': false, '!=': false, '<': false };
const ON_LEFT = { '===': true, '==': true, '<=': true, '!==': false, '!=': false, '>': false };
export function trueOnLast( idx, node, env = new Map(), depth = 0 ) {
	if ( ! node || depth > 8 ) {
		return null;
	}
	if ( 'UnaryExpression' === node.type && '!' === node.operator ) {
		const v = trueOnLast( idx, node.argument, env, depth + 1 );
		return null === v ? null : ! v;
	}
	if ( 'BinaryExpression' === node.type ) {
		return ( lastIndex( node.right ) ? ON_RIGHT[ node.operator ] : lastIndex( node.left ) ? ON_LEFT[ node.operator ] : null ) ?? null;
	}
	const seen = new Set( resolveRefs( idx, ref( node, env ) ).filter( ( t ) => t.node && t.node !== node ).map( ( t ) => trueOnLast( idx, t.node, t.env, depth + 1 ) ) );
	return 1 === seen.size ? [ ...seen ][ 0 ] : null;
}

// The words one hole path can show: { plain } (one value), { rest, last } (a value for the last step and one for the
// others) or { reason }.
export function holeWords( idx, path ) {
	const refs = String( path ).split( '.' ).reduce( ( acc, k ) => propRefs( idx, acc, k ), rootData( idx ) );
	const read = refs.map( ( r ) => {
		const value = oneString( idx, r.node, r.env );
		let last = true;
		for ( let n = r.node, p = idx.parent.get( n ); 'ConditionalExpression' === p?.type && p.test !== n; n = p, p = idx.parent.get( p ) ) {
			const on = trueOnLast( idx, p.test, r.env );
			last = null === on || null === last ? null : last && on === ( p.consequent === n );
		}
		return { value, last, chosen: 'ConditionalExpression' === idx.parent.get( r.node )?.type };
	} );
	if ( ! read.length || read.some( ( v ) => null === v.value ) ) {
		return { reason: `the draft's logic gives no readable words for \`${ path }\`` };
	}
	const values = [ ...new Set( read.map( ( v ) => v.value ) ) ];
	if ( 1 === values.length && ! read.some( ( v ) => v.chosen ) ) {
		return { plain: values[ 0 ] };
	}
	if ( read.some( ( v ) => null === v.last ) ) {
		return { reason: `the draft's logic chooses \`${ path }\` (${ values.join( ' / ' ) }) by a test that names no step` };
	}
	const last = [ ...new Set( read.filter( ( v ) => v.last ).map( ( v ) => v.value ) ) ];
	const rest = [ ...new Set( read.filter( ( v ) => ! v.last ).map( ( v ) => v.value ) ) ];
	return 1 === last.length && 1 === rest.length ? { rest: rest[ 0 ], last: last[ 0 ] } : { reason: `the draft's logic gives \`${ path }\` ${ values.length } values (${ values.join( ' / ' ) })` };
}

// The words one button shows: { plain } | { rest, last } | { reason } | null (no words). t: its template; holes: the
// record's per-width values of its holes (the fact element's `logic.holes`).
export function buttonWords( t, holes = {}, idx = null ) {
	const text = ( t.holes || [] ).filter( ( h ) => 'text' === h.where );
	const kinds = ( h ) => Object.values( holes[ h.id ] || {} ).flatMap( ( w ) => ( w?.v || [] ).map( ( v ) => v.t ) );
	const plain = squash( String( t.words ?? '' ).replace( HOLE, ' ' ) );
	if ( text.some( ( h ) => ! kinds( h ).length ) ) {
		return { reason: 'a text hole of the button has no reading in the fact record' };
	}
	const said = text.filter( ( h ) => kinds( h ).includes( 'string' ) );
	if ( ! said.length ) {
		return plain ? { plain } : null;
	}
	if ( said.length > 1 || plain ) {
		return { reason: `the button's words join ${ said.length > 1 ? 'several text holes' : 'its own text and a text hole' }` };
	}
	return idx ? holeWords( idx, said[ 0 ].path ) : { reason: 'the draft\'s logic is not read (no draft folder)' };
}

// The form's button labels from the draft: { labels: { nextLabel?, submitLabel?, prevLabel? }, notes }. facts: the fact
// record; component: the form's component (its schema's); idx: that component's parsed logic; rules: rules.formSteps.
export function stepButtonLabels( { facts, component, idx = null, rules = stepRules() } ) {
	const out = { labels: {}, notes: [] };
	const found = { next: [], back: [] };
	for ( const e of Object.values( facts?.elements || {} ) ) {
		const t = e.template;
		if ( ! t || ! String( t.key ).startsWith( `${ component }/` ) || 'button' !== ( t.realTag || t.tag ) || t.inFor || t.membership?.scFor?.length ) {
			continue;
		}
		const handlers = Object.entries( t.attrs || {} ).filter( ( [ a ] ) => /^on[A-Z]/.test( a ) ).map( ( [ , v ] ) => String( v ).replace( /^\s*\{\{\s*|\s*\}\}\s*$/g, '' ) );
		const role = navRole( squash( String( t.words ?? '' ).replace( HOLE, ' ' ) ), handlers, rules );
		role && found[ role ].push( { key: t.key, words: buttonWords( t, e.logic?.holes, idx ) } );
	}
	const one = ( role ) => {
		const read = found[ role ].filter( ( b ) => b.words );
		read.filter( ( b ) => b.words.reason ).forEach( ( b ) => out.notes.push( `the draft's ${ role } button ${ b.key }: ${ b.words.reason }, so the form keeps its own words` ) );
		const ok = [ ...new Set( read.filter( ( b ) => ! b.words.reason ).map( ( b ) => JSON.stringify( b.words ) ) ) ];
		ok.length > 1 && out.notes.push( `the draft's ${ role } buttons show different words (${ ok.join( ', ' ) }), so the form keeps its own` );
		return 1 === ok.length && read.every( ( b ) => ! b.words.reason ) ? JSON.parse( ok[ 0 ] ) : null;
	};
	const next = one( 'next' );
	if ( next ) {
		out.labels.nextLabel = next.plain ?? next.rest;
		next.last && ( out.labels.submitLabel = next.last );
	}
	const back = one( 'back' );
	if ( back?.plain ) {
		out.labels.prevLabel = back.plain;
	} else if ( back ) {
		out.notes.push( 'the draft\'s back button changes its words by step, and the form\'s Previous button holds one label, so the form keeps its own' );
	}
	return out;
}

// The writes for a multi-step form node: each label the draft gives that differs from what the node reads as now (its value,
// else the block's default). def( attr ): the attribute's definition ({ default }) or null when the block holds none, which
// is a named UNMAPPED row. Returns { writes, unmapped, notes }.
export function stepButtonWrites( { labels, notes = [], attributes = {}, def } ) {
	const out = { writes: [], unmapped: [], notes: [ ...notes ] };
	for ( const [ attr, value ] of Object.entries( labels ) ) {
		const d = def( attr );
		if ( ! d ) {
			out.unmapped.push( { property: attr, value: JSON.stringify( value ), slot: '', reason: `sgs/form holds no setting for the words of its ${ attr.replace( /Label$/, '' ) } button` } );
		} else if ( value !== ( undefined === attributes[ attr ] ? d.default : attributes[ attr ] ) ) {
			out.writes.push( { attr, value, merge: 'replace' } );
		}
	}
	return out;
}
