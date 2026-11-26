// The facts the skeleton writer reasons from, all read from data (FP-1): the framework database (read-only), the brand
// registry, the client's Site Info placeholder map, the standing decisions file (data/skeleton-decisions.json) and the
// block.json of the list block (its item properties are not database columns). No block name is written in code below.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brandRegistry } from './brand-registry.mjs';
import { UNIT_PARTS } from './skeleton-child-slots.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const DECISIONS_FILE = path.resolve( HERE, '../data/skeleton-decisions.json' );

// The regular expressions of a { patterns, flags } spec, and the first text any of them matches (else null).
export const rxList = ( spec ) => ( spec?.patterns || [] ).map( ( p ) => new RegExp( p, spec.flags || '' ) );
export const specHit = ( spec, text ) => ( rxList( spec ).find( ( r ) => r.test( String( text ?? '' ) ) ) ? spec : null );

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The facts object. o: { db, client, repo, siteName, decisionsFile }. Queries are made on demand and cached.
export function loadFacts( { db, client, repo = REPO, siteName = null, decisionsFile = DECISIONS_FILE } ) {
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
		const file = path.join( repo, 'plugins/sgs-blocks/src/blocks', listSlug.replace( /^sgs\//, '' ), 'block.json' );
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
	[ [ 'rules.decorativeShape', r.decorativeShape?.block ], [ 'rules.formPrefillOpener', r.formPrefillOpener?.block ], [ 'rules.decorationLayer', r.decorationLayer?.block ], [ 'rules.heroCollage', r.heroCollage?.block ], [ 'rules.heroCollageLayer', r.heroCollageLayer?.block ], [ 'rules.heroCollageRow', r.heroCollageRow?.block ], [ 'rules.backgroundPicture', r.backgroundPicture?.block ], [ 'rules.backToTop.wholeBlock', r.backToTop?.wholeBlock ], [ 'rules.backToTop.lone', r.backToTop?.lone ], [ 'rules.pillButton', r.pillButton?.block ], [ 'rules.wholeCardLink', r.wholeCardLink?.block ], [ 'rules.marquee.logoBlock', r.marquee?.logoBlock ], [ 'rules.marquee.itemBlock', r.marquee?.itemBlock ], [ 'rules.trustBar', r.trustBar?.block ], [ 'rules.hero', r.hero?.block ], [ 'rules.formHost', r.formHost?.block ], [ 'rules.formLink', r.formLink?.block ], [ 'rules.formControl.inputPartHost', r.formControl?.inputPartHost ], [ 'rules.marqueeCodeItems', r.marqueeCodeItems?.block ], [ 'rules.megaGroup', r.megaGroup?.block ], [ 'rules.megaOpenerMenu', r.megaOpenerMenu?.block ], [ 'rules.splitMenu', r.splitMenu?.block ], [ 'rules.megaAside', r.megaAside?.block ], [ 'rules.megaContainer', r.megaContainer?.block ], [ 'rules.drawerIconRun', r.drawerIconRun?.block ], [ 'rules.headerSlots', r.headerSlots?.block ], [ 'rules.headerSlots.rowBlock', r.headerSlots?.rowBlock ], [ 'rules.footerSlots', r.footerSlots?.block ], [ 'rules.footerSlots.rowBlock', r.footerSlots?.rowBlock ], [ 'rules.homeLink.groupBlock', r.homeLink?.groupBlock ],
		...( r.decorationLayer?.sectionAnchorBlocks || [] ).map( ( b ) => [ 'rules.decorationLayer.sectionAnchorBlocks', b ] ),
		...Object.entries( r.navigation?.bySurface || {} ).map( ( [ k, b ] ) => [ `rules.navigation.${ k }`, b ] ), ...( r.surfaceRoot?.entries || [] ).map( ( x, i ) => [ `rules.surfaceRoot[${ i }]`, x.block ] ),
		...( r.drawsChildren?.blocks || [] ).map( ( x ) => [ `rules.drawsChildren ${ x.block }`, x.block ] ),
		...[ 'block', 'step', 'question', 'result' ].map( ( k ) => [ `rules.choiceFlow.${ k }`, r.choiceFlow?.[ k ] ] ),
		...Object.entries( r.blockOwnedPart?.byTemplate || {} ).map( ( [ k, x ] ) => [ `rules.blockOwnedPart.byTemplate.${ k }`, x.block ] ) ].forEach( ( [ where, slug ] ) => known( slug, where ) );
	// The widget rules (lib/skeleton-widgets.mjs): each block is known and accepts exactly one child block, and each setting
	// they write is one that block (or its child) has.
	const widget = ( where, block, settings, onChild = [] ) => {
		if ( ! block ) {
			return;
		}
		known( block, where );
		const child = facts.composition[ block ]?.accepts;
		if ( 1 !== child?.length ) {
			problems.push( `${ where } names ${ block }, which does not accept exactly one child block` );
			return;
		}
		Object.entries( settings || {} ).forEach( ( [ k, attr ] ) => ! facts.attr( onChild.includes( k ) ? child[ 0 ] : block, attr ) && problems.push( `${ where }.settings.${ k } names ${ attr }, which ${ onChild.includes( k ) ? child[ 0 ] : block } does not have` ) );
	};
	widget( 'rules.accordion', r.accordion?.block, r.accordion?.settings, [ 'itemOpen', 'title', 'category', 'categoryShown' ] );
	widget( 'rules.accordion.toggle', r.accordion?.toggle && r.accordion.block, r.accordion?.toggle?.settings );
	// The accordion's unit slots name settings of the accordion itself, each part one lib/skeleton-child-slots.mjs::unitSlots reads.
	const cs = r.accordion?.childSlots;
	cs && [ [ 'resting', cs.resting ], [ 'current', cs.current ], ...( cs.parts || [] ).map( ( p, i ) => [ `parts[${ i }]`, p.setting ] ) ]
		.filter( ( [ , attr ] ) => ! facts.attr( r.accordion.block, attr ) ).forEach( ( [ k, attr ] ) => problems.push( `rules.accordion.childSlots.${ k } names ${ attr }, which ${ r.accordion.block } does not have` ) );
	( cs?.parts || [] ).filter( ( p ) => ! UNIT_PARTS.includes( p.part ) || ! [ 'resting', 'current' ].includes( p.child ) )
		.forEach( ( p ) => problems.push( `rules.accordion.childSlots part ${ JSON.stringify( p ) } must name a part of ${ UNIT_PARTS.join( ', ' ) } and a child of resting or current` ) );
	// The option picker's own settings: the legend switch and the chip part its look is read at.
	r.optionSet?.hideLabel && ! facts.attr( r.optionSet.block, r.optionSet.hideLabel.setting ) && problems.push( `rules.optionSet.hideLabel names ${ r.optionSet.hideLabel.setting }, which ${ r.optionSet.block } does not have` );
	r.optionSet?.chipSlots && ! r.optionSet.chipSlots.part && problems.push( 'rules.optionSet.chipSlots must name the chip part' );
	( r.slider?.blocks || [] ).forEach( ( b, i ) => widget( `rules.slider.blocks[${ i }]`, b.block, r.slider.settings ) );
	widget( 'rules.tabs', r.tabs?.block, r.tabs?.settings, [ 'label' ] );
	// A block-owned part's trigger names settings its owning block has (the control that opens the part writes them).
	for ( const [ k, x ] of Object.entries( r.blockOwnedPart?.byTemplate || {} ) ) {
		[ 'style', 'label', 'countStyle', 'showZero', 'ariaLabel', ...[ 'styleTablet', 'styleMobile' ].filter( ( f ) => x.trigger?.[ f ] ) ].filter( ( f ) => x.trigger && ! ( x.trigger[ f ] && facts.attr( x.block, x.trigger[ f ] ) ) )
			.forEach( ( f ) => problems.push( `rules.blockOwnedPart.byTemplate.${ k }.trigger.${ f } must name a setting ${ x.block } has` ) );
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
	const hc = r.headerSlots?.columnsSetting;
	if ( hc && ( ! facts.attr( r.headerSlots.rowBlock, hc ) || facts.attr( r.headerSlots.rowBlock, hc ).css_property ) ) {
		problems.push( `rules.headerSlots.columnsSetting must name a structural setting ${ r.headerSlots.rowBlock } has` );
	}
	// A rule's item look settings (`itemSlots`) are settings of its own block.
	Object.entries( r ).filter( ( [ , x ] ) => Array.isArray( x?.itemSlots ) ).forEach( ( [ id, x ] ) => x.itemSlots.filter( ( a ) => ! facts.attr( x.block ?? x.logoBlock, a ) ).forEach( ( a ) => problems.push( `rules.${ id }.itemSlots names ${ a }, which ${ x.block ?? x.logoBlock } does not have` ) ) );
	const ci = r.marqueeCodeItems?.items;
	if ( ci && ( ! facts.attr( r.marqueeCodeItems.block, ci.setting ) || [ ...( ci.clear || [] ), ...( ci.slots || [] ), ...( ci.plain ? [ ci.plain.setting ] : [] ), ...( ci.icons ? [ ci.icons.setting, ...( ci.icons.slots || [] ) ] : [] ) ].some( ( a ) => ! facts.attr( r.marqueeCodeItems.block, a ) ) ) ) {
		problems.push( `rules.marqueeCodeItems.items must name an items setting and cleared settings ${ r.marqueeCodeItems.block } has` );
	}
	// The values the code-built items' styles write are values of their settings in the framework database.
	[ [ 'plain', ci?.plain ], [ 'icons', ci?.icons ] ].filter( ( [ , x ] ) => x ).forEach( ( [ k, x ] ) => ! facts.enumOf?.( r.marqueeCodeItems.block, x.setting )?.includes( x.value )
		&& problems.push( `rules.marqueeCodeItems.items.${ k } must name one of the values ${ r.marqueeCodeItems.block } has for ${ x.setting } (${ x.value })` ) );
	// A list arrangement names a setting its block has, and one of that setting's values.
	( r.listArrangement?.blocks || [] ).forEach( ( x, i ) => {
		known( x.block, `rules.listArrangement.blocks[${ i }]` );
		const values = facts.enumOf?.( x.block, x.setting ) ?? null;
		! values?.includes( x.value ) && problems.push( `rules.listArrangement.blocks[${ i }] must name a setting ${ x.block } has and one of its values (${ x.setting } ${ x.value })` );
		x.equalShare && ( ! facts.attr( x.block, x.equalShare.setting ) || 'boolean' !== typeof x.equalShare.value ) && problems.push( `rules.listArrangement.blocks[${ i }].equalShare must name an on or off setting ${ x.block } has (${ x.equalShare.setting })` );
	} );
	// A dissolved link's slot names a block, a setting of it and the calibrated slot path the link is read at.
	( r.homeLink?.linkSlots || [] ).forEach( ( x, i ) => {
		known( x.block, `rules.homeLink.linkSlots[${ i }]` );
		( ! facts.attr( x.block, x.setting ) || ! /^\.\S/.test( x.slot || '' ) ) && problems.push( `rules.homeLink.linkSlots[${ i }] must name a setting ${ x.block } has and a slot path of its element` );
	} );
	// An item-field slot names a block with the item key it reads and css_elements the block's settings sit on.
	( r.itemFieldSlots?.blocks || [] ).forEach( ( x, i ) => {
		known( x.block, `rules.itemFieldSlots.blocks[${ i }]` );
		( x.parts || [] ).forEach( ( p ) => {
			const missing = ( p.elements || [] ).filter( ( c ) => ! facts.q( 'SELECT 1 AS x FROM block_attributes WHERE block_slug = ? AND css_element = ? LIMIT 1', x.block, c ).length );
			( ! p.key || ! ( p.elements || [] ).length || missing.length ) && problems.push( `rules.itemFieldSlots.blocks[${ i }] part ${ p.key } must name an item key and css_elements ${ x.block } has` );
		} );
		if ( x.list ) {
			const missing = ( x.list.elements || [] ).filter( ( c ) => ! facts.q( 'SELECT 1 AS x FROM block_attributes WHERE block_slug = ? AND css_element = ? LIMIT 1', x.block, c ).length );
			( ! ( x.list.elements || [] ).length || missing.length ) && problems.push( `rules.itemFieldSlots.blocks[${ i }] list must name css_elements ${ x.block } has` );
		}
	} );
	const ti = r.marquee?.textItems;
	if ( ti && [ ti.items?.setting, ...Object.keys( ti.attributes || {} ) ].some( ( a ) => ! a || ! facts.attr( r.marquee.logoBlock, a ) ) ) {
		problems.push( `rules.marquee.textItems must name an items setting and settings ${ r.marquee.logoBlock } has` );
	}
	// The labelled-logo display names settings of the logo block, each at a value the setting has.
	Object.entries( r.marquee?.labelledLogos?.attributes || {} ).filter( ( [ a, val ] ) => ! facts.enumOf?.( r.marquee.logoBlock, a )?.includes( val ) )
		.forEach( ( [ a, val ] ) => problems.push( `rules.marquee.labelledLogos.attributes ${ a } ${ val } must be a setting of ${ r.marquee.logoBlock } and one of its values` ) );
	// The name tile's setting is a setting of the logo block (the tile look read at the first tile is checked with every `itemSlots`).
	const tileSetting = r.marquee?.labelledLogos?.tile?.setting;
	tileSetting && ! facts.attr( r.marquee.logoBlock, tileSetting ) && problems.push( `rules.marquee.labelledLogos.tile.setting ${ tileSetting } must be a setting of ${ r.marquee.logoBlock }` );
	const tileLayout = r.marquee?.labelledLogos?.tile?.layout;
	tileLayout && ! facts.enumOf?.( r.marquee.logoBlock, tileLayout.setting )?.includes( tileLayout.value ) && problems.push( `rules.marquee.labelledLogos.tile.layout ${ tileLayout.setting } ${ tileLayout.value } must be a setting of ${ r.marquee.logoBlock } and one of its values` );
	// The tile size's count is a setting of the logo block, and so is its cap at each device.
	const tileSize = r.marquee?.labelledLogos?.tileSize;
	tileSize && [ tileSize.count, ...[ 'desktop', 'tablet', 'mobile' ].map( ( d ) => tileSize.cap?.[ d ] ) ].some( ( a ) => ! a || ! facts.attr( r.marquee.logoBlock, a ) ) && problems.push( `rules.marquee.labelledLogos.tileSize must name a count setting and a cap setting for desktop, tablet and mobile ${ r.marquee.logoBlock } has` );
	Object.keys( r.footerSlots?.stackedRow || {} ).filter( ( a ) => ! facts.attr( r.footerSlots.rowBlock, a ) || facts.attr( r.footerSlots.rowBlock, a ).css_property ).forEach( ( a ) => problems.push( `rules.footerSlots.stackedRow.${ a } must name a structural setting ${ r.footerSlots.rowBlock } has (no CSS property: a skeleton carries no style value)` ) );
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
		[ f.block, f.heading?.block, f.search?.block, ...names ].filter( ( slug ) => slug && ! slug.startsWith( 'woocommerce/' ) ).forEach( ( slug ) => known( slug, 'rules.filterRail' ) );
		// `className` and `anchor` are WordPress block supports, never framework-database settings.
		const supports = new Set( [ 'className', 'anchor' ] );
		[ [ f.block, Object.keys( f.attributes || {} ) ], [ f.heading?.block, [ 'content', ...Object.keys( f.heading?.attributes || {} ) ] ], [ f.search?.block, [ ...Object.keys( f.search?.attributes || {} ), ...( f.search ? [ 'placeholder', 'taxonomy' ] : [] ) ] ] ].forEach( ( [ block, attrs ] ) => attrs.filter( ( a ) => block && ! supports.has( a ) && ! facts.attr( block, a ) ).forEach( ( a ) => problems.push( `rules.filterRail writes ${ a } on ${ block }, a setting it does not have` ) ) );
		[ 'facet', 'price', 'brand', 'category' ].filter( ( k ) => ! f.groups?.[ k ]?.name ).forEach( ( k ) => problems.push( `rules.filterRail.groups.${ k } must name its block` ) );
		[ 'choice', 'checkbox' ].filter( ( k ) => ! f.displayStyles?.[ k ] ).forEach( ( k ) => problems.push( `rules.filterRail.displayStyles.${ k } must name a block` ) );
		f.ownAlternativeBelow && ( ! /^sgs_\w+$/.test( f.ownAlternativeBelow.setting || '' ) || 'theme-mod' !== f.ownAlternativeBelow.scope ) && problems.push( 'rules.filterRail.ownAlternativeBelow must name an sgs_ theme option (setting) with scope theme-mod' );
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
		...( r.decorationDelivered?.kinds || [] ).map( ( k ) => [ `rules.decorationDelivered.${ k.id }`, k ] ),
		...[ 'typedDivider', 'homeLink', 'backToTop', 'mapEmbed' ].map( ( k ) => [ `rules.${ k }`, r[ k ] ] ), [ 'rules.backToTop.handlers', r.backToTop?.handlers ], [ 'rules.navigation.briefOnlyEntry', r.navigation?.briefOnlyEntry ] ];
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
