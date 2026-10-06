// Ref tracing (GAP-CHECKLIST.md section 16). A config with `refPrefix` (e.g. 'cr-ref-') gets, on every style,
// hover and box row, the measured live element's nearest ancestor-or-self carrying a class with that prefix
// (`ref`) and the element's selector path from it (`path`), and every enclosing ref with its own path (`owners`). A tool that wrote the ref classes into a layout can
// then map each row back to one block and one rendered element of it.
import fs from 'fs';
import path from 'path';

// Extra properties measured when a config sets refPrefix: the spacing and width a layout setting writes, which
// the default list leaves to the box and position rows.
export const REF_PROPS = [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'width', 'max-width', 'text-wrap', 'gap', 'flex-direction', 'flex-wrap' ];

// In-page and in Node: the selector path from a ref element down to `el`. Each step is the element's BEM class (the
// first class starting with "sgs-" that is not a modifier and not a per-instance id such as sgs-text-aebb51cc, which
// changes on every build), or its tag name when it has none, plus
// :nth-of-type(n) only when a sibling shares that step. Steps are joined by " > "; the ref element itself is "".
// Self-contained (passed to page.evaluate as source).
export function elementPath( el, refEl ) {
	const step = ( e ) => {
		const bem = [ ...e.classList ].find( ( c ) => /^sgs-[a-z0-9-]+(__[a-z0-9-]+)?$/.test( c ) && ! c.includes( '--' ) && ! /-[0-9a-f]{8}$/.test( c ) );
		const base = bem ? `.${ bem }` : e.tagName.toLowerCase();
		const p = e.parentElement;
		if ( ! p ) {
			return base;
		}
		const same = [ ...p.children ].filter( ( s ) => ( bem ? s.classList.contains( bem ) : s.tagName === e.tagName ) );
		if ( same.length < 2 ) {
			return base;
		}
		const ofType = [ ...p.children ].filter( ( s ) => s.tagName === e.tagName );
		return `${ base }:nth-of-type(${ ofType.indexOf( e ) + 1 })`;
	};
	const steps = [];
	for ( let e = el; e && e !== refEl; e = e.parentElement ) {
		steps.unshift( step( e ) );
	}
	return steps.join( ' > ' );
}

// In-page: the ref, its block root class and the paths for one measured element. `carrier` is the element that
// paints the first text (collectPair reads text properties from it), so text rows get that element's path; `layoutEl`
// is the element laying out the children (collectPair reads layout properties from it), so layout rows get its path;
// `iconEl` is the pair's first painted svg, so icon size rows get its path.
export function traceRef( el, carrier, prefix, pathSrc, layoutEl = null, iconEl = null ) {
	// eslint-disable-next-line no-new-func
	const path = new Function( `return (${ pathSrc });` )();
	let refEl = null;
	let ref = null;
	for ( let a = el; a && a !== document.documentElement; a = a.parentElement ) {
		ref = [ ...a.classList ].find( ( c ) => c.startsWith( prefix ) );
		if ( ref ) {
			refEl = a;
			break;
		}
	}
	if ( ! refEl ) {
		return null;
	}
	const blockOf = ( r ) => [ ...r.classList ].find( ( c ) => /^sgs-[a-z0-9-]+$/.test( c ) && ! c.includes( '--' ) && ! c.startsWith( prefix ) && ! /-[0-9a-f]{8}$/.test( c ) ) || null;
	const tagOf = ( e ) => ( e ? e.tagName.toLowerCase() : null );
	const from = ( r, rRef ) => ( {
		ref: rRef,
		block: blockOf( r ),
		path: path( el, r ),
		textPath: carrier && r.contains( carrier ) ? path( carrier, r ) : null,
		layoutPath: layoutEl && r.contains( layoutEl ) ? path( layoutEl, r ) : null,
		iconPath: iconEl && r.contains( iconEl ) ? path( iconEl, r ) : null,
		tags: { path: tagOf( el ), textPath: tagOf( carrier ), layoutPath: tagOf( layoutEl ), iconPath: tagOf( iconEl ) },
	} );
	// The enclosing blocks, nearest first: a parent block's setting can paint an element of its child (a form's field
	// style on each field's control), so Solve can resolve a row against them when the nearest block has no setting.
	const owners = [];
	for ( let a = refEl.parentElement; a && a !== document.documentElement; a = a.parentElement ) {
		const r = [ ...a.classList ].find( ( c ) => c.startsWith( prefix ) );
		if ( r ) {
			owners.push( from( a, r ) );
		}
	}
	return { ...from( refEl, ref ), owners };
}

