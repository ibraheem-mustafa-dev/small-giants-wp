// The theme's shop options (Spec 48 FR-48-61): the `sgs_shop_*` theme mods the theme's shop template reads
// (theme/sgs-theme/inc/shop-*.php: the count's words, the sort menu, the filter panel, the drawer's words and width), set
// from what the shop draft draws. They are site options, not block settings, so neither Fill nor part-look can reach them;
// this step of the site build (`site-build.mjs --shop-options`, and a whole build after its phases) decides each from the
// shop surface's artefacts and writes it with set_theme_mod, the way the catalogue step writes the on-off filter
// (lib/site-build-catalogue-toggle.mjs). `data/shop-options.json` lists every option with the reader that decides it, or
// why the step never writes it.
//   - The artefacts: the surfaces.json entry building the shop template (target.template archive-product), its skeleton
//     inventory and proposal (skeleton/<surface>.inventory.json, .proposal.json: the commerce region, the placed filter rail,
//     the template pieces), its filled tree (trees/template/archive-product.json, else the entry's tree), and the draft's
//     template and logic.
//   - Every node of the filled tree carrying `ownAlternativeBelow` with scope `theme-mod` and a numeric `value` (the rail's
//     drawer threshold, written by Fill's width gate) gives that value to the theme mod it names; a node with no value is
//     reported, never guessed.
//   - Each reader returns { value, evidence } or { why } (not decided, reported).
//   - A value the site already holds that differs is never overwritten: it is a note, as the catalogue toggle does.
// Pure apart from runShopOptions and readShopArtefacts (files and the site's PHP runner).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventoryIndex, holesOf } from './template-piece-draft.mjs';
import { logicOf, valuesOf } from './shop-parts-logic.mjs';
import { parseTemplate } from './shop-parts-read.mjs';
import { copyFile } from './template-copies.mjs';
import { sortOptionsOf } from './template-piece-shop-sort.mjs';
import { productFieldsOf } from './template-pieces-context.mjs';
import { toggleFacet } from './site-build-catalogue-toggle.mjs';
import { loadCatalogue } from './catalogue-read.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const SHOP_OPTIONS = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'shop-options.json' ), 'utf8' ) ).options;
const WIDE = 1440;
const PHONE = 375;
const RRP_META = '_sgs_rrp';
const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const shownAt = ( e, w ) => Boolean( e?.visible?.[ w ] );
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const styleOf = ( e, prop ) => new RegExp( `(?:^|;)\\s*${ prop }\\s*:\\s*([^;]+)`, 'i' ).exec( e?.attrs?.style || '' )?.[ 1 ]?.trim() ?? null;
const px = ( v ) => ( /^-?\d+(?:\.\d+)?px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : null );
const AMOUNT = /[£$€]\s?(\d[\d,]*)(\.\d{1,2})?/g;

// The shop surface's artefacts for a client: { entry, key, inventory, proposal, tree, source, catalogue } (each null when its
// file is absent), or null when no surfaces.json entry builds the shop template.
export function readShopArtefacts( { repo, client } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const json = ( f ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null );
	const surfaces = json( path.join( build, 'surfaces.json' ) ) || {};
	const key = Object.keys( surfaces ).find( ( k ) => 'archive-product' === surfaces[ k ]?.target?.template );
	if ( ! key ) {
		return null;
	}
	const entry = surfaces[ key ];
	const folder = entry.draftDir ? path.resolve( repo, entry.draftDir ) : path.join( repo, 'sites', client, 'handoff' );
	const draft = entry.draftIndex ? path.join( folder, entry.draftIndex ) : null;
	return {
		entry, key,
		inventory: json( path.join( build, 'skeleton', `${ key }.inventory.json` ) ),
		proposal: json( path.join( build, 'skeleton', `${ key }.proposal.json` ) ),
		tree: json( copyFile( build, 'archive-product' ) ) || ( entry.tree ? json( path.join( build, entry.tree ) ) : null ),
		source: draft && fs.existsSync( draft ) ? fs.readFileSync( draft, 'utf8' ) : null,
		productFields: productFieldsOf( folder ),
		catalogue: loadCatalogue( repo, client ),
	};
}

