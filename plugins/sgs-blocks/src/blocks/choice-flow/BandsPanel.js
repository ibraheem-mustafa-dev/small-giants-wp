/**
 * sgs/choice-flow: the bands and boxes (Spec 02 FR-2-34). One inspector panel per element, titled by the element's
 * `supports.sgs.elements` label (Spec 35 THE PLACEMENT RULE, TIER 1): "Header band" and "Footer band" (each band's rule
 * and padding), "Summary box" (its border and padding) and "Help note icon disc" (its size); their colour rows for the
 * block's one `SgsColourPanel`; and the canvas twin of `includes/choice-flow-bands.php` (`BandsStyle`) for every part:
 * the progress track and the header band (`ChromePreview`), the footer band (the canvas's footer row), the summary box,
 * its dividers and the help note's icon disc (`SummaryPreview`).
 *
 * Every setting is unset by default; an unset value adds nothing to the canvas or the page.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import {
	ResponsiveOverride,
	SgsLengthControl,
	TierBorderControl,
	fillRow,
} from '../../components';
import { colourVar, tierBoxLonghands, usePreviewTier } from '../../utils';
import { tierLengthPreview } from '../../utils/cssLength';
import {
	TierPadding,
	cssText,
	tierBorderPreview,
} from '../choice-flow-question/OptionCardPanels';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The four element panels, mounted inside their own InspectorControls.
 */
export default function BandsPanel( { attributes, setAttributes } ) {
	// Each element: its panel title (the element's label), its border attribute, its padding attribute and their labels.
	const parts = [
		[
			__( 'Header band', 'sgs-blocks' ),
			'headerBandBorder',
			'headerBandPadding',
			__( 'Rule (bottom edge)', 'sgs-blocks' ),
			__( 'Padding', 'sgs-blocks' ),
		],
		[
			__( 'Footer band', 'sgs-blocks' ),
			'footerBandBorder',
			'footerBandPadding',
			__( 'Rule (top edge)', 'sgs-blocks' ),
			__( 'Padding', 'sgs-blocks' ),
		],
		[
			__( 'Summary box', 'sgs-blocks' ),
			'summaryBorder',
			'summaryPadding',
			__( 'Border', 'sgs-blocks' ),
			__( 'Padding', 'sgs-blocks' ),
		],
	];
	return (
		<InspectorControls>
			{ parts.map(
				( [
					title,
					borderAttr,
					paddingAttr,
					borderLabel,
					paddingLabel,
				] ) => (
					<PanelBody
						key={ borderAttr }
						title={ title }
						initialOpen={ false }
					>
						<TierBorderControl
							label={ borderLabel }
							value={ attributes[ borderAttr ] }
							onChange={ ( next ) =>
								setAttributes( { [ borderAttr ]: next } )
							}
						/>
						<TierPadding
							label={ paddingLabel }
							value={ attributes[ paddingAttr ] }
							onChange={ ( obj ) =>
								setAttributes( { [ paddingAttr ]: obj } )
							}
						/>
					</PanelBody>
				)
			) }
			<PanelBody
				title={ __( 'Help note icon disc', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ResponsiveOverride
					label={ __( 'Help note icon disc size', 'sgs-blocks' ) }
					value={ attributes.stageNoteIconCircleSize }
					onChange={ ( obj ) =>
						setAttributes( { stageNoteIconCircleSize: obj } )
					}
				>
					{ ( {
						ownValue,
						effectiveValue,
						inherited,
						setOwnValue,
					} ) => (
						<SgsLengthControl
							label={ __(
								'Help note icon disc size',
								'sgs-blocks'
							) }
							help={ __(
								'The disc behind the help note’s icon in the showcase layout. Empty keeps 34px; the icon keeps its own size.',
								'sgs-blocks'
							) }
							presets={ false }
							value={ ownValue ?? '' }
							placeholder={ inherited ? effectiveValue : '' }
							onChange={ ( val ) =>
								setOwnValue( val || undefined )
							}
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
	const row = ( key, label, base, heading ) =>
		fillRow( {
			key,
			heading,
			label,
			attrs: { base },
			attributes,
			setAttributes,
		} );
	return [
		row(
			'progress-track',
			__( 'Progress bar track', 'sgs-blocks' ),
			'progressTrackColour',
			__( 'Bands and summary box', 'sgs-blocks' )
		),
		row(
			'header-band',
			__( 'Header band fill', 'sgs-blocks' ),
			'headerBandBackground'
		),
		row(
			'footer-band',
			__( 'Footer band fill', 'sgs-blocks' ),
			'footerBandBackground'
		),
		row(
			'summary-box',
			__( 'Summary box fill', 'sgs-blocks' ),
			'summaryBackground'
		),
		row(
			'summary-dividers',
			__( 'Summary dividers', 'sgs-blocks' ),
			'summaryDividerColour'
		),
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
 * The help note's icon disc diameter at a tier, as `sgs_choice_flow_note_icon_size_css()` prints it: a CSS length (a bare number is px).
 *
 * @param {Object} value {desktop, tablet, mobile} lengths.
 * @param {string} tier  The previewed device.
 * @return {string|undefined} CSS length, or undefined when unset.
 */
function noteIconSize( value, tier ) {
	return tierLengthPreview( value, tier );
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
		[
			`${ scope } .sgs-choice-flow__progress`,
			{ backgroundColor: colourVar( attributes.progressTrackColour ) },
		],
		[
			`${ scope } .sgs-choice-flow__chrome-header`,
			{
				...bandFill( attributes.headerBandBackground ),
				...sideBorder(
					tierBorderPreview( attributes.headerBandBorder, tier ),
					'Bottom'
				),
				...tierBoxLonghands(
					attributes.headerBandPadding,
					tier,
					'padding'
				),
			},
		],
		[
			`${ scope } .sgs-choice-flow__footer-preview`,
			{
				...bandFill( attributes.footerBandBackground ),
				...sideBorder(
					tierBorderPreview( attributes.footerBandBorder, tier ),
					'Top'
				),
				...tierBoxLonghands(
					attributes.footerBandPadding,
					tier,
					'padding'
				),
			},
		],
		[
			`${ scope } .sgs-choice-flow__summary-body`,
			{
				...bandFill( attributes.summaryBackground ),
				...tierBorderPreview( attributes.summaryBorder, tier ),
				...tierBoxLonghands(
					attributes.summaryPadding,
					tier,
					'padding'
				),
			},
		],
		[
			`${ scope } .sgs-choice-flow__summary-lines,${ scope } .sgs-choice-flow__summary-total`,
			{ borderColor: divider },
		],
		[
			`${ scope } .sgs-choice-flow__summary-note-icon`,
			{ width: iconSize, height: iconSize },
		],
	];
	const css = rules
		.map( ( [ selector, style ] ) => [ selector, cssText( style ) ] )
		.filter( ( [ , body ] ) => '' !== body )
		.map( ( [ selector, body ] ) => `${ selector }{${ body }}` )
		.join( '' );
	return css ? <style>{ css }</style> : null;
}