// The properties collectPair reads from the text carrier rather than the element.
export const TEXT_CARRIED = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ];

// The properties collectPair reads from the element laying out the children (paint.mjs::LAYOUT_PROPS).
export const LAYOUT_CARRIED = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];

// Node side: stamps ref, block and path on one pair's rows from the live snapshot's trace. Text properties (at rest and
// on hover: hoverStyles reads colour from the same carrier) take the text path; layout properties the layout path;
// an icon's size the icon's path.
// Enclosing blocks (trace.owners) are stamped as d.owners: [{ ref, block, path, tag }], nearest first, with the same
// path choice (tag: the measured element's tag).
const pathKey = ( d, t ) => {
	if ( d.pseudo ) {
		return 'path';
	}
	if ( [ 'style', 'hover', 'active' ].includes( d.kind ) && TEXT_CARRIED.includes( d.key ) && null != t.textPath ) {
		return 'textPath';
	}
	if ( 'style' === d.kind && LAYOUT_CARRIED.includes( d.key ) && null != t.layoutPath ) {
		return 'layoutPath';
	}
	if ( 'style' === d.kind && /^icon-(width|height|colour)$/.test( d.key ) && null != t.iconPath ) {
		return 'iconPath';
	}
	return 'path';
};
// A pseudo layer's row (d.pseudo) takes its element's path plus the pseudo: calibration keys the layer the same way.
const pathFor = ( d, t ) => ( null == t[ pathKey( d, t ) ] ? t[ pathKey( d, t ) ] : t[ pathKey( d, t ) ] + ( d.pseudo || '' ) );
// The row kinds that name a block and an element: the style rows, and the tag, active and lines rows (sections 20, 23 and
// 25) that say the same about one measured element. Hover and active rows read their text colour where the text paints.
const STAMPED = [ 'style', 'hover', 'box', 'tag', 'active', 'lines' ];
export function stampRefs( diffs, trace ) {
	if ( ! trace ) {
		return diffs;
	}
	for ( const d of diffs ) {
		if ( ! STAMPED.includes( d.kind ) ) {
			continue;
		}
		d.ref = trace.ref;
		d.block = trace.block;
		d.path = pathFor( d, trace );
		if ( trace.owners?.length ) {
			d.owners = trace.owners.map( ( o ) => ( { ref: o.ref, block: o.block, path: pathFor( d, o ), ...( o.tags ? { tag: o.tags[ pathKey( d, o ) ] } : {} ) } ) );
		}
	}
	return diffs;
}

// Unmatched refs (GAP-CHECKLIST.md section 21). qa/pairs/<surface>.json (written by scripts/computed-route/pairs.mjs; the
// walker cannot import from the route, so it reads the file) lists in `left` each block the pairing could not pair with a
// draft element, with its reason. Rows on such a block compare the live block against whatever the config's pair
// happened to resolve to, so most are false findings. A ref is dropped only when it is in `left` AND in neither
// `keptPairs[].ref` (a pair the walk really measures) nor `coveredByHand` (a hand pair measures it).
//
// DROP_REASONS is a positive list, and it must stay one. Two `left` reasons are deliberately NOT dropped:
// - "no painted words (an image, an icon or an empty wrapper)": images and icons were never doubtful pairings, they
//   have no words to pair by, so their rows are real measurements of a real element;
// - "its width is Npx on the draft against Npx live": the width difference is itself the finding, so dropping the row
//   would delete a real measurement.
// A reason not listed here is kept as well: widen this list only by naming the exact reason and why its rows are false.
export const DROP_REASONS = [
	/^no draft element holds its words/,
	/^only \d+% of its words matched/,
	/^its draft element at .+ does not hold the same words/,
	/^the draft element also holds \d+ word\(s\) that belong outside this block/,
	/^no matched words/,
	/^no draft control with its name, id, placeholder or label/,
];