// The theme mods every node marked ownAlternativeBelow (scope theme-mod) gives: { set: { mod: { value, evidence } }, unread: [ { option, why } ] }.
export function ownAlternatives( tree ) {
	const set = {};
	const unread = [];
	const walk = ( list ) => ( list || [] ).forEach( ( n ) => {
		const m = n.ownAlternativeBelow;
		if ( m && 'theme-mod' === m.scope && /^sgs_\w+$/.test( m.setting || '' ) ) {
			if ( 'number' === typeof m.value && Number.isFinite( m.value ) && m.value > 0 ) {
				set[ m.setting ] = { value: Math.round( m.value ), evidence: `${ n.name } swaps for its own alternative below ${ m.value }px (ownAlternativeBelow.value, the draft's threshold read by Fill)` };
			} else {
				unread.push( { option: m.setting, why: `${ n.name } is marked ownAlternativeBelow but Fill named no threshold (no value), so the theme keeps its default` } );
			}
		}
		walk( n.innerBlocks );
	} );
	walk( tree );
	return { set, unread };
}

// The evidence every reader reads, built once from the artefacts.
export function shopEvidence( a ) {
	const inventory = a.inventory || { elements: [] };
	const index = inventoryIndex( inventory );
	const proposal = a.proposal || {};
	const L = a.source ? logicOf( a.source ) : null;
	const template = a.source ? parseTemplate( a.source ) : null;
	const listingKey = proposal.commerceRegion?.key || null;
	const listing = listingKey ? index.byKey.get( listingKey ) : null;
	const inListing = ( e ) => Boolean( listing ) && index.chain( e.key ).includes( listing.key );
	const railKey = proposal.filterRail?.key || null;
	const rail = railKey ? index.byKey.get( railKey ) : null;
	const placed = proposal.templatePieces?.placed || [];
	const countKey = placed.find( ( p ) => 'woocommerce/product-results-count' === p.block )?.run?.[ 0 ] || null;
	const count = countKey ? index.byKey.get( countKey ) : null;
	return { ...a, index, proposal, L, template, listing, inListing, rail, count, toggle: proposal.filterRail?.toggle ? index.byKey.get( proposal.filterRail.toggle ) : null };
}

// The count's wording with %d for the number: { words, number } or null when its words hold no single number.
const countWording = ( count ) => {
	const words = squash( count?.words );
	const nums = words.match( /\d+/g ) || [];
	return 1 === nums.length ? { words: words.replace( /\d+/, '%d' ), number: Number( nums[ 0 ] ) } : null;
};

// The one-product branch of the count's hole: { one, many } (the words for one and for several), or null.
function countBranch( ev ) {
	const hole = holesOf( ev.count?.srcOwnText )[ 0 ];
	if ( ! ev.L || ! hole ) {
		return null;
	}
	const isOne = ( n ) => 'NumericLiteral' === n?.type && 1 === n.value;
	const isLength = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'length' === n.property?.name;
	for ( const v of valuesOf( ev.L, hole ) ) {
		const hit = ev.L.all.find( ( n ) => 'ConditionalExpression' === n.type && n.start >= v.start && n.end <= v.end && 'BinaryExpression' === n.test?.type && /^[!=]==?$/.test( n.test.operator ) &&
			( ( isOne( n.test.left ) && isLength( n.test.right ) ) || ( isOne( n.test.right ) && isLength( n.test.left ) ) ) && 'StringLiteral' === n.consequent?.type && 'StringLiteral' === n.alternate?.type );
		if ( hit ) {
			return hit.test.operator.startsWith( '=' ) ? { one: hit.consequent.value, many: hit.alternate.value } : { one: hit.alternate.value, many: hit.consequent.value };
		}
	}
	return null;
}

// The template element of an inventory element (the draft's own template, by its stamp), or null.
const templateNode = ( ev, e ) => {
	if ( ! ev.template || null == e?.tpl ) {
		return null;
	}
	const find = ( n ) => {
		for ( const c of n.children || [] ) {
			if ( c.tag && c.tpl === e.tpl ) {
				return c;
			}
			const hit = c.tag ? find( c ) : null;
			if ( hit ) {
				return hit;
			}
		}
		return null;
	};
	return find( ev.template );
};
const textOf = ( n ) => squash( ( n.children || [] ).map( ( c ) => ( c.tag ? textOf( c ) : c.text ) ).join( ' ' ) );
const allEls = ( n ) => ( n.children || [] ).filter( ( c ) => c.tag ).flatMap( ( c ) => [ c, ...allEls( c ) ] );

