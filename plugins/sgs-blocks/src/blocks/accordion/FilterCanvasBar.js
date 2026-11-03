/**
 * Editor-canvas copy of sgs/accordion's filter bar: the search box, one chip per item category, the count and the empty
 * message, static (nothing filters in the editor). It mirrors what includes/accordion-filter.php prints, with the chip
 * and count colours the accordion sets, so the canvas shows what the front end adds.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { resolveColourToken } from '../../components';

function countLine( attributes, count ) {
	const plural = attributes.filterCountTemplate || '{count}';
	const singular = attributes.filterCountSingular || plural;
	return ( 1 === count ? singular : plural ).replace( '{count}', String( count ) );
}

export default function FilterCanvasBar( { attributes, clientId, palette } ) {
	const items = useSelect(
		( select ) =>
			select( 'core/block-editor' )
				.getBlocks( clientId )
				.filter( ( block ) => 'sgs/accordion-item' === block.name ),
		[ clientId ]
	);
	const categories = [];
	items.forEach( ( item ) => {
		const category = ( item.attributes.category || '' ).trim();
		if ( '' !== category && ! categories.includes( category ) ) {
			categories.push( category );
		}
	} );
	const colour = ( value ) => ( value ? resolveColourToken( value, palette ) : undefined );
	const chipStyle = ( pressed ) => ( {
		color: colour( pressed ? attributes.filterChipColourPressed : attributes.filterChipColour ),
		backgroundColor: colour( pressed ? attributes.filterChipBackgroundPressed : attributes.filterChipBackground ),
		borderColor: colour( attributes.filterChipBorderColour ),
		borderRadius: attributes.filterChipRadius || undefined,
	} );
	const showSearch = false !== attributes.filterSearch;
	const showChips = false !== attributes.filterChips && categories.length > 0;

	return (
		<div className="sgs-accordion__filter sgs-accordion__filter--canvas" contentEditable={ false }>
			{ showSearch && (
				<div className="sgs-accordion__search">
					<input
						className="sgs-accordion__search-input"
						type="search"
						disabled
						aria-label={ attributes.filterSearchLabel || __( 'Search', 'sgs-blocks' ) }
						placeholder={ attributes.filterSearchPlaceholder || '' }
					/>
				</div>
			) }
			{ showChips && (
				<div className="sgs-accordion__chips">
					<span className="sgs-accordion__chip" aria-pressed="true" style={ chipStyle( true ) }>
						{ attributes.filterAllLabel || __( 'All', 'sgs-blocks' ) }
					</span>
					{ categories.map( ( category ) => (
						<span key={ category } className="sgs-accordion__chip" aria-pressed="false" style={ chipStyle( false ) }>
							{ category }
						</span>
					) ) }
				</div>
			) }
			<p className="sgs-accordion__count" style={ { color: colour( attributes.filterCountColour ) } }>
				{ countLine( attributes, items.length ) }
			</p>
		</div>
	);
}