// A ref without its prefix ("cr-ref-home-9" and "home-9" are one block).
const bareRef = ( r ) => String( r ).replace( /^[a-z]+-ref-/, '' );

// The pairing file for a config: `pairing: '<path>'` (relative to the config), else ../pairs/<name>.json beside it, <name>
// being the config's file name without its extension and without a trailing ".full". Null when none exists.
export function pairingPath( cfgPath, cfg ) {
	const dir = path.dirname( cfgPath );
	if ( cfg?.pairing ) {
		const p = path.resolve( dir, cfg.pairing );
		return fs.existsSync( p ) ? p : null;
	}
	const base = path.basename( cfgPath ).replace( /\.[^.]+$/, '' ).replace( /\.full$/, '' );
	const p = path.resolve( dir, '..', 'pairs', `${ base }.json` );
	return fs.existsSync( p ) ? p : null;
}

// Map of bare ref -> why for the refs to drop, from a parsed pairing report. Empty when the pairing is absent.
export function unmatchedRefs( pairing ) {
	const measured = new Set( [ ...( pairing?.keptPairs || [] ).map( ( k ) => k.ref ), ...( pairing?.coveredByHand || [] ) ].map( bareRef ) );
	const out = new Map();
	for ( const l of pairing?.left || [] ) {
		if ( l?.ref && ! measured.has( bareRef( l.ref ) ) && DROP_REASONS.some( ( re ) => re.test( l.why || '' ) ) ) {
			out.set( bareRef( l.ref ), l.why );
		}
	}
	return out;
}

// Reads and judges a config's pairing: the Map unmatchedRefs gives, empty without a pairing file.
export function loadUnmatched( cfgPath, cfg ) {
	const p = pairingPath( cfgPath, cfg );
	return p ? unmatchedRefs( JSON.parse( fs.readFileSync( p, 'utf8' ) ) ) : new Map();
}

// Removes the rows whose ref is in `unmatched` (a Map from loadUnmatched). Returns { diffs, unmatched }: the rows kept,
// and one { ref, why, count } entry per dropped ref, so nothing is dropped silently (appendUnmatchedReport lists them
// in report.md and report.json holds them as run.pairs[name].unmatched).
export function dropUnmatched( diffs, unmatched ) {
	if ( ! unmatched?.size ) {
		return { diffs, unmatched: [] };
	}
	const dropped = new Map();
	const kept = diffs.filter( ( d ) => {
		const why = d.ref ? unmatched.get( bareRef( d.ref ) ) : null;
		if ( ! why ) {
			return true;
		}
		const e = dropped.get( d.ref ) || { ref: d.ref, why, count: 0 };
		e.count++;
		dropped.set( d.ref, e );
		return false;
	} );
	return { diffs: kept, unmatched: [ ...dropped.values() ] };
}

// Appends the dropped rows of every run to report.md, so a reader sees what the pairing took out and why. Returns the row count.
export function appendUnmatchedReport( outDir, results ) {
	const entries = results.runs.flatMap( ( r ) => Object.entries( r.pairs ).flatMap( ( [ pair, p ] ) => ( p.unmatched || [] ).map( ( u ) => ( { r, pair, u } ) ) ) );
	if ( ! entries.length ) {
		return 0;
	}
	const total = entries.reduce( ( n, e ) => n + e.u.count, 0 );
	const rows = entries.map( ( { r, pair, u } ) => `| ${ r.state } @ ${ r.width } | ${ pair } | \`${ u.ref }\` | ${ u.count } | ${ u.why } |` );
	fs.appendFileSync( path.join( outDir, 'report.md' ), [ '', '## Rows dropped for unmatched blocks', '', `${ total } rows on blocks the pairing left unmatched (qa/pairs/<surface>.json \`left\`) are not in the counts above.`, '', '| run | pair | ref | rows | why the pairing left it |', '|---|---|---|---|---|', ...rows, '' ].join( '\n' ) );
	return total;
}
