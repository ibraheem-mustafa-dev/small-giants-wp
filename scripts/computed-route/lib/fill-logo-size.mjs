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
	const base = rows.find( ( r ) => 'width' === r.css_property && ! r.tier_shape && ! /(Tablet|Mobile)$/.test( r.attr_name ) && ( sibling( r.attr_name, 'tablet' ) || sibling( r.attr_name, 'mobile' ) ) );
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
		// Each device's px, kept only where it differs from the next wider device's.
		const tiers = {};
		let carried = null;
		for ( const [ tier, w ] of widths ) {
			const px = Math.round( w );
			if ( px !== carried ) {
				tiers[ tier ] = px;
				carried = px;
			}
		}
		const node = flat[ rec.index ];
		const put = ( attr, value, merge ) => {
			const { before, after } = setAttr( node, { attr, value, merge } );
			out.writes.push( { node: row.node, index: rec.index, block: rec.name, slot: '', prop: 'width', attr, before, after, widths: TIERS.map( ( [ w ] ) => w ), how: 'logo-size' } );
		};
		if ( settings.max ) {
			put( settings.max, Object.fromEntries( Object.entries( tiers ).map( ( [ t, px ] ) => [ t, `${ px }px` ] ) ), 'deep' );
		} else {
			const named = { desktop: settings.width, tablet: settings.tablet, mobile: settings.mobile };
			Object.entries( tiers ).filter( ( [ t ] ) => named[ t ] ).forEach( ( [ t, px ] ) => put( named[ t ], px, 'replace' ) );
		}
		out.answered.push( answer( row, read.map( ( [ w ] ) => w ) ) );
		const where = settings.max ? `${ settings.max } (the per-device size) because ${ settings.width } holds one value for every width` : `${ [ settings.width, settings.tablet, settings.mobile ].filter( Boolean ).join( ', ' ) } (the per-device widths)`;
		out.notes.push( `${ row.node } ${ rec.name }: the draft logo is ${ widths.map( ( [ tier, w ] ) => `${ Math.round( w ) }px at ${ tier }` ).join( ', ' ) }; written as ${ where }` );
	}
	out.unmapped = regroup( out.unmapped );
	return out;
}
