// Applier family: widths. A paired box whose max-width, grid fill or column count differs from the draft's is set through the
// block's own width settings, one value per device from the 1440, 768 and 375 reads. Widths are compared on the layout box
// (transform-free): an entrance's held scale shrinks a bounding box without moving the layout, so it is not a gutter
// difference. A width that differs only because an ancestor differs is a cascade, so it writes nothing of its own.
import { candidates, attrRow } from './db.mjs';
import { TIER_WIDTHS } from './fill-prop.mjs';

const TIER_OF = { [ TIER_WIDTHS[ 0 ] ]: 'desktop', [ TIER_WIDTHS[ 1 ] ]: 'tablet', [ TIER_WIDTHS[ 2 ] ]: 'mobile' };
const FILL = /^repeat\(s*(auto-fit|auto-fill)\s*,\s*minmax\(\s*([\d.]+px|\d+%)\s*,/;
const px = ( v ) => /^-?[\d.]+px$/.test( String( v ?? '' ).trim() );

export const fillOf = ( declared ) => {
	const m = FILL.exec( String( declared ?? '' ).trim() );
	return m ? { mode: m[ 1 ], min: m[ 2 ] } : null;
};
export const tracksOf = ( value ) => String( value ?? '' ).split( /\s+/ ).filter( ( t ) => /^[\d.]+px$/.test( t ) ).length;

// A track-count check for each width where the draft has tracks: the live grid must show as many.
const trackChecks = ( draft, widths ) => widths.filter( ( w ) => tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) ).map( ( w ) => ( { width: Number( w ), prop: 'grid-template-columns', tracks: tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) } ) );

// The saved tier object with each changed width's value set.
const tiered = ( saved, attr, byWidth ) => {
	const base = saved && 'object' === typeof saved[ attr ] ? { ...saved[ attr ] } : {};
	let wider;
	for ( const w of TIER_WIDTHS ) {
		if ( ! ( w in byWidth ) ) {
			wider = base[ TIER_OF[ w ] ] ?? wider;
			continue;
		}
		// A narrower tier inherits the wider one, so an equal value is left unset unless the block already holds that tier.
		if ( TIER_OF[ w ] in base || JSON.stringify( byWidth[ w ] ) !== JSON.stringify( wider ) ) {
			base[ TIER_OF[ w ] ] = byWidth[ w ];
		}
		wider = byWidth[ w ];
	}
	return base;
};

// The tier-shaped setting of a block that paints a property on its own box (the wrapper, else any).
const tierSetting = ( db, block, prop ) => {
	const rows = candidates( db, block, prop, null ).filter( ( r ) => 'tier_object' === r.tier_shape );
	return rows.find( ( r ) => 'wrapper' === r.css_element ) ?? rows[ 0 ] ?? null;
};

function maxWidth( { target, draft, live, saved, block, db, widths } ) {
	const apart = widths.filter( ( w ) => px( draft[ w ].styles[ 'max-width' ] ) && draft[ w ].styles[ 'max-width' ] !== live[ w ].styles[ 'max-width' ] );
	if ( ! apart.length ) {
		return [];
	}
	const setting = tierSetting( db, block, 'max-width' );
	if ( ! setting ) {
		return [ { status: 'no-setting', prop: 'max-width', why: `${ block } has no per-device max-width setting` } ];
	}
	const want = Object.fromEntries( apart.map( ( w ) => [ w, draft[ w ].styles[ 'max-width' ] ] ) );
	return [ {
		status: 'op',
		prop: 'max-width',
		why: `${ target.tpl } max-width ${ Object.values( want ).join( '/' ) }`,
		writes: [ { attr: setting.attr_name, value: tiered( saved, setting.attr_name, want ) } ],
		checks: apart.map( ( w ) => ( { width: Number( w ), prop: 'max-width', want: want[ w ] } ) ),
	} ];
}

