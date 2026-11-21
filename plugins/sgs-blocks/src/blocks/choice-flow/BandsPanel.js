/**
 * sgs/choice-flow: the bands and boxes (Spec 02 FR-2-34). The "Bands and summary box" inspector panel (the header and
 * footer bands' rules and padding, the summary box's border and padding), their colour rows for the block's one
 * `SgsColourPanel`, and the canvas twin of `includes/choice-flow-bands.php` (`BandsStyle`) for every part: the progress
 * track and the header band (`ChromePreview`), the footer band (the canvas's footer row), the summary box, its dividers
 * and the help note's icon disc (`SummaryPreview`). The panel also holds the help note icon disc's size.
 *
 * Every setting is unset by default; an unset value adds nothing to the canvas or the page.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ResponsiveOverride, TierBorderControl, fillRow } from '../../components';
import { colourVar, tierBoxLonghands, tierValueOf, usePreviewTier } from '../../utils';
import { TierPadding, cssText, tierBorderPreview } from '../choice-flow-question/OptionCardPanels';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function BandsPanel( { attributes, setAttributes } ) {
	// Each part: its border attribute, its padding attribute, and their labels.
	const parts = [
		[ 'headerBandBorder', 'headerBandPadding', __( 'Header band rule (bottom edge)', 'sgs-blocks' ), __( 'Header band padding', 'sgs-blocks' ) ],
		[ 'footerBandBorder', 'footerBandPadding', __( 'Footer band rule (top edge)', 'sgs-blocks' ), __( 'Footer band padding', 'sgs-blocks' ) ],
		[ 'summaryBorder', 'summaryPadding', __( 'Summary box border', 'sgs-blocks' ), __( 'Summary box padding', 'sgs-blocks' ) ],
	];
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Bands and summary box', 'sgs-blocks' ) } initialOpen={ false }>
				{ parts.map( ( [ borderAttr, paddingAttr, borderLabel, paddingLabel ] ) => (
					<div key={ borderAttr }>
						<TierBorderControl
							label={ borderLabel }
							value={ attributes[ borderAttr ] }
							onChange={ ( next ) => setAttributes( { [ borderAttr ]: next } ) }
						/>
						<TierPadding
							label={ paddingLabel }
							value={ attributes[ paddingAttr ] }
							onChange={ ( obj ) => setAttributes( { [ paddingAttr ]: obj } ) }
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
 * A fill as `sgs_choice_flow_band_css()` prints it: the colour, and no background image beside it.
 *
 * @param {string} value Colour slug or value.
 * @return {Object} Style object; empty when unset.
 */
function bandFill( value ) {
	const fill = colourVar( value );
	return fill ? { backgroundColor: fill, backgroundImage: 'none' } : {};
}

/**
 * The help note's icon disc diameter at a tier, as `sgs_choice_flow_note_icon_size_css()` accepts it (16 to 96 px).
 *
 * @param {Object} value {desktop, tablet, mobile} sizes in px.
 * @param {string} tier  The previewed device.
 * @return {string|undefined} CSS length, or undefined when unset.
 */
function noteIconSize( value, tier ) {
	const size = tierValueOf( value, tier, ( raw ) => {
		const n = Number( raw );
		return Number.isFinite( n ) && n >= 16 && n <= 96 ? n : undefined;
	} );
	return undefined === size ? undefined : `${ Math.round( size * 100 ) / 100 }px`;
}

/**
 * The canvas twin of `sgs_choice_flow_bands_css()` and `sgs_choice_flow_note_icon_size_css()`: the progress track, the
 * header band, the footer band (on the canvas's footer row, `.sgs-choice-flow__footer-preview`), the summary box with
 * its dividers and the help note's icon disc (on `SummaryPreview`).
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.clientId   The block's client id, for the canvas selector.
 * @return {JSX.Element|null} A scoped `<style>`, or null when nothing is set.
 */
export function BandsStyle( { attributes, clientId } ) {
	const tier = usePreviewTier();
	const scope = `#block-${ clientId }`;
	const divider = colourVar( attributes.summaryDividerColour );
	const iconSize = noteIconSize( attributes.stageNoteIconCircleSize, tier );
	const rules = [
		[ `${ scope } .sgs-choice-flow__progress`, { backgroundColor: colourVar( attributes.progressTrackColour ) } ],
		[
			`${ scope } .sgs-choice-flow__chrome-header`,
			{
				...bandFill( attributes.headerBandBackground ),
				...sideBorder( tierBorderPreview( attributes.headerBandBorder, tier ), 'Bottom' ),
				...tierBoxLonghands( attributes.headerBandPadding, tier, 'padding' ),
			},
		],
		[
			`${ scope } .sgs-choice-flow__footer-preview`,
			{
				...bandFill( attributes.footerBandBackground ),
				...sideBorder( tierBorderPreview( attributes.footerBandBorder, tier ), 'Top' ),
				...tierBoxLonghands( attributes.footerBandPadding, tier, 'padding' ),
			},
		],
		[
			`${ scope } .sgs-choice-flow__summary-body`,
			{
				...bandFill( attributes.summaryBackground ),
				...tierBorderPreview( attributes.summaryBorder, tier ),
				...tierBoxLonghands( attributes.summaryPadding, tier, 'padding' ),
			},
		],
		[ `${ scope } .sgs-choice-flow__summary-lines,${ scope } .sgs-choice-flow__summary-total`, { borderColor: divider } ],
		[ `${ scope } .sgs-choice-flow__summary-note-icon`, { width: iconSize, height: iconSize } ],
	];
	const css = rules
		.map( ( [ selector, style ] ) => [ selector, cssText( style ) ] )
		.filter( ( [ , body ] ) => '' !== body )
		.map( ( [ selector, body ] ) => `${ selector }{${ body }}` )
		.join( '' );
	return css ? <style>{ css }</style> : null;
}
