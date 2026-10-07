// Which instances one block's calibration page holds (FR-47-2): a default per fixture variant, then one marked
// instance per setting and marker, each carrying the preconditions its element needs to render, plus one instance
// per enum value of a setting with no css_property (discovery). Pure: no browser, no site.
import { markersFor, borderPartners, shadowPartners, defOf, types } from './calibrate-markers.mjs';

// How each setting state is reached before a marker is read (§3.2): 'hover' under a real mouse on the styled element;
// 'focus' by keyboard-visible focus on it; 'scroll' by scrolling the window past the header offset (the header script
// toggles is-header-scrolled); 'class' by adding the state's ancestor class (a shrunk header row sets
// is-header-shrunk on its ancestors); 'fixture' when the fixture renders the state at rest (an accordion item saved
// open, the first tab, a nav item linking to the page itself). A state with no entry is reported, never calibrated.
export const STATE_TRIGGERS = { hover: 'hover', focus: 'focus', 'focus-visible': 'focus', scrolled: 'scroll', shrunk: 'class', open: 'fixture', current: 'fixture' };
export const STATE_CLASSES = { shrunk: 'is-header-shrunk' };

// The trigger for a setting state (null = rest), or undefined when the state has none.
export const triggerFor = ( state ) => ( state ? STATE_TRIGGERS[ state ] : null );

const kebab = ( s ) => s.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();

// The element a hover or focus marker is applied to: the block's BEM element named by css_element, or the instance
// root (null) for the wrapper. The reader falls back to the root when the selector matches nothing.
export function stateTarget( block, row ) {
	const el = row.css_element;
	if ( ! el || /^(wrapper|root|block)$/.test( el ) ) {
		return null;
	}
	return `.${ block.replace( /^sgs\//, 'sgs-' ) }__${ kebab( el ) }`;
}

// A boolean "show/enable/has/use X" setting that is off by default and gates the element a setting styles: the
// longest stem the setting's name starts with (showBadge gates badgeColour, badgeTextColour).
function gatingToggle( attr, schema, current ) {
	let best = null;
	for ( const [ name, def ] of Object.entries( schema ) ) {
		const m = name.match( /^(show|enable|has|use)([A-Z]\w*)$/ );
		if ( ! m || ! types( def ).includes( 'boolean' ) || true === ( current[ name ] ?? def.default ) ) {
			continue;
		}
		const stem = m[ 2 ].charAt( 0 ).toLowerCase() + m[ 2 ].slice( 1 );
		if ( attr.startsWith( stem ) && attr !== stem && ( ! best || stem.length > best.stem.length ) ) {
			best = { name, stem };
		}
	}
	return best ? { [ best.name ]: true } : {};
}

// The attributes a setting's element needs before the setting can paint, from the framework's own data: its variant
// (blocks.variant_attr + variant_slots), the toggle gating it, its border partners, and a background image under an
// overlay. ctx: { variantAttr, variantSlots: [ { variant_value, unique_slot } ], image }.
export function preconditionsFor( row, schema, current = {}, ctx = {} ) {
	const out = {};
	// A text, presence or link setting paints no CSS property at all, so every property test reads an empty list.
	const properties = String( row.css_property ?? '' ).split( ',' ).map( ( p ) => p.trim() ).filter( Boolean );
	const first = properties[ 0 ] || '';
	const slot = ( ctx.variantSlots || [] ).find( ( s ) => s.unique_slot === row.attr_name );
	if ( slot && ctx.variantAttr && current[ ctx.variantAttr ] !== slot.variant_value ) {
		out[ ctx.variantAttr ] = slot.variant_value;
	}
	// A variant whose media renders only with an image (hero's split media is absent without splitMediaImageUrl) gets
	// the calibration image in that variant's own base image slots, so its media settings have an element to paint.
	if ( slot && ctx.image ) {
		for ( const s of ( ctx.variantSlots || [] ).filter( ( x ) => x.variant_value === slot.variant_value ) ) {
			const name = s.unique_slot;
			if ( ! schema[ name ] || ( current[ name ] ?? '' ) !== '' ) {
				continue;
			}
			if ( /ImageUrl$/.test( name ) ) {
				out[ name ] = ctx.image.url;
			} else if ( /ImageId$/.test( name ) ) {
				out[ name ] = ctx.image.id;
			}
		}
	}
	Object.assign( out, gatingToggle( row.attr_name, schema, current ) );
	Object.assign( out, borderPartners( row.attr_name, first, schema ) );
	Object.assign( out, shadowPartners( row.attr_name, first, schema ) );
	// A background image under an overlay or scrim, and under a setting that only shapes an image (its size, position,
	// attachment, repeat, origin, clip or blend): none of them paints on a block with no image.
	if ( ( /overlay|scrim/i.test( row.attr_name ) || IMAGE_SHAPING.test( row.attr_name ) || properties.some( ( p ) => IMAGE_SHAPING_PROPS.test( p ) ) ) && ctx.image && schema.backgroundImage && ! current.backgroundImage ) {
		out.backgroundImage = { ...ctx.image };
	}
	return out;
}

