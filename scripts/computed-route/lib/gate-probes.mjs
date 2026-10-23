// The live probes of the gate chain (Spec 48 FR-48-64): G5 measures a candidate setting's emission on the live element,
// G6 runs the trial, winning-rule read, roster grep or flow probe, G7 walks the surface fresh. `createProbes` returns
// { measure(row, setting), probe(row, kind), recheck(row), close() }, the object lib/gate-chain.mjs's gates are fed
// through gate-chain.mjs. Nothing fails open: a page that cannot be opened, an element that is absent, a state a probe
// cannot reproduce, an unreadable stylesheet that could hold the answer or a missing input throws, and the gate fails
// with its own class.
//
// o: { origin (the live site), url (the surface's own live page; default origin), db (read-only), states (the surface's
// walker state map), openPage({ width }) -> page (default: a new Playwright page on url), walk(row) -> a fresh walker
// report (default: the walker on a served draft),
// renderBlock(block, attrs) -> { status, html } (the block renderer; needed to trial candidate settings), today }.
import { listedProperties } from './db.mjs';
import { openRows, settingState, cssProp } from './solve-rows.mjs';
import { enumerateInPage, winnerInPage } from './gate-probes-page.mjs';
import { withOrigin } from './rule-origin.mjs';
import { KEYWORDS } from './calibrate-markers.mjs';

const STATE_PSEUDO = { hover: ':hover' };
const slugOf = ( block ) => String( block ).replace( /^sgs\//, '' ).replace( /[^\w-]/g, '' );

// Whether a selector names the block's own class or one of its instances' uid classes.
export const belongsTo = ( selector, block ) => new RegExp( `(?:^|[^\\w-])\\.(?:wp-block-)?sgs-${ slugOf( block ) }(?:-[0-9a-f]{8})?(?![\\w-])` ).test( selector );

const ownRule = ( selector ) => /(?:^|[^\w-])\.(?:wp-block-)?sgs-[\w-]+/.test( selector );

// Keyword values calibration's marker table lacks, for properties a block setting can carry as free text.
const KEYWORD_VALUES = { ...KEYWORDS, display: [ 'flex', 'none', 'grid' ], visibility: [ 'hidden' ], position: [ 'sticky', 'relative' ], overflow: [ 'hidden' ], 'align-self': [ 'center' ], 'justify-self': [ 'center' ], 'text-align': KEYWORDS[ 'text-align' ] };

// The probe values a trial writes into a candidate setting: every value of its enum, true for a boolean, a number for a
// number (bare and per-device), a theme token slug and a hex for a colour (a slug-only attribute drops a hex), the CSS
// keywords the property takes, and a length (bare and per-device) for any setting that takes text. `attribute` is the
// setting's DB row ({ attr_type, enum_values }); one with no row is probed with every shape.
export function probeValues( property, attribute = {} ) {
	const types = String( attribute.attr_type ?? '' ).split( '|' ).filter( Boolean );
	const takes = ( ...t ) => ! types.length || t.some( ( x ) => types.includes( x ) );
	let listed = [];
	try {
		listed = JSON.parse( attribute.enum_values ?? '[]' );
	} catch ( e ) {
		listed = [];
	}
	const out = [ ...( Array.isArray( listed ) ? listed.filter( ( v ) => '' !== v ) : [] ) ];
	takes( 'boolean' ) && out.push( true );
	takes( 'number', 'integer' ) && out.push( 37, { desktop: 37 } );
	if ( takes( 'string', 'object', 'rich-text', 'array' ) ) {
		/colou?r|background|border-color|fill|stroke/.test( property ) && out.push( 'primary', 'accent', '#12ab34' );
		out.push( ...( KEYWORD_VALUES[ property ] || [] ), '37px', { desktop: '37px' } );
	}
	return out.filter( ( v, i ) => out.findIndex( ( x ) => JSON.stringify( x ) === JSON.stringify( v ) ) === i );
}

// The live origin and the surface's own live page from a walker config's live url (its `{cb}` cache-buster filled); an
// origin override (SGS_LIVE_ORIGIN) keeps the surface's path.
export function liveTarget( configUrl, originOverride = '' ) {
	const u = new URL( String( configUrl ).replace( '{cb}', '0' ) );
	const origin = ( originOverride || u.origin ).replace( /\/+$/, '' );
	return { origin, url: `${ origin }${ u.pathname }${ u.search }` };
}

async function defaultOpenPage( origin, { width } ) {
	const { chromium } = await import( 'playwright' );
	const { waitOutHostCheck } = await import( '../../parity/lib/helpers.mjs' );
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED } );
	const page = await ( await browser.newContext( { viewport: { width, height: width < 500 ? 812 : 900 } } ) ).newPage();
	const close = page.close.bind( page );
	page.close = async () => {
		await close();
		await browser.close();
	};
	await page.goto( origin, { waitUntil: 'domcontentloaded', timeout: 90000 } );
	await waitOutHostCheck( page );
	return page;
}

