/**
 * sgs/choice-flow: the bands and boxes (Spec 02 FR-2-34). The "Bands and summary box" inspector panel (the header and
 * footer bands' rules and padding, the summary box's border and padding), their colour rows for the block's one
 * `SgsColourPanel`, and the canvas twin of `includes/choice-flow-bands.php` (`BandsStyle`) for the parts the canvas
 * draws (the header band and the progress track; the footer, the summary box and the help note's icon disc are drawn only
 * on the page). The panel also holds the help note icon disc's size.
 *
 * Every setting is unset by default; an unset value adds nothing to the canvas or the page.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ResponsiveOverride, TierBorderControl, fillRow } from '../../components';
import { colourVar, tierBoxLonghands, usePreviewTier } from '../../utils';
import { TierPadding, cssText, tierBorderPreview } from '../choice-flow-question/OptionCardPanels';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function BandsPanel( { attributes, setAttributes } ) {
	const parts = [
		[ 'headerBand', __( 'Header band rule (bottom edge)', 'sgs-blocks' ), __( 'Header band padding', 'sgs-blocks' ) ],
		[ 'footerBand', __( 'Footer band rule (top edge)', 'sgs-blocks' ), __( 'Footer band padding', 'sgs-blocks' ) ],
		[ 'summary', __( 'Summary box border', 'sgs-blocks' ), __( 'Summary box padding', 'sgs-blocks' ) ],
	];
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Bands and summary box', 'sgs-blocks' ) } initialOpen={ false }>
				{ parts.map( ( [ prefix, borderLabel, paddingLabel ] ) => (
					<div key={ prefix }>
						<TierBorderControl
							label={ borderLabel }
							value={ attributes[ `${ prefix }Border` ] }
							onChange={ ( next ) => setAttributes( { [ `${ prefix }Border` ]: next } ) }
						/>
						<TierPadding
							label={ paddingLabel }
							value={ attributes[ `${ prefix }Padding` ] }
							onChange={ ( obj ) => setAttributes( { [ `${ prefix }Padding` ]: obj } ) }
						/>
					</div>
				) ) }
				<ResponsiveOverride
					value={ attributes.stageNoteIconCircleSize }
					onChange={ ( obj ) => setAttributes( { stageNoteIconCircleSize: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<RangeControl
							label={ __( 'Help note icon disc size (px)', 'sgs-blocks' ) }
							help={ __( 'The disc behind the help note’s icon in the showcase layout. Empty keeps 34px; the icon keeps its own size.', 'sgs-blocks' ) }
							value={ 'number' === typeof ownValue ? ownValue : undefined }
							onChange={ ( val ) => setOwnValue( val ) }
							min={ 16 }
							max={ 96 }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			</PanelBody>
		</InspectorControls>
	);
}

/**
 * Colour rows for the block's `SgsColourPanel`: the progress track, the two bands' fills, the summary box's fill and
 * its dividers.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {Array} Colour rows.
 */
export function bandsColourRows( { attributes, setAttributes } ) {
	const row = ( key, label, base, heading ) => fillRow( { key, heading, label, attrs: { base }, attributes, setAttributes } );
	return [
		row( 'progress-track', __( 'Progress bar track', 'sgs-blocks' ), 'progressTrackColour', __( 'Bands and summary box', 'sgs-blocks' ) ),
		row( 'header-band', __( 'Header band fill', 'sgs-blocks' ), 'headerBandBackground' ),
		row( 'footer-band', __( 'Footer band fill', 'sgs-blocks' ), 'footerBandBackground' ),
		row( 'summary-box', __( 'Summary box fill', 'sgs-blocks' ), 'summaryBackground' ),
		row( 'summary-dividers', __( 'Summary dividers', 'sgs-blocks' ), 'summaryDividerColour' ),
	];
}

/**
 * One side's border from the tier border preview (`borderWidth` becomes `borderBottomWidth` and so on).
 *
 * @param {Object} style `{ borderWidth, borderStyle, borderColor }`.
 * @param {string} side  'Top' | 'Bottom'.
 * @return {Object} Style object.
 */
function sideBorder( style, side ) {
	return {
		[ `border${ side }Width` ]: style.borderWidth,
		[ `border${ side }Style` ]: style.borderStyle,
		[ `border${ side }Color` ]: style.borderColor,
	};
}

/**
 * The canvas twin of `sgs_choice_flow_bands_css()` for the header band and the progress track.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.clientId   The block's client id, for the canvas selector.
 * @return {JSX.Element|null} A scoped `<style>`, or null when nothing is set.
 */
export function BandsStyle( { attributes, clientId } ) {
	const tier = usePreviewTier();
	const a = attributes;
	const scope = `#block-${ clientId }`;
	const headerFill = colourVar( a.headerBandBackground );
	const rules = [
		[ `${ scope } .sgs-choice-flow__progress`, { backgroundColor: colourVar( a.progressTrackColour ) } ],
		[
			`${ scope } .sgs-choice-flow__chrome-header`,
			{
				backgroundColor: headerFill,
				backgroundImage: headerFill ? 'none' : undefined,
				...sideBorder( tierBorderPreview( a.headerBandBorder, tier ), 'Bottom' ),
				...tierBoxLonghands( a.headerBandPadding, tier, 'padding' ),
			},
		],
	];
	const css = rules
		.map( ( [ selector, style ] ) => [ selector, cssText( style ) ] )
		.filter( ( [ , body ] ) => '' !== body )
		.map( ( [ selector, body ] ) => `${ selector }{${ body }}` )
		.join( '' );
	return css ? <style>{ css }</style> : null;
}