const IMAGE_SHAPING = /^background(Size|Position|Attachment|Repeat|Origin|Clip|Blend)/;
const IMAGE_SHAPING_PROPS = /^background-(size|position|attachment|repeat|origin|clip|blend-mode)$/;

const LAYOUT_PROPS = /^(flex-direction|flex-wrap|justify-content|align-items|align-content|grid-template-columns|grid-template-rows|gap|row-gap|column-gap)$/;
const LAYOUT_VALUES = [ 'flex', 'grid', 'row', 'stack', 'columns', 'inline', 'horizontal', 'carousel' ];

// The block's layout-mode settings: enums offering a flex or grid layout. A layout property paints only under its mode,
// so its markers are also tried under each other value of each mode setting.
export function layoutModes( schema, current = {} ) {
	return Object.entries( schema ).filter( ( [ , d ] ) => Array.isArray( d.enum ) && d.enum.some( ( v ) => LAYOUT_VALUES.includes( v ) ) )
		.map( ( [ name, d ] ) => ( { name, values: d.enum.filter( ( v ) => '' !== v && v !== ( current[ name ] ?? d.default ) ) } ) )
		.filter( ( m ) => m.values.length );
}

// Every instance for one block. rows: the block's routed settings; enumRows: its enum settings with no css_property.
// Returns { instances, noMarker }.
export function planInstances( block, { rows, enumRows = [], schema, snapshot, fixture, ctx = {} } ) {
	const variants = ( fixture.variants || [ {} ] ).map( ( v ) => ( { ...( fixture.attributes || {} ), ...v } ) );
	const instances = [];
	const noMarker = new Set();
	const addBase = ( vi, vattrs, base ) => {
		const baseKey = `${ vi }:${ JSON.stringify( base ) }`;
		if ( ! instances.some( ( i ) => i.isBase && i.baseKey === baseKey ) ) {
			instances.push( { key: `base-${ Object.keys( base ).join( '-' ) }-v${ vi }-${ instances.length }`, attrs: { ...vattrs, ...base }, variant: vi, isBase: true, baseKey } );
		}
		return baseKey;
	};
	variants.forEach( ( vattrs, vi ) => {
		instances.push( { key: `default-v${ vi }`, attrs: vattrs, variant: vi, isDefault: true } );
		for ( const row of rows ) {
			const ms = markersFor( row, schema, snapshot, vattrs, ctx );
			if ( ! ms.length ) {
				noMarker.add( row.attr_name );
			}
			const pre = preconditionsFor( row, schema, vattrs, ctx );
			const prop = row.css_property.split( ',' )[ 0 ].trim();
			const modes = LAYOUT_PROPS.test( prop ) ? layoutModes( schema, vattrs ) : [];
			// Each marker as written, then once more under each other layout mode of the block.
			const runs = [ { suffix: '', extra: {} }, ...modes.flatMap( ( m ) => m.values.map( ( v ) => ( { suffix: `-${ m.name }-${ v }`, extra: { [ m.name ]: v } } ) ) ) ];
			for ( const m of ms ) {
				for ( const run of runs ) {
					// A marker needing partners (preconditions, a mode, a companion width) is read against a baseline instance
					// of this variant carrying the same partners, one per distinct set.
					const base = { ...pre, ...run.extra, ...( m.base || {} ) };
					const baseKey = Object.keys( base ).length ? addBase( vi, vattrs, base ) : null;
					instances.push( {
						key: `${ row.attr_name }-${ m.label }${ run.suffix }-v${ vi }`,
						row,
						marker: m,
						attrs: { ...vattrs, ...base, ...m.attrs },
						variant: vi,
						hover: 'hover' === row.css_state,
						trigger: triggerFor( row.css_state ),
						target: stateTarget( block, row ),
						stateClass: STATE_CLASSES[ row.css_state ] || null,
						baseKey,
					} );
				}
			}
		}
		// Enum settings with no css_property: one instance per value against the plain fixture (variant 0), to discover
		// what each value paints.
		for ( const row of vi ? [] : enumRows ) {
			const def = defOf( row, schema );
			for ( const v of JSON.parse( row.enum_values || '[]' ) ) {
				if ( v !== vattrs[ row.attr_name ] && v !== ( def.default ?? '' ) ) {
					// A per-device setting holds the value in its desktop tier (the smaller tiers inherit it).
					const held = 'tier_object' === row.tier_shape ? { desktop: v } : v;
					instances.push( { key: `${ row.attr_name }-discover-${ v || 'none' }-v${ vi }`, discover: { attr: row.attr_name, value: v, tier: row.tier_shape || null }, attrs: { ...vattrs, [ row.attr_name ]: held }, variant: vi } );
				}
			}
		}
	} );
	return { instances, noMarker };
}
