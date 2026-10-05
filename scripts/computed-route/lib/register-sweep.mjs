// Register <-> sweep (A4): gives every fix-register item exactly one sweep status.
// registerItems reads the register's tables into items { ids, section, cells, covers, line, header }. groupItems puts them in the
// eight A4 groups by section name (a section in no group is returned in `ungrouped`, never dropped). checkStatuses judges
// the agents' verdicts [{ id, status, evidence }] against the sweep file: one verdict per item, one of five statuses, and a
// clean claim must cite a report the sweep holds and a ref no sweep row touches (a site-wide item is clean only when every
// surface its Covers items sit on is measured and has no open row). addSweepColumn writes a Sweep column into register
// text, leaving every existing cell byte-identical. bundleGroup assembles one agent's input.
import { registerIds } from '../lint.mjs';

export const STATUSES = [ 'still open', 'clean on the walker', 'not walker-measurable', 'closed earlier', 'partly measured' ];

export const STATUS_RULES = [
	'- still open: a sweep.json row on the item\'s surface touches the element and property the item names. The verdict cites that one row exactly (report, ref or pair, path, property), quotes one of its draft and live values, and says in evidence.element why that element is the one the item names. A row on a wrapper that merely contains the item\'s element does not count.',
	'- clean on the walker: a paired ref covers the item\'s element and no row touches it; evidence.element says why that ref holds the item\'s element. A site-wide item (S1 to S12) is clean only when every surface in its Covers column is clean; one unmeasured surface makes it partly measured.',
	'- not walker-measurable: the item is behaviour, entrance or load motion (the walker compares animation timings only where both sides use CSS keyframes; SGS entrances are script-driven), keyboard, focus, a11y, content or Site Info. Hover is walker-measurable: the walker forces :hover on every pair, so a hover item is still open or clean. The main thread checks 10% of these (at least 5), plus every item marked clean or closed earlier without a cited report path.',
	'- closed earlier: the register already records it closed with evidence, and the sweep agrees. If the sweep disagrees, it is still open (a regression), flagged in the handoff.',
	'- partly measured: only some of the surfaces the item touches have a sweep report.'
].join( '\n' );

export const GROUPS = [
	{ name: 'Header + megas + drawers', sections: [ 'Header', 'Mega menus', 'Phone drawer', 'Bag drawer' ] },
	{ name: 'Footer + floating WhatsApp', sections: [ 'Footer', 'Floating WhatsApp button' ] },
	{ name: 'Home', sections: [ 'Home' ] },
	{ name: 'Shop + product + lens pop-up', sections: [ 'Shop', 'Product page', 'Lens pop-up' ] },
	{ name: 'Lenses + About + Help + Contact', sections: [ 'Lenses page', 'About', 'Help', 'Contact' ] },
	{ name: 'Checkout + confirmation + content', sections: [ 'Checkout', 'Confirmation', 'Content not tied to one screen' ] },
	{ name: 'Site-wide S1 to S12', sections: [ 'Site-wide fixes (one change, many items)' ] },
	{ name: 'Route findings CR1 to CR21', sections: [ 'Computed route findings (Spec 47 stage 3)' ] }
];

export const SITE_WIDE = 'Site-wide fixes (one change, many items)';

// Sweep surfaces each section is measured by. An empty list means no surface covers it (always unmeasured).
export const SECTION_SURFACES = {
	'Header': [ 'header' ],
	'Mega menus': [ 'mega-sunglasses', 'mega-brands', 'mega-lenses', 'mega-help' ],
	'Phone drawer': [ 'mobile-menu' ],
	'Bag drawer': [],
	'Footer': [ 'footer' ],
	'Floating WhatsApp button': [],
	'Home': [ 'home' ],
	'Shop': [ 'shop' ],
	'Product page': [ 'product' ],
	'Lens pop-up': [ 'lens', 'size-guide' ],
	'Lenses page': [ 'lenses' ],
	'About': [ 'about' ],
	'Help': [ 'help' ],
	'Contact': [ 'contact', 'contact-form' ],
	'Checkout': [],
	'Confirmation': [],
	'Content not tied to one screen': []
};

const splitCells = ( line ) => line.replace( /^\s*\|/, '' ).replace( /\|\s*$/, '' ).split( /(?<!\\)\|/ ).map( ( c ) => c.trim() );
const ID_TOKEN = /(?<![A-Za-z0-9])[A-Z]{0,3}\d+[A-Za-z]{0,2}(?![A-Za-z0-9])/g;