function fill( { target, draft, live, saved, block, db, widths } ) {
	const at = widths.find( ( w ) => fillOf( draft[ w ].declared ) );
	if ( ! at ) {
		return [];
	}
	const { mode, min } = fillOf( draft[ at ].declared );
	if ( 'sgs/post-grid' === block ) {
		if ( 'auto-fill' !== mode ) {
			return [];
		}
		return saved.keepEmptyColumns ? [ { status: 'equal', prop: 'grid-fill', why: 'empty columns are kept' } ] : [ { status: 'op', prop: 'grid-fill', why: `${ target.tpl } keeps its empty tracks (auto-fill)`, writes: [ { attr: 'keepEmptyColumns', value: true } ] } ];
	}
	const setting = db && attrRow( db, block, 'minColumnWidth' );
	if ( ! setting ) {
		return [ { status: 'no-setting', prop: 'grid-fill', why: `${ block } has no column-fill setting` } ];
	}
	if ( '100%' === min ) {
		const one = { desktop: 1, tablet: 1, mobile: 1 };
		const held = Object.entries( one ).every( ( [ t, n ] ) => Number( saved.columns?.[ t ] ) === n );
		return held ? [ { status: 'equal', prop: 'grid-fill', why: 'one column at every width' } ] : [ { status: 'op', prop: 'grid-fill', why: `${ target.tpl } is one column at every width (a 100% track minimum)`, writes: [ { attr: 'columns', value: one } ], checks: trackChecks( draft, widths ) } ];
	}
	if ( ! px( min ) ) {
		return [ { status: 'no-setting', prop: 'grid-fill', why: `the draft's track minimum ${ min } is not a length` } ];
	}
	// `minColumnWidth` only feeds a block's intrinsic columns; the draft's own track list is what fills the row.
	const want = Object.fromEntries( widths.filter( ( w ) => fillOf( draft[ w ].declared ) ).map( ( w ) => {
		const f = fillOf( draft[ w ].declared );
		return [ TIER_OF[ w ], `repeat(${ f.mode }, minmax(${ f.min }, 1fr))` ];
	} ) );
	const have = saved.gridTemplateColumns ?? {};
	if ( Object.entries( want ).every( ( [ t, v ] ) => have[ t ] === v ) ) {
		return [ { status: 'equal', prop: 'grid-fill', why: 'the draft track list is set' } ];
	}
	return [ { status: 'op', prop: 'grid-fill', why: `${ target.tpl } fills by ${ mode } minmax(${ min })`, writes: [ { attr: 'gridTemplateColumns', value: want }, ...( saved.minColumnWidth ? [ { attr: 'minColumnWidth', unset: true } ] : [] ) ], checks: trackChecks( draft, widths ) } ];
}

// Top-level tokens of a track list: `40px minmax(0px, 1fr)` is two.
export function tokenCount( list ) {
	let depth = 0;
	let tokens = 0;
	let open = false;
	for ( const ch of String( list ?? '' ).trim() ) {
		depth += '(' === ch ? 1 : ')' === ch ? -1 : 0;
		if ( /\s/.test( ch ) && 0 === depth ) {
			open = false;
		} else if ( ! open ) {
			open = true;
			tokens++;
		}
	}
	return tokens;
}

// A grid whose draft states its tracks and whose live column count differs: the declared list goes to the block's track setting.
function tracks( { target, draft, live, saved, block, db, widths } ) {
	const apart = widths.filter( ( w ) => draft[ w ].declared && ! fillOf( draft[ w ].declared ) && tokenCount( draft[ w ].declared ) === tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) && tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) !== tracksOf( live[ w ].styles[ 'grid-template-columns' ] ) );
	if ( ! apart.length ) {
		return [];
	}
	const setting = tierSetting( db, block, 'grid-template-columns' );
	if ( ! setting ) {
		return [ { status: 'no-setting', prop: 'columns', why: `${ block } has no per-device track setting` } ];
	}
	const want = Object.fromEntries( apart.map( ( w ) => [ w, draft[ w ].declared ] ) );
	return [ { status: 'op', prop: 'columns', why: `${ target.tpl } lays out ${ Object.values( want ).join( ' | ' ) }`, writes: [ { attr: setting.attr_name, value: tiered( saved, setting.attr_name, want ) } ], checks: apart.map( ( w ) => trackChecks( draft, [ w ] )[ 0 ] ) } ];
}

function columns( { target, draft, live, saved, block, db, widths } ) {
	if ( 'sgs/gallery' !== block ) {
		return tracks( { target, draft, live, saved, block, db, widths } );
	}
	const apart = widths.filter( ( w ) => tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) && tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) !== tracksOf( live[ w ].styles[ 'grid-template-columns' ] ) );
	if ( ! apart.length ) {
		return [];
	}
	if ( ! attrRow( db, block, 'columns' ) ) {
		return [ { status: 'no-setting', prop: 'columns', why: `${ block } has no columns setting` } ];
	}
	const want = Object.fromEntries( apart.map( ( w ) => [ w, tracksOf( draft[ w ].styles[ 'grid-template-columns' ] ) ] ) );
	return [ { status: 'op', prop: 'columns', why: `${ target.tpl } shows ${ Object.values( want ).join( '/' ) } columns`, writes: [ { attr: 'columns', value: tiered( saved, 'columns', want ) } ], checks: apart.map( ( w ) => trackChecks( draft, [ w ] )[ 0 ] ) } ];
}

