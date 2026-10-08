// Two readings of Solve's surviving rows, built from the rows and never replacing them (the per-width tables stay).
// An ISSUE is one element, property and state, listing every width it differs at with that width's own draft and live
// values, and the widths where it matches. A CAUSE is the issues that share a class, a property and either the rule that
// wins on the page or the same draft-to-live values; it lists each of its elements with its widths. No row is dropped
// or merged: every width and every value of every row appears in its issue.
import { widthPattern } from './solve-rows.mjs';

const CLASSES = [ 'hardcode', 'missing', 'unresolved' ];
const KINDS = [ 'style', 'hover' ];
const num = ( a, b ) => a - b;

// The issue lines of one report: classes is Solve's classify() output, report the final walk.
export function issueGroups( report, classes ) {
	const byKey = new Map();
	for ( const cls of CLASSES ) {
		for ( const r of classes[ cls ] || [] ) {
			if ( ! KINDS.includes( r.kind ) ) {
				continue;
			}
			const k = [ cls, r.pair, r.ref ?? '', r.path ?? '', r.key, r.state ?? '', r.kind ].join( '|' );
			if ( ! byKey.has( k ) ) {
				byKey.set( k, { class: cls, pair: r.pair, ref: r.ref ?? null, path: r.path ?? '', key: r.key, kind: r.kind, state: r.state ?? null, rows: [], reasons: [], held: r.held || null, winningRule: r.winningRule || null } );
			}
			const g = byKey.get( k );
			g.rows.push( { width: r.width, draft: r.draft, live: r.live } );
			if ( r.reason && ! g.reasons.includes( r.reason ) ) {
				g.reasons.push( r.reason );
			}
			g.held ||= r.held || null;
			g.winningRule ||= r.winningRule || null;
		}
	}
	return [ ...byKey.values() ].map( ( g ) => {
		const widths = widthPattern( report, { kind: g.kind, key: g.key, ref: g.ref, path: g.path, state: g.state } );
		return { ...g, rows: g.rows.sort( ( a, b ) => a.width - b.width ), fails: g.rows.map( ( x ) => x.width ).sort( num ), matches: widths.matches };
	} );
}

// The widths of one issue, grouped by the draft and live values they share: "1440, 1920: 40px to 0px; 375: 10px to 32px".
export function valueText( issue ) {
	const by = new Map();
	for ( const x of issue.rows ) {
		const v = `${ x.draft } to ${ x.live }`;
		by.set( v, [ ...( by.get( v ) || [] ), x.width ] );
	}
	return [ ...by.entries() ].map( ( [ v, w ] ) => `${ [ ...new Set( w ) ].sort( num ).join( ', ' ) }: ${ v }` ).join( '; ' );
}

// The cause of an issue: its class and property, then the winning rule's selector and source when one was read, else
// the draft-to-live values it shows (widths left out so the same cause at other widths joins).
const causeOf = ( i ) => {
	const rule = i.winningRule && /^winning rule `([^`]+)`.*? in ([^ ]+)/.exec( i.winningRule );
	const values = [ ...new Set( i.rows.map( ( x ) => `${ x.draft } to ${ x.live }` ) ) ].sort().join( ' / ' );
	return { class: i.class, key: i.key, label: rule ? `rule ${ rule[ 1 ] } in ${ rule[ 2 ] }` : values };
};

// The cause groups, largest first: { class, key, label, issues: [issue] }.
export function causeGroups( issues ) {
	const by = new Map();
	for ( const i of issues ) {
		const c = causeOf( i );
		const k = JSON.stringify( [ c.class, c.key, c.label ] );
		by.has( k ) || by.set( k, { ...c, issues: [] } );
		by.get( k ).issues.push( i );
	}
	return [ ...by.values() ].sort( ( a, b ) => b.issues.length - a.issues.length || a.key.localeCompare( b.key ) );
}

const cell = ( v, n = 400 ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, n );
const where = ( i ) => `${ i.ref || '(no node)' }${ i.path ? ` \`${ i.path }\`` : '' }`;

// Markdown for both views: one line per issue, then the causes with each element and its widths.
export function groupsMarkdown( issues, causes ) {
	const L = [ '## Issues (one line per element, property and state)', '',
		'Every width an issue differs at is named with its own draft and live values; the widths where it matches follow. The per-width tables below hold the same rows unchanged.', '' ];
	if ( ! issues.length ) {
		L.push( 'None.', '' );
	} else {
		L.push( '| Class | Element | Property | State | Differs at (draft to live) | Matches at |', '|---|---|---|---|---|---|' );
		issues.forEach( ( i ) => L.push( `| ${ i.class } | ${ cell( where( i ) ) } | ${ i.key } | ${ i.state ?? '' } | ${ cell( valueText( i ) ) } | ${ i.matches.join( ', ' ) || 'none' } |` ) );
		L.push( '' );
	}
	L.push( '## Causes (issues sharing a class, a property, and the winning rule or the same values)', '' );
	if ( ! causes.length ) {
		L.push( 'None.', '' );
	}
	for ( const c of causes ) {
		L.push( `### ${ c.class }: ${ c.key }, ${ cell( c.label, 300 ) } (${ c.issues.length } issue${ 1 === c.issues.length ? '' : 's' })`, '' );
		c.issues.forEach( ( i ) => L.push( `- ${ where( i ) }${ i.state ? ` [${ i.state }]` : '' }: differs at ${ i.fails.join( ', ' ) }${ i.matches.length ? `; matches at ${ i.matches.join( ', ' ) }` : '' }` ) );
		L.push( '' );
	}
	return L;
}