// Every table item: the rows whose first cell holds ids. `covers` is the ids a site-wide row's Covers cell names (the text
// before any ";" or "(" so prose and dates are not read as ids); `line` is the row's line index; `header` its table's header line index.
export function registerItems( markdown ) {
	const lines = markdown.split( /\r?\n/ );
	const items = [];
	let section = '';
	let header = -1;
	let coversAt = -1;
	lines.forEach( ( line, i ) => {
		const h = line.match( /^## (.+?)\s*$/ );
		if ( h ) {
			section = h[ 1 ];
		}
		if ( ! /^\s*\|/.test( line ) ) {
			header = -1;
			return;
		}
		if ( -1 === header ) {
			header = i;
			coversAt = splitCells( line ).findIndex( ( c ) => 'Covers' === c );
			return;
		}
		const ids = [ ...registerIds( line ) ];
		if ( ! ids.length ) {
			return;
		}
		const cells = splitCells( line );
		const covers = -1 === coversAt || ! cells[ coversAt ] ? [] : ( cells[ coversAt ].split( /[;(]/ )[ 0 ].match( ID_TOKEN ) || [] );
		items.push( { ids, section, cells, covers, line: i, header } );
	} );
	return items;
}

export const itemKey = ( item ) => item.ids.join( ', ' );

// → { groups: [{ name, items }], ungrouped: items } in the A4 group order.
export function groupItems( items ) {
	const groups = GROUPS.map( ( g ) => ( { name: g.name, items: items.filter( ( x ) => g.sections.includes( x.section ) ) } ) );
	return { groups, ungrouped: items.filter( ( x ) => ! GROUPS.some( ( g ) => g.sections.includes( x.section ) ) ) };
}

// The surfaces an item is measured by: its section's, or for a site-wide item the union over the sections of the items it covers.
// `null` marks a section with no surface, which counts as unmeasured.
export function itemSurfaces( item, items ) {
	const sectionsOf = ( x ) => ( SITE_WIDE === x.section ? [] : [ x.section ] );
	const sections = SITE_WIDE === item.section
		? item.covers.flatMap( ( id ) => items.filter( ( x ) => x.ids.includes( id ) ).flatMap( sectionsOf ) )
		: [ item.section ];
	return [ ...new Set( sections.flatMap( ( s ) => ( SECTION_SURFACES[ s ]?.length ? SECTION_SURFACES[ s ] : [ null ] ) ) ) ];
}

const norm = ( id ) => String( id ).replace( /\s+/g, ' ' ).trim();

// The verdicts that answer an item: one whose id is the item's full key, or one of its ids when no other item holds that id.
export function verdictsFor( item, items, verdicts ) {
	const key = itemKey( item );
	return verdicts.filter( ( v ) => key === norm( v.id ) || ( item.ids.includes( norm( v.id ) ) && 1 === items.filter( ( x ) => x.ids.includes( norm( v.id ) ) ).length && ! items.some( ( x ) => itemKey( x ) === norm( v.id ) ) ) );
}

// The refs one surface's pairing measured (qa/pairs/<surface>.json: its generated pairs and the blocks a hand pair covers).
export const measuredRefs = ( pairing ) => [ ...new Set( [ ...( pairing?.keptPairs || [] ).map( ( p ) => p.ref ), ...( pairing?.coveredByHand || [] ) ] ) ];

const sweepReports = ( sweep ) => new Set( Object.values( sweep.surfaces || {} ).map( ( s ) => s.report ) );
const same = ( a, b ) => JSON.stringify( a ?? null ) === JSON.stringify( b ?? null );
const quotes = ( values, e ) => ( values || [] ).some( ( v ) => same( v.draft, e.draft ) && same( v.live, e.live ) );
// The sentence tying the item's words to the cited element (a verdict without it is a guess).
const ELEMENT_MIN = 20;

// A still-open verdict's row: one sweep row matched exactly (report, ref or pair, path, property) whose values it quotes, or
// an open diff of a walk report (evidence.walk: the walk's folder, with pair, property, draft and live). -> problem or null.
function openRowProblem( key, e, rows, reports, walks ) {
	if ( ! e.element || String( e.element ).length < ELEMENT_MIN ) {
		return `${ key }: still open needs evidence.element, one sentence tying the item's words to the cited element`;
	}
	if ( e.walk ) {
		const rep = walks?.[ e.walk ];
		if ( ! rep ) {
			return `${ key }: still open cites walk ${ e.walk }, whose report.json was not given`;
		}
		const hit = ( rep.runs || [] ).some( ( run ) => ( run.pairs?.[ e.pair ]?.diffs || [] ).some( ( d ) => 'accepted' !== d.status && d.key === e.property && same( d.draft, e.draft ) && same( d.live, e.live ) ) );
		return hit ? null : `${ key }: still open cites ${ e.pair } ${ e.property } ${ JSON.stringify( e.draft ) } -> ${ JSON.stringify( e.live ) }, which is no open diff of walk ${ e.walk }`;
	}
	if ( ! reports.has( e.report ) ) {
		return `${ key }: still open cites report ${ e.report }, which sweep.json does not hold`;
	}
	const hit = rows.find( ( r ) => r.report === e.report && r.property === e.property && ( r.path ?? '' ) === ( e.path ?? '' ) && ( r.ref ? r.ref === e.ref : !! e.pair && r.pair === e.pair ) );
	if ( ! hit ) {
		return `${ key }: still open cites ${ e.ref || e.pair } path "${ e.path ?? '' }" ${ e.property }, which is no row of ${ e.report }`;
	}
	return quotes( hit.values, e ) ? null : `${ key }: still open quotes ${ JSON.stringify( e.draft ) } -> ${ JSON.stringify( e.live ) }; the row reads ${ ( hit.values || [] ).map( ( v ) => `${ JSON.stringify( v.draft ) } -> ${ JSON.stringify( v.live ) }` ).join( ', ' ) }`;
}

// → problems (strings). Verdicts are [{ id, status, evidence }]; the item an id belongs to is the one holding it.
// measured ({ surface: [refs] }, optional): a clean claim must cite a ref the item's surfaces measured.
// walks ({ folder: report.json }, optional): the walk reports still-open verdicts cite by evidence.walk.
export function checkStatuses( items, verdicts, sweep, measured = null, walks = {} ) {
	const problems = [];
	const reports = sweepReports( sweep );
	const rows = sweep.rows || [];
	const unmeasured = new Set( sweep.unmeasured || [] );
	const known = new Set( items.flatMap( ( x ) => x.ids ) );
	for ( const v of verdicts ) {
		if ( ! known.has( norm( v.id ) ) && ! items.some( ( x ) => itemKey( x ) === norm( v.id ) ) ) {
			problems.push( `verdict for unknown id ${ v.id }` );
		}
	}
	for ( const item of items ) {
		const key = itemKey( item );
		const mine = verdictsFor( item, items, verdicts );
		if ( 1 !== mine.length ) {
			problems.push( `${ key }: ${ mine.length } verdicts (need exactly one)` );
			continue;
		}
		const { status, evidence } = mine[ 0 ];
		if ( ! STATUSES.includes( status ) ) {
			problems.push( `${ key }: status "${ status }" is not one of ${ STATUSES.join( ', ' ) }` );
			continue;
		}
		if ( ! evidence || ! ( evidence.reason || evidence.report || evidence.ref || evidence.walk ) ) {
			problems.push( `${ key }: no evidence` );
			continue;
		}
		if ( 'still open' === status ) {
			const p = openRowProblem( key, evidence, rows, reports, walks );
			p && problems.push( p );
			continue;
		}
		if ( 'not walker-measurable' === status && /\bhover/i.test( evidence.reason || '' ) ) {
			problems.push( `${ key }: not walker-measurable gives hover as the reason, but the walker measures hover (forced :hover on every pair)` );
			continue;
		}
		if ( 'clean on the walker' !== status ) {
			continue;
		}
		if ( ! evidence.element || String( evidence.element ).length < ELEMENT_MIN ) {
			problems.push( `${ key }: clean needs evidence.element, one sentence saying why the ref holds the item's element` );
		}
		if ( ! evidence.ref || ! evidence.report ) {
			problems.push( `${ key }: clean needs evidence.report and evidence.ref` );
		} else if ( ! reports.has( evidence.report ) ) {
			problems.push( `${ key }: clean cites report ${ evidence.report }, which sweep.json does not hold` );
		}
		const surfaceRefs = measured ? itemSurfaces( item, items ).flatMap( ( s ) => measured[ s ] || [] ) : null;
		if ( surfaceRefs && evidence.ref && SITE_WIDE !== item.section && ! surfaceRefs.includes( evidence.ref ) ) {
			problems.push( `${ key }: clean cites ${ evidence.ref }, which no pairing of its surfaces measured` );
		}
		const touching = rows.filter( ( r ) => r.ref === evidence.ref && ( ! evidence.property || r.property === evidence.property ) );
		if ( touching.length ) {
			problems.push( `${ key }: clean, but ${ touching.length } sweep row(s) touch ${ evidence.ref }${ evidence.property ? ' ' + evidence.property : '' }` );
		}
		// A site-wide item is clean when every item its Covers names is clean on the walker (or closed earlier) and every
		// surface they sit on is measured; another issue elsewhere on those surfaces does not hold it open.
		if ( SITE_WIDE === item.section ) {
			const unmeasuredOn = itemSurfaces( item, items ).filter( ( s ) => null === s || unmeasured.has( s ) || ! sweep.surfaces?.[ s ] );
			const openCovered = items.filter( ( x ) => x !== item && x.ids.some( ( id ) => item.covers.includes( id ) ) )
				.filter( ( x ) => ! [ 'clean on the walker', 'closed earlier' ].includes( verdictsFor( x, items, verdicts )[ 0 ]?.status ) );
			if ( unmeasuredOn.length || openCovered.length ) {
				problems.push( `${ key }: site-wide item is clean only when every covered item is clean and measured; unmeasured: ${ unmeasuredOn.map( ( s ) => s ?? '(no surface)' ).join( ', ' ) || 'none' }; not clean: ${ openCovered.map( itemKey ).join( '; ' ) || 'none' }` );
			}
		}
	}
	return problems;
}

// Adds a Sweep column to every table that holds an item. verdicts must already have passed checkStatuses.
// Existing cells are never changed: the new cell is appended after each line's final pipe.
export function addSweepColumn( markdown, items, verdicts ) {
	const lines = markdown.split( /(\r?\n)/ );
	const at = ( i ) => i * 2;
	const headers = new Set( items.map( ( x ) => x.header ) );
	const status = new Map( items.map( ( item ) => [ item.line, verdictsFor( item, items, verdicts )[ 0 ]?.status ?? '' ] ) );
	const tableEnd = ( h ) => {
		let i = h;
		while ( at( i + 1 ) < lines.length && /^\s*\|/.test( lines[ at( i + 1 ) ] ) ) {
			i++;
		}
		return i;
	};
	for ( const h of headers ) {
		for ( let i = h; i <= tableEnd( h ); i++ ) {
			const text = lines[ at( i ) ];
			const cell = i === h ? 'Sweep' : ( i === h + 1 ? '---' : ( status.get( i ) ?? '' ) );
			if ( /\|\s*$/.test( text ) ) {
				lines[ at( i ) ] = `${ text.replace( /\s+$/, '' ) } ${ cell } |`;
			}
		}
	}
	return lines.join( '' );
}

// One agent's input: its items, the sweep rows of the surfaces its sections are measured by, and the status rules.
// measured ({ surface: [refs] }): the refs each surface's pairing measured, so an agent can cite the ref covering a
// clean item.
export function bundleGroup( group, items, sweep, measured = {} ) {
	const surfaces = [ ...new Set( group.items.flatMap( ( item ) => itemSurfaces( item, items ) ) ) ];
	const named = surfaces.filter( ( s ) => null !== s );
	return {
		group: group.name,
		rules: STATUS_RULES,
		items: group.items.map( ( x ) => ( { id: itemKey( x ), section: x.section, covers: x.covers, surfaces: itemSurfaces( x, items ), cells: x.cells } ) ),
		surfaces: Object.fromEntries( named.map( ( s ) => [ s, sweep.surfaces?.[ s ] ? { measured: true, report: sweep.surfaces[ s ].report, issues: sweep.surfaces[ s ].issues, refs: measured[ s ] || [] } : { measured: false } ] ) ),
		rows: ( sweep.rows || [] ).filter( ( r ) => named.includes( r.surface ) )
	};
}