// The rail's drawer buttons: { apply, clear } template elements, apply carrying the count's hole in its words, clear the one other
// button beside it; null when the rail's template holds no such button.
function drawerButtons( ev ) {
	const railNode = templateNode( ev, ev.rail );
	const hole = holesOf( ev.count?.srcOwnText )[ 0 ];
	if ( ! railNode || ! hole ) {
		return null;
	}
	const applies = allEls( railNode ).filter( ( b ) => 'button' === b.tag && holesOf( textOf( b ) ).includes( hole ) );
	if ( 1 !== applies.length ) {
		return null;
	}
	const apply = applies[ 0 ];
	const others = ( apply.parent.children || [] ).filter( ( c ) => c !== apply && 'button' === c.tag );
	return { apply, clear: 1 === others.length ? others[ 0 ] : null };
}
const caps = ( n ) => /text-transform\s*:\s*uppercase/i.test( n?.attrs?.style || '' );

// The sort select outside the listing and its options mapped to the orders the theme offers.
function sortOf( ev ) {
	const selects = ev.index.elements.filter( ( e ) => 'select' === e.tag && shown( e ) && ! ev.inListing( e ) );
	return 1 === selects.length ? { select: selects[ 0 ], options: sortOptionsOf( { index: ev.index, select: selects[ 0 ], L: ev.L, fields: ev.productFields || {} } ) } : null;
}

const no = ( why ) => ( { why } );
const yes = ( value, evidence ) => ( { value, evidence } );

