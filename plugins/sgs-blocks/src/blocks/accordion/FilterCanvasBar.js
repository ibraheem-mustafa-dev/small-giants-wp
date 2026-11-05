/**
 * Editor-canvas copy of sgs/accordion's filter bar: the search box, one chip per item category, the count and the empty
 * message, static (nothing filters in the editor). It mirrors what includes/accordion-filter.php prints, with the chip
 * and count colours the accordion sets, so the canvas shows what the front end adds.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { IconPreview, resolveColourToken } from '../../components';
import { resolveShadowPreviewComposed, sgsLengthPreview, spacingPreview, tierValueOf } from '../../utils';

const WRAP_CSS = { wrap: { flexWrap: 'wrap', overflowX: 'visible' }, nowrap: { flexWrap: 'nowrap', overflowX: 'auto' } };
const JUSTIFY_CSS = { left: 'flex-start', center: 'center', right: 'flex-end' };

function countLine( attributes, count ) {
	const plural = attributes.filterCountTemplate || '{count}';
	const singular = attributes.filterCountSingular || plural;
	return ( 1 === count ? singular : plural ).replace( '{count}', String( count ) );
}

export default function FilterCanvasBar( { attributes, clientId, palette, tier = 'desktop' } ) {
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
	const length = ( value ) => sgsLengthPreview( tierValueOf( value, tier ) );
	const wrap = tierValueOf( attributes.filterChipsWrap, tier, ( v ) => ( WRAP_CSS[ v ] ? v : undefined ) );
	const offsetX = sgsLengthPreview( attributes.filterChipSelectedOffsetX );
	const offsetY = sgsLengthPreview( attributes.filterChipSelectedOffsetY );
	const chipStyle = ( pressed ) => ( {
		color: colour( pressed ? attributes.filterChipColourPressed : attributes.filterChipColour ),
		backgroundColor: colour( pressed ? attributes.filterChipBackgroundPressed : attributes.filterChipBackground ),
		borderColor: colour( attributes.filterChipBorderColour ),
		borderRadius: attributes.filterChipRadius || undefined,
		fontSize: length( attributes.filterChipFontSize ),
		...( wrap ? { flex: 'wrap' === wrap ? '0 1 auto' : 'none', whiteSpace: 'wrap' === wrap ? 'normal' : 'nowrap' } : {} ),
		boxShadow: resolveShadowPreviewComposed( attributes.filterChipShadow, attributes.filterChipShadowColour ),
		...( pressed
			? {
					boxShadow: resolveShadowPreviewComposed( attributes.filterChipSelectedShadow, attributes.filterChipSelectedShadowColour ),
					translate: offsetX || offsetY ? `${ offsetX || '0' } ${ offsetY || '0' }` : undefined,
			  }
			: {} ),
	} );
	const chipsStyle = {
		...( wrap ? WRAP_CSS[ wrap ] : {} ),
		justifyContent: tierValueOf( attributes.filterChipsJustify, tier, ( v ) => JUSTIFY_CSS[ v ] ),
		...spacingPreview( { padding: attributes.filterChipsPadding }, tier ),
	};
	const searchStyle = {
		backgroundColor: colour( attributes.filterSearchBackground ),
		minHeight: length( attributes.filterSearchHeight ),
		fontSize: length( attributes.filterSearchFontSize ),
		boxShadow: resolveShadowPreviewComposed( attributes.filterSearchShadow, attributes.filterSearchShadowColour ),
		...spacingPreview( { padding: attributes.filterSearchPadding }, tier ),
	};
	const searchIcon = ( attributes.filterSearchIcon || '' ).trim();
	const iconSize = sgsLengthPreview( attributes.filterSearchIconSize );
	const showSearch = false !== attributes.filterSearch;
	const showChips = false !== attributes.filterChips && categories.length > 0;

	return (
		<div className="sgs-accordion__filter sgs-accordion__filter--canvas" contentEditable={ false }>
			{ showSearch && (
				<div
					className={ 'sgs-accordion__search' + ( searchIcon ? ' sgs-accordion__search--has-icon' : '' ) }
					style={ iconSize ? { '--sgs-accordion-search-icon-size': iconSize } : undefined }
				>
					{ searchIcon && (
						<span className="sgs-accordion__search-icon" style={ { color: colour( attributes.filterSearchIconColour ) } } aria-hidden="true">
							<IconPreview source="lucide" name={ searchIcon } />
						</span>
					) }
					<input
						className="sgs-accordion__search-input"
						type="search"
						disabled
						style={ searchStyle }
						aria-label={ attributes.filterSearchLabel || __( 'Search', 'sgs-blocks' ) }
						placeholder={ attributes.filterSearchPlaceholder || '' }
					/>
				</div>
			) }
			{ showChips && (
				<div className="sgs-accordion__chips" style={ chipsStyle }>
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
