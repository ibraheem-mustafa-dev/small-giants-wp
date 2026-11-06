// The drawer family's plain settings, written beside (never inside) sgsMotion. The framework DB gives each attribute's type
// and enum (block_attributes); the draft's css-transition records give the values. The mapping from a record's animated
// property to the attribute that times it has no css_property column to route on (the attribute times a section's height, not
// `grid-template-rows`), so the three names are held here and written only where the DB lists the attribute on the block:
//   - an expander's turn (`transform` on a state-bound rotate):   submenuCaretTurnDuration, submenuCaretTurnEasing
//   - a section's growth (`grid-template-rows`):                  submenuAnimation 'height', submenuAnimationDuration, submenuAnimationEasing
//   - a section's closing (`visibility`, the exit of the growth): submenuExitDuration
// and a drawer close button whose hover record sets no opacity switches the block's hover fade off (closeHoverOpacity 1).
import { easingOf } from './motion-tokens.mjs';

// Every SGS setting of a block, with or without a css_property (an enum like submenuAnimation has none).
const attrsFor = ( db, block ) => db.prepare( "SELECT attr_name, default_value, enum_values FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' )" ).all( block ).map( ( r ) => ( { ...r } ) );

const num = ( v ) => ( 'number' === typeof v ? v : Number.parseFloat( v ) );
const has = ( rows, name ) => rows.find( ( r ) => r.attr_name === name );

// The enum value (or 'custom' and the curve) a curve is: a client token whose curve equals it, else a shared keyword.
export function easingChoice( curve, row, tokens ) {
	const want = easingOf( curve );
	const enums = JSON.parse( row?.enum_values || '[]' );
	if ( ! want || ! enums.length ) {
		return null;
	}
	const named = [ ...enums.filter( ( n ) => 'default' !== n ), 'default' ].find( ( n ) => enums.includes( n ) && ! [ 'custom', '' ].includes( n ) && easingOf( tokens?.[ `easing.${ n }` ] ) === want ) ?? enums.find( ( n ) => easingOf( n ) === want );
	return named ? { value: named } : ( enums.includes( 'custom' ) ? { value: 'custom', custom: curve } : null );
}

const first = ( recs, test ) => recs.find( ( r ) => 'css-transition' === r.mechanism && ( r.properties || [] ).some( test ) );
const prop = ( r ) => r.properties[ 0 ];

// { writes, why, ids } the menu's settings want, or a no-setting item.
export function menuSettings( { block, saved, db, tokens, reachRecs } ) {
	const rows = attrsFor( db, block );
	const items = [];
	const writes = [];
	const whys = [];
	const ids = [];
	const want = ( name, value, why, rec ) => {
		if ( ! has( rows, name ) ) {
			items.push( { status: 'no-setting', prop: name, why: `${ block } has no ${ name } setting (framework DB)` } );
		} else if ( saved[ name ] === value || ( undefined === saved[ name ] && String( has( rows, name ).default_value ).replace( /"/g, '' ) === String( value ) ) ) {
			items.push( { status: 'equal', prop: name, why: `${ name } already ${ value }` } );
		} else {
			writes.push( { attr: name, value } );
			whys.push( why );
			ids.push( rec.id );
		}
	};
	const easing = ( name, curve, rec ) => {
		const row = has( rows, name );
		const e = row ? easingChoice( curve, row, tokens ) : null;
		if ( ! e ) {
			items.push( { status: 'no-setting', prop: name, why: `${ rec.id } eases ${ curve }, which the ${ name } list has no entry or custom curve for` } );
			return;
		}
		want( name, e.value, `${ name } ${ e.value } (${ curve })`, rec );
		e.custom && want( `${ name }Custom`, e.custom, `${ name }Custom ${ e.custom }`, rec );
	};
	const caret = first( reachRecs, ( p ) => 'transform' === p.property && /rotate/i.test( String( p.from ?? '' ) ) );
	if ( caret ) {
		want( 'submenuCaretTurnDuration', num( caret.duration_ms ), `expander turn ${ caret.duration_ms }ms`, caret );
		easing( 'submenuCaretTurnEasing', prop( caret ).easing ?? caret.easing, caret );
	}
	const grow = first( reachRecs, ( p ) => 'grid-template-rows' === p.property );
	if ( grow ) {
		want( 'submenuAnimation', 'height', 'sections grow in height', grow );
		want( 'submenuAnimationDuration', num( grow.duration_ms ), `section growth ${ grow.duration_ms }ms`, grow );
		easing( 'submenuAnimationEasing', prop( grow ).easing ?? grow.easing, grow );
	}
	const exit = first( reachRecs, ( p ) => 'visibility' === p.property );
	if ( exit ) {
		want( 'submenuExitDuration', num( exit.duration_ms ), `section close ${ exit.duration_ms }ms`, exit );
	}
	return { items, writes, whys, ids };
}

// The close button's hover fade: a hover record on the drawer's close part that sets no opacity keeps the button fully opaque.
export function closeFade( { block, saved, db, hoverRecord } ) {
	const row = has( attrsFor( db, block ), 'closeHoverOpacity' );
	if ( ! row || ! hoverRecord ) {
		return null;
	}
	if ( ( hoverRecord.properties || [] ).some( ( p ) => 'opacity' === p.property ) ) {
		return null;
	}
	const now = saved.closeHoverOpacity ?? Number( row.default_value );
	return 1 === now ? { status: 'equal', prop: 'closeHoverOpacity', why: 'the close button already keeps its opacity on hover' } : { write: { attr: 'closeHoverOpacity', value: 1 }, why: `${ hoverRecord.id } sets no hover opacity, so the ${ now } fade is off`, id: hoverRecord.id };
}