export const READERS = {
	countLabel: ( ev ) => {
		const w = countWording( ev.count );
		return w ? yes( w.words, `the listing's count reads "${ squash( ev.count.words ) }" (${ ev.count.key })` ) : no( ev.count ? `the listing's count "${ squash( ev.count.words ) }" holds no single number` : 'the draft shows no count of the listing (no results-count piece was placed)' );
	},
	countLabelSingle: ( ev ) => {
		const w = countWording( ev.count );
		const b = w ? countBranch( ev ) : null;
		if ( ! b ) {
			return no( w ? 'the count\'s logic has no one-product wording (no choice on the list length being 1)' : 'the draft shows no count of the listing' );
		}
		const at = w.words.lastIndexOf( squash( b.many ) );
		return at < 0 || ! squash( b.many ) ? no( `the count's one-product words "${ b.one }" do not stand in its wording "${ w.words }"` ) : yes( squash( `${ w.words.slice( 0, at ) }${ squash( b.one ) }${ w.words.slice( at + squash( b.many ).length ) }` ), `the count's logic gives "${ squash( b.one ) }" for one product and "${ squash( b.many ) }" for more` );
	},
	sortMenu: ( ev ) => {
		const s = sortOf( ev );
		if ( ! s?.options.length ) {
			return no( s ? 'the sort select has no options' : 'the draft shows no one sort select outside the listing' );
		}
		const unknown = s.options.filter( ( o ) => ! o.order );
		if ( unknown.length ) {
			return no( `the draft's sort option(s) ${ unknown.map( ( o ) => `"${ o.words }"` ).join( ', ' ) } order in a way neither WooCommerce nor the theme offers, so the menu is left as WooCommerce's` );
		}
		return yes( s.options.map( ( o ) => `${ o.order }|${ o.words }` ).join( '\n' ), `the draft's sort select ${ s.select.key } offers ${ s.options.map( ( o ) => `"${ o.words }" (${ o.order })` ).join( ', ' ) }` );
	},
	sortSaving: ( ev ) => {
		const s = sortOf( ev );
		return s?.options.some( ( o ) => 'sgs_biggest_saving' === o.order ) ? yes( true, 'a draft sort option orders by the saving downwards' ) : no( 'no draft sort option orders by the saving' );
	},
	sortSavingKey: ( ev ) => {
		const s = sortOf( ev );
		return s?.options.some( ( o ) => 'sgs_biggest_saving' === o.order ) ? yes( RRP_META, 'the saving order reads the recommended price the catalogue step stores' ) : no( 'no draft sort option orders by the saving' );
	},
	sortBrand: ( ev ) => {
		const s = sortOf( ev );
		return s?.options.some( ( o ) => 'sgs_brand_az' === o.order ) ? yes( true, 'a draft sort option orders by the brand as text' ) : no( 'no draft sort option orders by the brand' );
	},
	wholeAmounts: ( ev ) => {
		const words = ev.index.elements.filter( ( e ) => ev.inListing( e ) && shown( e ) && ! ev.index.children( e.key ).length ).map( ( e ) => String( e.words || '' ) );
		const found = words.flatMap( ( w ) => [ ...w.matchAll( AMOUNT ) ] );
		if ( ! found.length ) {
			return no( 'the listing shows no price' );
		}
		const zero = found.filter( ( m ) => '.00' === m[ 2 ] );
		const bare = found.filter( ( m ) => ! m[ 2 ] );
		if ( zero.length && bare.length ) {
			return no( `the listing prints whole amounts both ways ("${ zero[ 0 ][ 0 ] }" and "${ bare[ 0 ][ 0 ] }")` );
		}
		return zero.length ? yes( false, `the listing prints a whole amount with pence ("${ zero[ 0 ][ 0 ] }")` ) : bare.length ? yes( true, `the listing prints a whole amount with no pence ("${ bare[ 0 ][ 0 ] }")` ) : no( 'the listing shows no whole amount' );
	},
	drawerApply: ( ev ) => {
		const d = drawerButtons( ev );
		return d ? yes( true, `the drawer's apply button reads "${ textOf( d.apply ) }"` ) : no( ev.rail ? 'the rail holds no one button carrying the listing\'s count' : 'the draft has no filter rail' );
	},
	drawerApplyLabel: ( ev ) => {
		const d = drawerButtons( ev );
		const w = countWording( ev.count );
		if ( ! d || ! w ) {
			return no( ev.rail ? 'the rail holds no one button carrying the listing\'s count' : 'the draft has no filter rail' );
		}
		const hole = holesOf( ev.count.srcOwnText )[ 0 ];
		return yes( squash( textOf( d.apply ).replace( new RegExp( `\\{\\{\\s*${ hole.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\s*\\}\\}` ), w.words ) ), `the drawer's apply button reads "${ textOf( d.apply ) }", the count reading "${ w.words }"` );
	},
	drawerClear: ( ev ) => {
		const d = drawerButtons( ev );
		const words = d?.clear ? textOf( d.clear ) : '';
		return words && ! holesOf( words ).length ? yes( words, `the button beside the drawer's apply button reads "${ words }"` ) : no( d ? 'the drawer\'s apply button has no one plain-worded button beside it' : 'the rail holds no drawer apply button' );
	},
	drawerCaps: ( ev ) => {
		const d = drawerButtons( ev );
		if ( ! d?.clear ) {
			return no( 'the rail holds no drawer apply and clear buttons' );
		}
		return caps( d.apply ) === caps( d.clear ) ? yes( caps( d.apply ), `the drawer's buttons draw their words ${ caps( d.apply ) ? 'in capitals' : 'as written' }` ) : no( 'the drawer\'s two buttons differ in capitals' );
	},
	panelStyle: ( ev ) => {
		if ( ! ev.rail ) {
			return no( 'the draft has no filter rail' );
		}
		const bg = styleOf( ev.rail, 'background(?:-color)?' );
		const border = styleOf( ev.rail, 'border(?:-width)?' );
		const clear = ( v ) => null == v || /^(transparent|none|rgba\(0,\s*0,\s*0,\s*0\))$/i.test( v ) || /^0(px)?\b/.test( v );
		return yes( clear( bg ) && clear( border ) ? 'plain' : 'panel', `the rail's background is ${ bg ?? 'unset' } and its border ${ border ?? 'unset' }` );
	},
	desktopHeading: ( ev ) => {
		const groups = ev.proposal.filterRail?.groups || [];
		if ( ! ev.rail || ! groups.length ) {
			return no( 'the draft has no filter rail with placed groups' );
		}
		const words = ev.index.elements.filter( ( e ) => shownAt( e, WIDE ) && ev.index.chain( e.key ).includes( ev.rail.key ) && squash( e.words ) && ! ev.index.children( e.key ).some( ( k ) => squash( ev.index.byKey.get( k )?.words ) ) );
		words.sort( ( x, y ) => ev.index.order( x.key ) - ev.index.order( y.key ) );
		if ( ! words.length ) {
			return no( 'the rail shows no words at the widest width' );
		}
		const first = groups[ 0 ];
		const inFirst = ev.index.chain( words[ 0 ].key ).includes( first.key );
		return yes( ! inFirst, inFirst ? `the rail's first words "${ squash( words[ 0 ].words ) }" are its first group's label: no heading above the groups` : `the rail shows "${ squash( words[ 0 ].words ) }" above its first group` );
	},
	railWidth: ( ev ) => {
		const w = ev.rail?.box?.[ WIDE ]?.w;
		return w ? yes( Math.round( w ), `the rail is ${ w }px wide at ${ WIDE }` ) : no( ev.rail ? `the rail is not shown at ${ WIDE }` : 'the draft has no filter rail' );
	},
	railGap: ( ev ) => {
		const r = ev.rail?.box?.[ WIDE ];
		const l = ev.listing?.box?.[ WIDE ];
		if ( ! r || ! l ) {
			return no( ev.rail ? 'the rail or the listing is not measured at the widest width' : 'the draft has no filter rail' );
		}
		const gap = Math.round( l.x - ( r.x + r.w ) );
		return gap >= 0 ? yes( gap, `the listing starts ${ gap }px after the rail's right edge at ${ WIDE }` ) : no( 'the listing does not sit to the right of the rail' );
	},
	toggleCount: ( ev ) => {
		if ( ! ev.toggle ) {
			return no( 'the draft has no filter button of its own' );
		}
		const holes = holesOf( ev.toggle.srcOwnText );
		return yes( holes.length > 0 && squash( String( ev.toggle.srcOwnText ).replace( /\{\{[^}]*\}\}/g, '' ) ).length > 0, `the filter button reads "${ squash( ev.toggle.srcOwnText ) }"` );
	},
	togglePlace: ( ev ) => {
		const t = ev.toggle?.box?.[ PHONE ];
		const s = sortOf( ev )?.select?.box?.[ PHONE ];
		const c = ev.count?.box?.[ PHONE ];
		if ( ! t || ! ( s || c ) ) {
			return no( ev.toggle ? 'the filter button, the count or the sort is not measured at the phone width' : 'the draft has no filter button of its own' );
		}
		const overlaps = ( a, b ) => a.y < b.y + b.h && b.y < a.y + a.h;
		const row = [ s, c ].filter( Boolean ).every( ( b ) => overlaps( t, b ) );
		return yes( row ? 'toolbar' : 'row', row ? `at ${ PHONE } the filter button shares a row with the ${ [ c && 'count', s && 'sort' ].filter( Boolean ).join( ' and ' ) }` : `at ${ PHONE } the filter button sits on its own row` );
	},
	stickyTrigger: ( ev ) => {
		if ( ! ev.toggle ) {
			return no( 'the draft has no filter button of its own' );
		}
		const chain = ev.index.chain( ev.toggle.key ).map( ( k ) => ev.index.byKey.get( k ) );
		const pinned = chain.some( ( e ) => [ 'fixed', 'sticky' ].includes( e?.position?.[ PHONE ] ) );
		return yes( pinned, pinned ? `the filter button is pinned at ${ PHONE }` : `the filter button stays in the flow at ${ PHONE }` );
	},
	booleanPosition: ( ev ) => {
		const facet = ev.catalogue ? toggleFacet( ev.catalogue ).facet : null;
		const groups = ev.proposal.filterRail?.groups || [];
		if ( ! facet || ! ev.rail || ! groups.length ) {
			return no( facet ? 'the draft has no filter rail with placed groups' : 'the catalogue has no on-off facet' );
		}
		const words = [ facet.toggleLabel, facet.label ].filter( Boolean ).map( squash );
		const parent = ev.index.byKey.get( groups[ 0 ].key )?.parentKey;
		const rows = ev.index.elements.filter( ( e ) => e.parentKey === parent && ! groups.some( ( g ) => g.key === e.key ) && words.some( ( w ) => squash( e.allText ).includes( w ) ) );
		if ( 1 !== rows.length ) {
			return no( `the rail holds ${ rows.length } rows naming the on-off facet "${ facet.label }"` );
		}
		const at = ev.index.order( rows[ 0 ].key );
		const orders = groups.map( ( g ) => ev.index.order( g.key ) );
		return at > Math.max( ...orders ) ? yes( 'bottom', `the on-off row ${ rows[ 0 ].key } follows every placed group` ) : at < Math.min( ...orders ) ? yes( 'top', `the on-off row ${ rows[ 0 ].key } comes before every placed group` ) : no( 'the on-off row sits between the rail\'s groups' );
	},
	sortSize: ( ev ) => {
		const s = sortOf( ev );
		const size = px( styleOf( s?.select, 'font-size' ) );
		return size ? yes( size, `the sort select's text is ${ size }px` ) : no( s ? 'the sort select states no px font size' : 'the draft shows no one sort select outside the listing' );
	},
};

