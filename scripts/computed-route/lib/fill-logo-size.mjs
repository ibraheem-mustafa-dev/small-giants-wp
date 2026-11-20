// A logo's size per device for Fill (FR-48-39/FR-48-8). A draft logo whose width changes with the screen (the footer logo
// 200px on mobile) cannot go in one width for every screen, so the generic resolver names a one-value-every-width gap
// (lib/resolve.mjs::ONE_VALUE_EVERY_WIDTH): the numeric per-device siblings (`width`, `widthTablet`, `widthMobile`) carry no
// tier shape in the framework DB, so the resolver cannot write them. This pass turns that gap into the block's per-device
// size, read from the width the draft paints at 1440, 768 and 375:
//   - a block whose width setting has numeric `<name>Tablet` / `<name>Mobile` siblings painting `width` takes the desktop px
//     in the width setting and a smaller screen's px in its sibling only where it differs from the next wider screen (an
//     unset device keeps the one above it, as the block prints them);
//   - a block with one unresponsive width and a tier-object `max-width` takes the per-device ceiling (`maxWidth`).
// Which blocks have either shape comes from the framework DB, never from a list of blocks.
// A row naming several nodes (`nodes`) is written on each. Returns { writes, unmapped (the rows left), answered
// (lib/fill-regap.mjs::answer: each row written, with the read widths it answers), notes }.
import { setAttr } from './tree.mjs';
import { perNode, regroup, answer } from './fill-regap.mjs';
import { ONE_VALUE_EVERY_WIDTH } from './resolve.mjs';

const TIERS = [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ];
const SIBLING = { tablet: 'Tablet', mobile: 'Mobile' };

// The setting names a block has for a logo's size: { width, tablet, mobile } (per-device numeric siblings), { width, max }
// (one width and a per-device ceiling), or null.
export function logoSizeSettings( db, block ) {
	const rows = db.prepare( "SELECT attr_name, css_property, is_responsive, tier_shape FROM block_attributes WHERE block_slug = ? AND css_property IN ('width', 'max-width')" ).all( block );
	const byName = new Map( rows.map( ( r ) => [ r.attr_name, r ] ) );
	const sibling = ( base, tier ) => ( 'width' === byName.get( `${ base }${ SIBLING[ tier ] }` )?.css_property ? `${ base }${ SIBLING[ tier ] }` : null );
	// The base is a width that is no tier object or box: unclassified, or flat_sibling once the seeder marks a numeric Tablet/Mobile family.
	const base = rows.find( ( r ) => 'width' === r.css_property && ( ! r.tier_shape || 'flat_sibling' === r.tier_shape ) && ! /(Tablet|Mobile)$/.test( r.attr_name ) && ( sibling( r.attr_name, 'tablet' ) || sibling( r.attr_name, 'mobile' ) ) );
	if ( base ) {
		return { width: base.attr_name, tablet: sibling( base.attr_name, 'tablet' ), mobile: sibling( base.attr_name, 'mobile' ) };
	}
	const width = rows.find( ( r ) => 'width' === r.css_property && ! r.is_responsive );
	const max = rows.find( ( r ) => 'max-width' === r.css_property && r.is_responsive && 'tier_object' === r.tier_shape );
	if ( ! width || ! max ) {
		return null;
	}
	return { width: width.attr_name, max: max.attr_name };
}

export function logoSizeWrites( { nodes, flat, refOf, reads, db, unmapped } ) {
	const out = { writes: [], unmapped: [], answered: [], notes: [] };
	for ( const row of perNode( unmapped ) ) {
		const rec = 'width' === row.property && ONE_VALUE_EVERY_WIDTH === row.code && '' === ( row.slot ?? '' ) ? nodes.find( ( n ) => refOf( flat[ n.index ] ) === row.node ) : null;
		const settings = rec ? logoSizeSettings( db, rec.name ) : null;
		const target = rec?.targets.find( ( t ) => '' === t.slot );
		const read = target ? TIERS.filter( ( [ w ] ) => Number.isFinite( reads.widths?.[ w ]?.[ target.id ]?.rect?.w ) && reads.widths[ w ][ target.id ].rect.w > 0 ) : [];
		const widths = read.map( ( [ w, tier ] ) => [ tier, reads.widths[ w ][ target.id ].rect.w ] );
		if ( ! settings || ! widths.length ) {
			out.unmapped.push( row );
			continue;
		}
		const node = flat[ rec.index ];
		const written = [];
		const put = ( attr, value, merge ) => {
			const { before, after } = setAttr( node, { attr, value, merge } );
			written.push( attr );
			out.writes.push( { node: row.node, index: rec.index, block: rec.name, slot: '', prop: 'width', attr, before, after, widths: TIERS.map( ( [ w ] ) => w ), how: 'logo-size' } );
		};
		const px = Object.fromEntries( widths.map( ( [ tier, w ] ) => [ tier, Math.round( w ) ] ) );
		if ( settings.max ) {
			// Each device's px in the ceiling, kept only where it differs from the next wider device's.
			const tiers = {};
			let carried = null;
			for ( const [ tier ] of widths ) {
				if ( px[ tier ] !== carried ) {
					tiers[ tier ] = `${ px[ tier ] }px`;
					carried = px[ tier ];
				}
			}
			put( settings.max, tiers, 'deep' );
		} else {
			// The desktop px in the width setting; a smaller device's px in its sibling where it differs from the value it would
			// inherit (the last one written), and a sibling the node holds that equals it removed, so it cannot override the
			// inheritance. A desktop width the read lacks, or a differing device with no sibling, leaves the row unanswered.
			const named = { desktop: settings.width, tablet: settings.tablet, mobile: settings.mobile };
			const plan = [];
			let inherited = px.desktop;
			let unwritable = undefined === inherited;
			for ( const tier of [ 'tablet', 'mobile' ] ) {
				if ( unwritable || undefined === px[ tier ] ) {
					continue;
				}
				if ( px[ tier ] !== inherited ) {
					named[ tier ] ? plan.push( [ named[ tier ], px[ tier ] ] ) : ( unwritable = true );
					inherited = px[ tier ];
				} else if ( named[ tier ] && undefined !== node.attributes?.[ named[ tier ] ] ) {
					plan.push( [ named[ tier ], undefined ] );
				}
			}
			if ( unwritable ) {
				out.unmapped.push( row );
				continue;
			}
			put( named.desktop, px.desktop, 'replace' );
			for ( const [ attr, value ] of plan ) {
				if ( undefined === value ) {
					const before = node.attributes[ attr ];
					delete node.attributes[ attr ];
					written.push( `${ attr } (removed)` );
					out.writes.push( { node: row.node, index: rec.index, block: rec.name, slot: '', prop: 'width', attr, before, after: undefined, widths: TIERS.map( ( [ w ] ) => w ), how: 'logo-size' } );
				} else {
					put( attr, value, 'replace' );
				}
			}
		}
		out.answered.push( answer( row, read.map( ( [ w ] ) => w ) ) );
		const where = settings.max ? `${ settings.max } (the per-device size) because ${ settings.width } holds one value for every width` : `${ written.join( ', ' ) } (the per-device widths)`;
		out.notes.push( `${ row.node } ${ rec.name }: the draft logo is ${ widths.map( ( [ tier, w ] ) => `${ Math.round( w ) }px at ${ tier }` ).join( ', ' ) }; written as ${ where }` );
	}
	out.unmapped = regroup( out.unmapped );
	return out;
}
