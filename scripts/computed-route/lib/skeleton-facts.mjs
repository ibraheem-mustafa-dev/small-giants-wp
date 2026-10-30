// The facts the skeleton writer reasons from, all read from data (FP-1): the framework database (read-only), the brand
// registry, the client's Site Info placeholder map, the standing decisions file (data/skeleton-decisions.json) and the
// block.json of the list block (its item properties are not database columns). No block name is written in code below.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brandRegistry } from './brand-registry.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const DECISIONS_FILE = path.resolve( HERE, '../data/skeleton-decisions.json' );

// The regular expressions of a { patterns, flags } spec, and the first text any of them matches (else null).
export const rxList = ( spec ) => ( spec?.patterns || [] ).map( ( p ) => new RegExp( p, spec.flags || '' ) );
export const specHit = ( spec, text ) => ( rxList( spec ).find( ( r ) => r.test( String( text ?? '' ) ) ) ? spec : null );

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The facts object. o: { db, client, repo (the client's data: its sites/<client> folder), codeRepo? (the framework's block.json
// files; `repo` by default), siteName, decisionsFile }. Queries are made on demand and cached.
export function loadFacts( { db, client, repo = REPO, codeRepo = repo, siteName = null, decisionsFile = DECISIONS_FILE } ) {
	const q = ( sql, ...a ) => db.prepare( sql ).all( ...a ).map( ( r ) => ( { ...r } ) );
	const decisions = readJson( decisionsFile );
	const mapFile = path.join( repo, 'sites', client, 'site-info-placeholder-map.json' );
	const placeholderMap = fs.existsSync( mapFile ) ? readJson( mapFile ) : {};
	const composition = Object.fromEntries( q( 'SELECT block_slug, wraps_block, composition_role, accepts_allowed_blocks, container_kind FROM block_composition' ).map( ( r ) => [ r.block_slug, { ...r, accepts: r.accepts_allowed_blocks ? JSON.parse( r.accepts_allowed_blocks ) : null } ] ) );
	const tagMap = Object.fromEntries( q( 'SELECT html_tag, core_block_slug, note FROM html_tag_to_core_block' ).map( ( r ) => [ r.html_tag, r ] ) );
	const capsCache = {};
	const capsOf = ( slug ) => ( capsCache[ slug ] ||= q( 'SELECT capability FROM block_capabilities WHERE block_slug = ?', slug ).map( ( r ) => r.capability ) );
	const blocksWithCap = ( cap ) => q( 'SELECT DISTINCT block_slug FROM block_capabilities WHERE capability = ?', cap ).map( ( r ) => r.block_slug );
	const attr = ( slug, name ) => q( 'SELECT attr_name, attr_type, default_value, enum_values, role, css_property FROM block_attributes WHERE block_slug = ? AND attr_name = ?', slug, name )[ 0 ] || null;
	const attrsByRole = ( slug, role ) => q( 'SELECT attr_name, attr_type FROM block_attributes WHERE block_slug = ? AND role = ? AND css_property IS NULL', slug, role );
	// The first (by declaration order) content setting of a role: a block's primary text and link settings.
	const firstAttrByRole = ( slug, role ) => q( 'SELECT attr_name FROM block_attributes WHERE block_slug = ? AND role = ? AND css_property IS NULL ORDER BY rowid LIMIT 1', slug, role )[ 0 ]?.attr_name || null;
	const blocksWithDisplayType = ( kind ) => q( "SELECT block_slug FROM block_attributes WHERE attr_name = 'displayType' AND enum_values LIKE ?", `%"${ kind }"%` ).map( ( r ) => r.block_slug );
	const enumOf = ( slug, name ) => {
		const a = attr( slug, name );
		return a?.enum_values ? JSON.parse( a.enum_values ) : null;
	};
	const blocksOfRole = ( role ) => Object.values( composition ).filter( ( r ) => role === r.composition_role );
	// The list block is the one the database maps the `ul` tag to; its item properties come from its block.json.
	const listSlug = tagMap.ul?.core_block_slug || null;
	let listItem = null;
	if ( listSlug ) {
		const file = path.join( codeRepo, 'plugins/sgs-blocks/src/blocks', listSlug.replace( /^sgs\//, '' ), 'block.json' );
		const props = fs.existsSync( file ) ? readJson( file ).attributes?.items?.items?.properties || {} : {};
		const kinds = /([a-z]+(?:\s*\|\s*[a-z]+)+)/.exec( props.siteInfoSource?.description || '' )?.[ 1 ].split( /\s*\|\s*/ ) || [];
		listItem = { text: props.text ? 'text' : null, url: Object.keys( props ).find( ( k ) => 'url-href' === props[ k ].role ) || null, siteInfoSource: props.siteInfoSource ? 'siteInfoSource' : null, siteInfoLink: props.siteInfoLink ? 'siteInfoLink' : null, kinds };
	}
	return {
		client, repo, decisions, placeholderMap, composition, tagMap, capsOf, blocksWithCap, attr, attrsByRole, firstAttrByRole, blocksWithDisplayType, enumOf, q,
		// SGS bans core blocks: each core block's SGS replacement, from blocks.replaces (a comma list per SGS block).
		replacedBy: Object.fromEntries( q( "SELECT slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces <> ''" ).flatMap( ( r ) => r.replaces.split( ',' ).map( ( c ) => [ c.trim(), r.slug ] ) ).filter( ( [ c ] ) => c ) ),
		brands: brandRegistry(),
		siteName: siteName ? String( siteName ).replace( /\s+/g, ' ' ).trim() : null,
		wrapperShells: blocksOfRole( 'wrapper-shell' ).map( ( r ) => r.block_slug ),
		// A content block accepting exactly one block is a row of that block (a social row accepts only icons).
		rowBlocks: blocksOfRole( 'content-block' ).filter( ( r ) => 1 === r.accepts?.length ).map( ( r ) => ( { slug: r.block_slug, child: r.accepts[ 0 ] } ) ),
		logoBlocks: blocksWithCap( 'logo' ).filter( ( b ) => 'leaf' === composition[ b ]?.composition_role ),
		displayTypes: enumOf( 'sgs/business-info', 'displayType' ) || [],
		listSlug, listItem,
		mapEntry: ( ph ) => placeholderMap[ ph ] || placeholderMap[ ph.replace( /\{\{ ?| ?\}\}/g, ( s ) => ( s.includes( '{' ) ? '{{ ' : ' }}' ) ) ] || null,
	};
}

// What is wrong with the decisions data, as readable lines (empty when sound): every block named exists in the database
// and is not a core block,
// every pattern compiles, the list block and its item properties were found.
export function decisionsProblems( facts ) {
	const d = facts.decisions;
	const problems = [];
	const specs0 = [];
	const known = ( slug, where ) => {
		if ( slug?.startsWith( 'core/' ) ) {
			problems.push( `${ where } names ${ slug }, a core block (SGS bans core blocks)${ facts.replacedBy?.[ slug ] ? `: use ${ facts.replacedBy[ slug ] }` : '' }` );
		} else if ( slug && ! facts.composition[ slug ] && ! facts.q( 'SELECT 1 FROM blocks WHERE slug = ? LIMIT 1', slug ).length ) {
			problems.push( `${ where } names ${ slug }, which is not in the framework database` );
		}
	};
	known( d.structural?.columnLabel?.block, 'structural.columnLabel' );
	( d.elements || [] ).forEach( ( e ) => e.block && known( e.block, `elements.${ e.id }` ) );
	const r = d.rules || {};
	[ [ 'rules.decorativeShape', r.decorativeShape?.block ], [ 'rules.backToTop.wholeBlock', r.backToTop?.wholeBlock ], [ 'rules.backToTop.lone', r.backToTop?.lone ], [ 'rules.pillButton', r.pillButton?.block ], [ 'rules.wholeCardLink', r.wholeCardLink?.block ], [ 'rules.marquee.logoBlock', r.marquee?.logoBlock ], [ 'rules.marquee.itemBlock', r.marquee?.itemBlock ], [ 'rules.marquee.textBlock', r.marquee?.textBlock ], [ 'rules.loopBlocks.carousel.block', r.loopBlocks?.carousel?.block ], [ 'rules.loopBlocks.carousel.cardBlock', r.loopBlocks?.carousel?.cardBlock ], [ 'rules.trustBar', r.trustBar?.block ], [ 'rules.hero', r.hero?.block ], [ 'rules.modalFrame', r.modalFrame?.block ], [ 'rules.formPrefillOpener', r.formPrefillOpener?.block ], [ 'rules.formHost', r.formHost?.block ], [ 'rules.formLink', r.formLink?.block ], [ 'rules.formControl.inputPartHost', r.formControl?.inputPartHost ], [ 'rules.marqueeCodeItems', r.marqueeCodeItems?.block ], [ 'rules.megaGroup', r.megaGroup?.block ], [ 'rules.megaAside', r.megaAside?.block ], [ 'rules.megaContainer', r.megaContainer?.block ], [ 'rules.drawerIconRun', r.drawerIconRun?.block ], [ 'rules.headerSlots', r.headerSlots?.block ], [ 'rules.headerSlots.rowBlock', r.headerSlots?.rowBlock ], [ 'rules.footerSlots', r.footerSlots?.block ], [ 'rules.footerSlots.rowBlock', r.footerSlots?.rowBlock ],
		...Object.entries( r.navigation?.bySurface || {} ).map( ( [ k, b ] ) => [ `rules.navigation.${ k }`, b ] ), ...( r.surfaceRoot?.entries || [] ).map( ( x, i ) => [ `rules.surfaceRoot[${ i }]`, x.block ] ),
		...( r.drawsChildren?.blocks || [] ).map( ( x ) => [ `rules.drawsChildren ${ x.block }`, x.block ] ),
		...[ 'block', 'step', 'question', 'result' ].map( ( k ) => [ `rules.choiceFlow.${ k }`, r.choiceFlow?.[ k ] ] ),
		...Object.entries( r.blockOwnedPart?.byTemplate || {} ).map( ( [ k, x ] ) => [ `rules.blockOwnedPart.byTemplate.${ k }`, x.block ] ) ].forEach( ( [ where, slug ] ) => known( slug, where ) );
	// A block-owned part's trigger names settings its owning block has (the control that opens the part writes them).
	for ( const [ k, x ] of Object.entries( r.blockOwnedPart?.byTemplate || {} ) ) {
		[ 'style', 'label', 'countStyle', 'showZero', 'ariaLabel' ].filter( ( f ) => x.trigger && ! ( x.trigger[ f ] && facts.attr( x.block, x.trigger[ f ] ) ) )
			.forEach( ( f ) => problems.push( `rules.blockOwnedPart.byTemplate.${ k }.trigger.${ f } must name a setting ${ x.block } has` ) );
	}
	// The modal frame names the framework DB `css_element` of each part the block draws (the scrim, the dialog and the close), and a reason for every element it takes.
	for ( const [ role, part ] of Object.entries( r.modalFrame ? r.modalFrame.names || {} : {} ) ) {
		facts.q( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND css_element = ? LIMIT 1', r.modalFrame.block, part ).length || problems.push( `rules.modalFrame.names.${ role } names ${ part }, which is no css_element of ${ r.modalFrame.block }` );
		r.modalFrame.parts?.[ role ] || problems.push( `rules.modalFrame.parts.${ role } needs a reason` );
	}
	if ( r.choiceFlow && [ 'block', 'step', 'question', 'result' ].some( ( k ) => ! r.choiceFlow[ k ] ) ) {
		problems.push( 'rules.choiceFlow must name its block, step, question and result blocks' );
	}
	if ( r.headerSlots && ( ! r.headerSlots.slotAttribute || ! facts.attr( r.headerSlots.rowBlock, r.headerSlots.slotAttribute ) || ! Array.isArray( r.headerSlots.slots ) || 3 !== r.headerSlots.slots.length ) ) {
		problems.push( `rules.headerSlots must name three slots and a slot attribute that ${ r.headerSlots.rowBlock } has` );
	}
	if ( r.footerSlots && ( ! r.footerSlots.slotAttribute || ! facts.attr( r.footerSlots.rowBlock, r.footerSlots.slotAttribute ) || ! Array.isArray( r.footerSlots.slots ) || 3 !== r.footerSlots.slots.length ) ) {
		problems.push( `rules.footerSlots must name three slots and a slot attribute that ${ r.footerSlots.rowBlock } has` );
	}
	// A commerce region's block: a core block only as a listed exception, WooCommerce's own block (outside the framework
	// database), or a known SGS block; its money pattern compiles.
	for ( const [ role, spec ] of Object.entries( r.commerceRegion?.roles || {} ) ) {
		const all = [ spec.block, ...JSON.stringify( spec.inner || [] ).match( /"name":"[^"]+"/g )?.map( ( x ) => x.slice( 8, -1 ) ) || [] ];
		for ( const slug of all ) {
			if ( slug?.startsWith( 'core/' ) ? ! ( r.coreExceptions || [] ).some( ( x ) => x.block === slug ) : ! slug?.startsWith( 'woocommerce/' ) ) {
				slug?.startsWith( 'core/' ) ? problems.push( `rules.commerceRegion.${ role } names ${ slug }, a core block not listed in rules.coreExceptions` ) : known( slug, `rules.commerceRegion.${ role }` );
			}
		}
	}
	// The filter rail (lib/skeleton-filter-rail.mjs): WooCommerce's own blocks or known SGS blocks with the settings it writes.
	if ( r.filterRail ) {
		const f = r.filterRail;
		const names = JSON.stringify( [ f.filters, f.groups, Object.values( f.displayStyles || {} ).map( ( name ) => ( { name } ) ) ] ).match( /"name":"[^"]+"/g )?.map( ( x ) => x.slice( 8, -1 ) ) || [];
		[ f.block, f.heading?.block, ...names ].filter( ( slug ) => ! slug?.startsWith( 'woocommerce/' ) ).forEach( ( slug ) => known( slug, 'rules.filterRail' ) );
		// `className` and `anchor` are WordPress block supports, never framework-database settings.
		const supports = new Set( [ 'className', 'anchor' ] );
		[ [ f.block, Object.keys( f.attributes || {} ) ], [ f.heading?.block, [ 'content', ...Object.keys( f.heading?.attributes || {} ) ] ] ].forEach( ( [ block, attrs ] ) => attrs.filter( ( a ) => block && ! supports.has( a ) && ! facts.attr( block, a ) ).forEach( ( a ) => problems.push( `rules.filterRail writes ${ a } on ${ block }, a setting it does not have` ) ) );
		[ 'facet', 'price', 'brand', 'category' ].filter( ( k ) => ! f.groups?.[ k ]?.name ).forEach( ( k ) => problems.push( `rules.filterRail.groups.${ k } must name its block` ) );
		[ 'choice', 'checkbox' ].filter( ( k ) => ! f.displayStyles?.[ k ] ).forEach( ( k ) => problems.push( `rules.filterRail.displayStyles.${ k } must name a block` ) );
	}
	if ( r.filterDrawer ) {
		const d = r.filterDrawer;
		[ 'block', 'modeAttribute', 'positionAttribute' ].filter( ( k ) => ! d[ k ] ).forEach( ( k ) => problems.push( `rules.filterDrawer.${ k } must be set` ) );
		[ [ 'modes', [ 'rail', 'drawer' ] ], [ 'sides', [ 'left', 'right' ] ] ].forEach( ( [ k, names ] ) => names.filter( ( n ) => ! d[ k ]?.[ n ] ).forEach( ( n ) => problems.push( `rules.filterDrawer.${ k }.${ n } must be set` ) ) );
		d.block && ! d.block.startsWith( 'woocommerce/' ) && known( d.block, 'rules.filterDrawer' );
	}
	if ( r.commerceRegion ) {
		try {
			new RegExp( r.commerceRegion.money );
		} catch ( e ) {
			problems.push( `rules.commerceRegion.money does not compile: ${ e.message }` );
		}
		const entry = r.commerceRegion.checkoutEntry;
		if ( entry ) {
			try {
				new RegExp( entry.autocomplete );
			} catch ( e ) {
				problems.push( `rules.commerceRegion.checkoutEntry.autocomplete does not compile: ${ e.message }` );
			}
			( ! Number.isInteger( entry.minFields ) || entry.minFields < 2 || ! Array.isArray( entry.types ) ) && problems.push( 'rules.commerceRegion.checkoutEntry needs minFields (an integer of at least 2) and types (a list of input types)' );
		}
	}
	( r.coreExceptions || [] ).forEach( ( x, i ) => ( ! x.block?.startsWith( 'core/' ) || ! String( x.reason || '' ).trim() ) && problems.push( `rules.coreExceptions[${ i }] must name a core block and give its reason` ) );
	( r.surfaceRoot?.entries || [] ).forEach( ( x, i ) => specs0.push( [ `rules.surfaceRoot[${ i }]`, { patterns: [ x.namePattern ], flags: 'i' } ] ) );
	const specs = [ ...specs0, ...( d.briefOnlyLines || [] ).map( ( s ) => [ `briefOnlyLines.${ s.id }`, s ] ), ...Object.entries( d.siteInfoPatterns || {} ).map( ( [ k, s ] ) => [ `siteInfoPatterns.${ k }`, s ] ), [ 'addressLinkPatterns', d.addressLinkPatterns ], [ 'logoImage', d.logoImage ],
		...[ 'typedDivider', 'homeLink', 'backToTop', 'mapEmbed' ].map( ( k ) => [ `rules.${ k }`, r[ k ] ] ), [ 'rules.backToTop.handlers', r.backToTop?.handlers ] ];
	for ( const [ where, spec ] of specs ) {
		try {
			rxList( spec );
		} catch ( e ) {
			problems.push( `${ where } has a pattern that does not compile: ${ e.message }` );
		}
	}
	if ( ! facts.listSlug || ! facts.listItem?.text || ! facts.listItem?.url ) {
		problems.push( 'the list block (the database maps the ul tag to it) was not found, or its block.json items carry no text and url-href property' );
	}
	return problems;
}