// The decisions for the shop: { set: { mod: { value, evidence } }, unread: [ { option, why } ] }. `options`: data/shop-options.json's list.
export function decideShopOptions( artefacts, options = SHOP_OPTIONS ) {
	const ev = shopEvidence( artefacts );
	const own = ownAlternatives( artefacts.tree || [] );
	const set = { ...own.set };
	const unread = [ ...own.unread ];
	for ( const o of options ) {
		if ( 'ownAlternative' === o.read ) {
			! set[ o.option ] && ! unread.some( ( u ) => u.option === o.option ) && unread.push( { option: o.option, why: 'no node of the filled tree carries its ownAlternativeBelow mark (the draft has no filter rail, or the tree predates the mark)' } );
			continue;
		}
		if ( ! o.read ) {
			unread.push( { option: o.option, why: o.why } );
			continue;
		}
		const r = READERS[ o.read ]?.( ev );
		if ( ! r ) {
			unread.push( { option: o.option, why: `no reader "${ o.read }"` } );
		} else if ( 'why' in r ) {
			unread.push( { option: o.option, why: r.why } );
		} else {
			set[ o.option ] = { value: r.value, evidence: r.evidence };
		}
	}
	return { set, unread };
}

// The read of the site's values of the given theme mods.
export function shopOptionsStatePhp( mods ) {
	return `$in = json_decode( base64_decode( '${ b64( mods ) }' ), true );
$out = array();
foreach ( $in as $m ) { $out[ $m ] = get_theme_mod( $m, null ); }
echo wp_json_encode( array( 'mods' => (object) $out ) );`;
}

