// A logo's size per device for Fill (FR-48-39/FR-48-8): a logo block holds one desktop width (`width`, a number for every
// width) and a per-device ceiling (`maxWidth`, a tier object with its unit in `maxWidthUnit`). A draft logo whose width
// changes with the screen (the footer logo 200px on mobile) cannot go in the single width, so the generic resolver names a
// one-value-every-width gap (lib/resolve.mjs::ONE_VALUE_EVERY_WIDTH); this pass turns that gap into the per-device ceiling, read from the width the
// draft paints at 1440, 768 and 375. Which blocks have the pair comes from the framework DB (a block with an unresponsive
// `width` setting and a tier-object `max-width` setting), never from a list of blocks.
// Returns { writes, unmapped (the rows left), notes }.
import { setAttr } from './tree.mjs';
import { ONE_VALUE_EVERY_WIDTH } from './resolve.mjs';

const TIERS = [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ];

// { width, max, unit } setting names a block has for a logo's size, or null.
export function logoSizeSettings( db, block ) {
	const rows = db.prepare( "SELECT attr_name, css_property, is_responsive, tier_shape FROM block_attributes WHERE block_slug = ? AND css_property IN ('width', 'max-width')" ).all( block );
	const width = rows.find( ( r ) => 'width' === r.css_property && ! r.is_responsive );
	const max = rows.find( ( r ) => 'max-width' === r.css_property && r.is_responsive && 'tier_object' === r.tier_shape );
	if ( ! width || ! max ) {
		return null;
	}
	const unit = db.prepare( 'SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, `${ max.attr_name }Unit` );
	return { width: width.attr_name, max: max.attr_name, unit: unit?.attr_name ?? null };
}

export function logoSizeWrites( { nodes, flat, refOf, reads, db, unmapped } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	for ( const row of unmapped ) {
		const rec = 'width' === row.property && ONE_VALUE_EVERY_WIDTH === row.code && '' === ( row.slot ?? '' ) ? nodes.find( ( n ) => refOf( flat[ n.index ] ) === row.node ) : null;
		const settings = rec ? logoSizeSettings( db, rec.name ) : null;
		const target = rec?.targets.find( ( t ) => '' === t.slot );
		const widths = target ? TIERS.map( ( [ w, tier ] ) => [ tier, reads.widths?.[ w ]?.[ target.id ]?.rect?.w ] ).filter( ( [ , v ] ) => Number.isFinite( v ) && v > 0 ) : [];
		if ( ! settings || ! widths.length ) {
			out.unmapped.push( row );
			continue;
		}
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
		put( settings.max, tiers, 'deep' );
		settings.unit && 'px' !== ( node.attributes[ settings.unit ] ?? 'px' ) && out.notes.push( `${ row.node } ${ rec.name }: ${ settings.unit } is "${ node.attributes[ settings.unit ] }", so the written ${ settings.max } px values are read in that unit; set it to px` );
		out.notes.push( `${ row.node } ${ rec.name }: the draft logo is ${ widths.map( ( [ tier, w ] ) => `${ Math.round( w ) }px at ${ tier }` ).join( ', ' ) }; written as ${ settings.max } (the per-device size) because ${ settings.width } holds one value for every width` );
	}
	return out;
}