// A repeated set's size (lib/apply-read.mjs `items`): the gallery's tile height, the timeline's card width as a share of its track.
const size = ( f ) => f?.items ?? null;

function tileHeight( { target, draft, live, saved, block, widths } ) {
	if ( 'sgs/gallery' !== block ) {
		return [];
	}
	const apart = widths.filter( ( w ) => size( draft[ w ] ) && size( live[ w ] ) && Math.abs( size( draft[ w ] ).h - size( live[ w ] ).h ) > 1 );
	if ( ! apart.length ) {
		return [];
	}
	const want = Object.fromEntries( apart.map( ( w ) => [ w, `${ size( draft[ w ] ).h }px` ] ) );
	return [ { status: 'op', prop: 'tile-height', why: `${ target.tpl } tiles are ${ Object.values( want ).join( '/' ) } tall`, writes: [ { attr: 'tileMinHeight', value: tiered( saved, 'tileMinHeight', want ) } ], checks: apart.map( ( w ) => ( { width: Number( w ), items: 'h', want: want[ w ] } ) ) } ];
}

function cardWidth( { target, draft, live, saved, block, widths } ) {
	if ( 'sgs/timeline' !== block ) {
		return [];
	}
	const share = ( f ) => ( size( f ) && size( f ).parentW ? Math.round( ( size( f ).w / size( f ).parentW ) * 100 ) : null );
	const apart = widths.filter( ( w ) => null !== share( draft[ w ] ) && null !== share( live[ w ] ) && share( draft[ w ] ) < 100 && Math.abs( size( draft[ w ] ).w - size( live[ w ] ).w ) > 1 );
	if ( ! apart.length ) {
		return [];
	}
	const want = Object.fromEntries( apart.map( ( w ) => [ w, share( draft[ w ] ) ] ) );
	return [ { status: 'op', prop: 'card-width', why: `${ target.tpl } cards are ${ Object.values( want ).join('/') }% of the row`, writes: [ { attr: 'cardWidth', value: tiered( saved, 'cardWidth', want ) } ], checks: apart.map( ( w ) => ( { width: Number( w ), items: 'w', want: `${ size( draft[ w ] ).w }px` } ) ) } ];
}

// The pinned row of a timeline: its cap and side space are the timeline's own panel settings.
function panelRow( { target, draft, live, saved, block, widths } ) {
	if ( 'sgs/timeline' !== block ) {
		return [];
	}
	const apart = widths.filter( ( w ) => px( draft[ w ].styles[ 'max-width' ] ) && draft[ w ].styles[ 'max-width' ] !== live[ w ].styles[ 'max-width' ] );
	if ( ! apart.length ) {
		return [];
	}
	const cap = Object.fromEntries( apart.map( ( w ) => [ w, draft[ w ].styles[ 'max-width' ] ] ) );
	const gutter = Object.fromEntries( apart.filter( ( w ) => px( draft[ w ].styles[ 'padding-left' ] ) ).map( ( w ) => [ w, draft[ w ].styles[ 'padding-left' ] ] ) );
	const writes = [ { attr: 'panelContentMaxWidth', value: tiered( saved, 'panelContentMaxWidth', cap ) } ];
	if ( Object.keys( gutter ).length ) {
		writes.push( { attr: 'panelContentGutter', value: tiered( saved, 'panelContentGutter', gutter ) } );
	}
	return [ { status: 'op', prop: 'panel-width', why: `${ target.tpl } caps its pinned row at ${ Object.values( cap ).join( '/' ) }`, writes } ];
}

export const width = {
	name: 'width',
	props: [ 'max-width', 'grid-template-columns', 'padding-left' ],
	decide( ctx ) {
		const widths = Object.keys( ctx.draft ).filter( ( w ) => ctx.draft[ w ] && ctx.live[ w ] && TIER_OF[ w ] );
		if ( ! widths.length ) {
			return [];
		}
		const items = [ ...( 'sgs/timeline' === ctx.block ? panelRow( { ...ctx, widths } ) : maxWidth( { ...ctx, widths } ) ), ...fill( { ...ctx, widths } ), ...columns( { ...ctx, widths } ), ...tileHeight( { ...ctx, widths } ), ...cardWidth( { ...ctx, widths } ) ];
		return items;
	},
};