const blank = ( v ) => null == v || '' === v;
const same = ( a, b ) => ( 'boolean' === typeof b ? Boolean( a ) && ! [ '0', 'false', '' ].includes( String( a ) ) === b : String( a ) === String( b ) );

// The plan: { set: { mod: value }, exists: [ mod ], left: [ say ] } from the decisions and the site's values.
export function planShopOptions( decided, state ) {
	const mods = state?.mods || {};
	const out = { set: {}, exists: [], left: [] };
	for ( const [ m, d ] of Object.entries( decided.set ) ) {
		if ( blank( mods[ m ] ) ) {
			out.set[ m ] = d.value;
		} else if ( same( mods[ m ], d.value ) ) {
			out.exists.push( m );
		} else {
			out.left.push( `${ m } is ${ JSON.stringify( mods[ m ] ) } on the site, the draft's ${ JSON.stringify( d.value ) } (${ d.evidence }); it is left` );
		}
	}
	return out;
}

// The write: sets the planned theme mods.
export function shopOptionsApplyPhp( set ) {
	return `$set = json_decode( base64_decode( '${ b64( set ) }' ), true );
foreach ( $set as $m => $v ) { set_theme_mod( $m, $v ); }
echo wp_json_encode( array( 'set' => array_keys( $set ) ) );`;
}

const parse = ( text ) => JSON.parse( String( text ).slice( Math.max( 0, String( text ).indexOf( '{' ) ) ) );

// Runs the step: prints each decision and each option it cannot decide, and with `apply` writes the planned theme mods and reads
// them back. Returns the number of failures.
export function runShopOptions( { repo, client, runPhp, apply, log = console.log, error = console.error } ) {
	const artefacts = readShopArtefacts( { repo, client } );
	if ( ! artefacts ) {
		log( 'shop options: no surfaces.json entry builds the shop template, nothing to write' );
		return 0;
	}
	const decided = decideShopOptions( artefacts );
	const names = Object.keys( decided.set );
	log( `shop options (${ artefacts.key }): ${ names.length } decided by the draft, ${ decided.unread.length } not` );
	names.forEach( ( m ) => log( `  ${ m } = ${ JSON.stringify( decided.set[ m ].value ) }: ${ decided.set[ m ].evidence }` ) );
	decided.unread.forEach( ( u ) => log( `  not written: ${ u.option }: ${ u.why }` ) );
	if ( ! names.length ) {
		return 0;
	}
	const plan = planShopOptions( decided, parse( runPhp( shopOptionsStatePhp( names ) ) ) );
	plan.left.forEach( ( l ) => log( `note: ${ l }` ) );
	log( `  ${ Object.keys( plan.set ).length } to set, ${ plan.exists.length } already set, ${ plan.left.length } left` );
	if ( ! apply || ! Object.keys( plan.set ).length ) {
		return 0;
	}
	runPhp( shopOptionsApplyPhp( plan.set ) );
	const again = planShopOptions( decided, parse( runPhp( shopOptionsStatePhp( names ) ) ) );
	if ( Object.keys( again.set ).length ) {
		error( `FAILED: the shop options ${ Object.keys( again.set ).join( ', ' ) } are not set after the write` );
		return 1;
	}
	log( `  done: ${ Object.keys( plan.set ).length } shop option(s) set` );
	return 0;
}