export function createProbes( o ) {
	const need = ( v, what ) => {
		if ( null == v || '' === v ) {
			throw new Error( `${ what } is not available` );
		}
		return v;
	};
	const open = o.openPage || ( ( a ) => defaultOpenPage( need( o.url || o.origin, 'the live origin' ), a ) );

	// Opens the live page at the row's width in the state the row was measured in (rest, or the pointer on the element for a
	// hover) and runs fn( page, selector ); the page is always closed.
	async function onElement( row, fn ) {
		need( row?.ref, 'the row\'s element' );
		const state = settingState( row, o.states );
		if ( null !== state && ! STATE_PSEUDO[ state ] ) {
			throw new Error( `the ${ row.state } state (${ state ?? 'unmapped' }) cannot be reproduced on the live page by a probe` );
		}
		const page = await open( { width: Number( need( row.width, 'the row\'s width' ) ) } );
		try {
			const selector = `.${ row.ref }`;
			if ( state ) {
				await page.hover( selector, { timeout: 15000 } );
			}
			return await fn( page, selector );
		} finally {
			await page.close();
		}
	}

	const settingProperties = ( setting ) => {
		const r = need( o.db, 'the DB' ).prepare( 'SELECT css_property FROM block_attributes WHERE block_slug = ? AND attr_name = ? AND source IN ( \'sgs\', \'sgs-ext\' )' ).get( setting.block, setting.attr );
		const props = listedProperties( r?.css_property );
		if ( ! props.length ) {
			throw new Error( `${ setting.block } ${ setting.attr } carries no css_property to measure` );
		}
		return props;
	};

	// G5. { method: 'measured', emitted, reaches, evidence }: reaches when a rule that matches the element and declares one of
	// the setting's properties names the setting's block or one of its instances, from a framework stylesheet (a rule in the
	// block's sgsCustomCss residual is the route's own write, not an emission).
	async function measure( row, setting ) {
		const props = settingProperties( setting );
		const found = await onElement( row, ( page, sel ) => page.evaluate( enumerateInPage, [ sel, props ] ) );
		if ( found.absent ) {
			throw new Error( `${ row.ref } is not on the live page` );
		}
		const own = withOrigin( found.hits ).filter( ( h ) => 'custom-css' !== h.origin && belongsTo( h.selector, setting.block ) );
		const where = `${ found.hits.length } matching rule(s) declare ${ props.join( '/' ) } on ${ row.ref } across ${ found.sheets } stylesheet(s)`;
		if ( own.length ) {
			return { method: 'measured', emitted: `${ own[ 0 ].selector } { ${ own[ 0 ].property }: ${ own[ 0 ].value } }`, reaches: true, evidence: `${ where }; ${ setting.block }'s own rule matches` };
		}
		if ( found.unread ) {
			throw new Error( `${ found.unread } stylesheet(s) or rule(s) could not be read, so a missing emission cannot be shown (${ where })` );
		}
		return { method: 'measured', emitted: null, reaches: false, evidence: `${ where }; none names ${ setting.block }${ found.hits.length ? ` (${ found.hits.slice( 0, 3 ).map( ( h ) => h.selector ).join( ' | ' ) })` : '' }` };
	}

	// G6 missing setting: candidate settings are the DB rows of the block, its ancestors and its extensions that list the
	// property. changed is true when a framework rule (not the block's sgsCustomCss) from an SGS class already declares the property on the element, or a candidate
	// setting written with a probe value renders CSS naming the property; false only when neither holds.
	async function trialSettings( row ) {
		const prop = cssProp( row.key );
		const block = need( row.block, 'the row\'s block' );
		const live = await onElement( row, ( page, sel ) => page.evaluate( enumerateInPage, [ sel, [ prop ] ] ) );
		if ( live.absent ) {
			throw new Error( `${ row.ref } is not on the live page` );
		}
		const sgs = withOrigin( live.hits ).filter( ( h ) => 'custom-css' !== h.origin && ownRule( h.selector ) );
		if ( sgs.length ) {
			return { changed: true, evidence: `an SGS rule declares ${ prop } on ${ row.ref }: ${ sgs[ 0 ].selector }` };
		}
		if ( live.unread ) {
			throw new Error( `${ live.unread } stylesheet(s) or rule(s) could not be read, so no rule can be ruled out` );
		}
		const slugs = [ block, ...( row.ancestors || [] ) ];
		const rows = o.db.prepare( `SELECT block_slug, attr_name, css_property, attr_type, enum_values FROM block_attributes WHERE source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NOT NULL AND block_slug IN ( ${ slugs.map( () => '?' ).join( ',' ) } )` ).all( ...slugs );
		const candidates = rows.filter( ( r ) => listedProperties( r.css_property ).includes( prop ) );
		if ( ! candidates.length ) {
			return { changed: false, evidence: `no rule from an SGS class declares ${ prop } on ${ row.ref } (${ live.hits.length } other matching rule(s)) and no setting of ${ slugs.join( ', ' ) } lists it` };
		}
		const render = need( o.renderBlock, 'the block renderer' );
		for ( const c of candidates ) {
			for ( const value of probeValues( prop, c ) ) {
				const [ a, b ] = [ await render( c.block_slug, {} ), await render( c.block_slug, { [ c.attr_name ]: value } ) ];
				if ( 200 !== a.status || 200 !== b.status ) {
					throw new Error( `the block renderer answered ${ a.status }/${ b.status } for ${ c.block_slug }` );
				}
				const css = ( h ) => ( String( h ).match( /<style\b[^>]*>[\s\S]*?<\/style>/g ) || [] ).join( '' ).replace( /sgs-[a-z0-9-]+-[0-9a-f]{8}/g, 'UID' );
				if ( css( a.html ) !== css( b.html ) && new RegExp( `(?:^|[;{\\s])${ prop }\\s*:` ).test( css( b.html ) ) ) {
					return { changed: true, evidence: `${ c.block_slug } ${ c.attr_name } = ${ JSON.stringify( value ) } renders CSS declaring ${ prop }` };
				}
			}
		}
		return { changed: false, evidence: `${ candidates.length } candidate setting(s) (${ candidates.map( ( c ) => c.attr_name ).join( ', ' ) }) written with probe values render no CSS declaring ${ prop }, and no SGS rule declares it on ${ row.ref }` };
	}

	// G6 hardcode: the rule is the SGS framework rule (a selector naming an sgs- class, in a stylesheet that is not a block's
	// sgsCustomCss residual: lib/rule-origin.mjs::ruleOrigin) whose removal changes the computed value. A
	// winner that is a WordPress or theme rule or the element's inline style is no SGS hardcode, and a stylesheet or rule
	// the trial could not read leaves a winner it may not have seen.
	async function hardcodeRule( row ) {
		const prop = cssProp( row.key );
		const w = await onElement( row, ( page, sel ) => page.evaluate( winnerInPage, [ sel, prop ] ) );
		if ( w.absent ) {
			throw new Error( `${ row.ref } is not on the live page` );
		}
		if ( ! w.restored ) {
			throw new Error( 'the trial could not restore the page\'s own rules' );
		}
		const winners = withOrigin( w.winners );
		const own = winners.find( ( n ) => 'stylesheet' === n.origin && ownRule( n.rule ) )?.rule;
		if ( own ) {
			return { rule: own, evidence: `removing ${ prop } from ${ own } changes ${ row.ref } from ${ w.before }` };
		}
		if ( w.unread ) {
			throw new Error( `${ w.unread } stylesheet(s) or rule(s) could not be read, so no rule can be ruled out` );
		}
		return { rule: null, evidence: winners.length ? `the rule that wins ${ prop } on ${ row.ref } is ${ winners.map( ( n ) => ( 'custom-css' === n.origin ? `${ n.rule } (the block's own sgsCustomCss)` : n.rule ) ).join( ', ' ) }, not an SGS framework rule` : `no single rule's removal changes ${ prop } on ${ row.ref } (computed ${ w.before })` };
	}

	function rosterMatches( row ) {
		const terms = need( row.words, 'the element\'s words' );
		const list = ( Array.isArray( terms ) ? terms : String( terms ).split( /\W+/ ) ).map( ( t ) => String( t ).toLowerCase() ).filter( ( t ) => t.length >= 4 );
		need( list.length ? 1 : null, 'a word of at least 4 letters to grep the roster with' );
		const blocks = o.db.prepare( "SELECT slug, title, description FROM blocks WHERE status IS NOT 'removed'" ).all();
		return { matches: blocks.filter( ( b ) => list.some( ( t ) => `${ b.slug } ${ b.title ?? '' } ${ b.description ?? '' }`.toLowerCase().includes( t ) ) ).map( ( b ) => b.slug ), terms: list };
	}

	// One fresh walk per surface state and width, shared by the flow probe and the re-check.
	// The kinds of row the fresh walk (--lean) does not read, so its absence from that walk shows nothing.
	const LEAN_BLIND = [ 'link', 'entrance', 'press' ];
	const walks = new Map();
	async function freshOpen( row ) {
		if ( LEAN_BLIND.includes( row.kind ) || ( /^(part|effect)$/.test( row.kind ) && /\bpress\b/.test( String( row.key ) ) ) ) {
			throw new Error( `the fresh walk is lean: a ${ row.kind } row is one the lean walk does not read, so its absence proves nothing` );
		}
		const key = `${ row.state }|${ row.width }`;
		if ( ! walks.has( key ) ) {
			walks.set( key, Promise.resolve( need( o.walk, 'a fresh walk' )( row ) ) );
		}
		const report = await walks.get( key );
		if ( ! ( report.runs || [] ).length ) {
			throw new Error( 'the fresh walk produced no runs' );
		}
		if ( ! report.runs.some( ( r ) => r.state === row.state && r.width === row.width ) ) {
			throw new Error( `the fresh walk has no run at ${ row.width } in the ${ row.state } state, so a missing row shows nothing` );
		}
		const same = ( r ) => r.ref === row.ref && r.key === row.key && r.state === row.state && r.width === row.width && ( r.path ?? '' ) === ( row.path ?? '' );
		const open = openRows( report ).filter( same );
		return { open };
	}

	async function probe( row, kind ) {
		if ( 'missing-setting' === kind ) {
			return trialSettings( row );
		}
		if ( 'hardcode' === kind ) {
			return hardcodeRule( row );
		}
		if ( 'missing-block' === kind ) {
			const r = rosterMatches( row );
			return { ...r, evidence: `${ r.matches.length } block(s) of the roster match ${ r.terms.join( ', ' ) }${ r.matches.length ? `: ${ r.matches.slice( 0, 5 ).join( ', ' ) }` : '' }` };
		}
		if ( 'behaviour' === kind ) {
			const terms = String( row.key ).replace( /^(tap|control)\s+/, '' ).split( /\W+/ ).map( ( t ) => t.toLowerCase() ).filter( ( t ) => t.length >= 4 );
			need( terms.length ? 1 : null, 'a word of the flow to grep the settings with' );
			const slugs = [ need( row.block, 'the row\'s block' ), ...( row.ancestors || [] ) ];
			const rows = o.db.prepare( `SELECT block_slug, attr_name, description, meaning FROM block_attributes WHERE source IN ( 'sgs', 'sgs-ext' ) AND block_slug IN ( ${ slugs.map( () => '?' ).join( ',' ) } )` ).all( ...slugs );
			const attributeMatches = rows.filter( ( r ) => terms.some( ( t ) => `${ r.attr_name } ${ r.description ?? '' } ${ r.meaning ?? '' }`.toLowerCase().includes( t ) ) ).map( ( r ) => `${ r.block_slug } ${ r.attr_name }` );
			const f = await freshOpen( row );
			return { flowFails: f.open.length > 0, attributeMatches, evidence: `the flow ${ f.open.length ? 'still differs' : 'now agrees' } on a fresh walk; ${ attributeMatches.length } setting(s) of ${ slugs.join( ', ' ) } match ${ terms.join( ', ' ) }` };
		}
		throw new Error( `no probe for ${ kind }` );
	}

	// G7: still open after a fresh walk on the publish date.
	async function recheck( row ) {
		const f = await freshOpen( row );
		const day = o.today || new Date().toISOString().slice( 0, 10 );
		return { stillOpen: f.open.length > 0, evidence: `fresh walk on ${ day }: ${ f.open.length } open row(s) for ${ row.ref } ${ row.key } in ${ row.state } at ${ row.width }` };
	}

	return { measure, probe, recheck, close: async () => {} };
}
