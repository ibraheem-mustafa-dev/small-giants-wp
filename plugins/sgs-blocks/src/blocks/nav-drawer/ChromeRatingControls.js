/**
 * Nav drawer top-row Google rating controls: the rating is its own row item,
 * independent of the free slot, so a heading and the rating share one row.
 * The badge itself is `sgs/google-rating-badge`; its rating, review count and
 * link come from Site Info (see includes/nav-drawer-chrome.php).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import { SgsColourPanel, textRow } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { TierShow } from './chrome-tier-controls';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function ChromeRatingControls( { attributes, setAttributes } ) {
	const { chromeRating, chromeRatingPlacement, chromeRatingShow, chromeRatingShowCount } = attributes;

	return (
		<>
			<ToggleControl
				label={ __( 'Show the Google rating', 'sgs-blocks' ) }
				help={ __( 'The rating, review count and link come from Site Info (Settings > Site Info), or live Google data when connected.', 'sgs-blocks' ) }
				checked={ !! chromeRating }
				onChange={ ( value ) => setAttributes( { chromeRating: value } ) }
				__nextHasNoMarginBottom
			/>
			{ !! chromeRating && (
				<>
					<ToggleGroupControl
						label={ __( 'Rating position in the row', 'sgs-blocks' ) }
						help={ __( 'End sits beside the close button.', 'sgs-blocks' ) }
						value={ 'center' === chromeRatingPlacement ? 'center' : 'end' }
						onChange={ ( value ) => setAttributes( { chromeRatingPlacement: value } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="end" label={ __( 'End', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					<TierShow
						label={ __( 'Show the Google rating', 'sgs-blocks' ) }
						value={ chromeRatingShow }
						onChange={ ( obj ) => setAttributes( { chromeRatingShow: obj } ) }
					/>
					<ToggleControl
						label={ __( 'Show the number of reviews', 'sgs-blocks' ) }
						checked={ !! chromeRatingShowCount }
						onChange={ ( value ) => setAttributes( { chromeRatingShowCount: value } ) }
						__nextHasNoMarginBottom
					/>
					<SgsColourPanel
						rows={ [
							textRow( {
								key: 'chromeRatingColour',
								label: __( 'Rating and caption colour', 'sgs-blocks' ),
								attrs: { base: 'chromeRatingColour' },
								attributes,
								setAttributes,
							} ),
						] }
					/>
				</>
			) }
		</>
	);
}
