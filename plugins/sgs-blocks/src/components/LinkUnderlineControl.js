/**
 * LinkUnderlineControl — how the links inside a block's text are underlined.
 *
 * Mounted in the `after` slot of a block's "Link colour" row in SgsColourPanel, so the
 * underline sits beside the colour it is painted in. Writes `{prefix}LinkUnderline`,
 * `{prefix}LinkUnderlineThickness`, `{prefix}LinkUnderlineColour`,
 * `{prefix}LinkUnderlineColourHover` and `{prefix}LinkUnderlineOffset`; render.php prints them
 * through includes/helpers-link-underline.php::sgs_link_underline_css and the canvas through
 * src/utils/link-underline.js::linkUnderlinePreviewCss.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import SgsLengthControl from './SgsLengthControl';
import DesignTokenPicker from './DesignTokenPicker';

const MODE_HELP = {
	none: __( 'Links show no underline, so only their colour marks them. Not recommended for links inside paragraphs.', 'sgs-blocks' ),
	hover: __( 'An underline appears when the link is hovered or focused with the keyboard.', 'sgs-blocks' ),
	sweep: __( 'No underline until the link is hovered or focused with the keyboard. Links inside paragraphs are easier to spot with Always.', 'sgs-blocks' ),
	always: __( 'This styles the links inside the text. Text decoration under Typography styles the whole text.', 'sgs-blocks' ),
};

/**
 * @param {Object}   props
 * @param {string}   [props.mode]                 '', 'none', 'always', 'hover' or 'sweep'.
 * @param {string}   [props.thickness]            The line's thickness (a CSS length).
 * @param {string}   [props.colour]               The line's colour at rest (a palette slug or any CSS colour).
 * @param {string}   [props.colourHover]          The line's colour on hover and keyboard focus.
 * @param {string}   [props.offset]               The gap between the text and the line (a CSS length).
 * @param {Function} props.onModeChange           Receives the next mode.
 * @param {Function} props.onThicknessChange      Receives the next thickness string.
 * @param {Function} props.onColourChange         Receives the next line colour.
 * @param {Function} props.onColourHoverChange    Receives the next hover line colour.
 * @param {Function} props.onOffsetChange         Receives the next gap string.
 * @return {Element} The control.
 */
export default function LinkUnderlineControl( {
	mode = '',
	thickness = '',
	colour = '',
	colourHover = '',
	offset = '',
	onModeChange,
	onThicknessChange,
	onColourChange,
	onColourHoverChange,
	onOffsetChange,
} ) {
	const hasLine = 'always' === mode || 'hover' === mode || 'sweep' === mode;
	const hasGap = 'always' === mode || 'hover' === mode;
	return (
		<>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Link underline', 'sgs-blocks' ) }
				value={ mode }
				options={ [
					{ label: __( 'Theme default', 'sgs-blocks' ), value: '' },
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Always', 'sgs-blocks' ), value: 'always' },
					{ label: __( 'Shows on hover', 'sgs-blocks' ), value: 'hover' },
					{ label: __( 'Slides in on hover', 'sgs-blocks' ), value: 'sweep' },
				] }
				help={ MODE_HELP[ mode ] }
				onChange={ ( next ) => onModeChange( next ) }
			/>
			{ hasLine && (
				<SgsLengthControl
					label={ __( 'Underline thickness', 'sgs-blocks' ) }
					value={ thickness }
					units={ [ { value: 'px', label: 'px', default: 1 } ] }
					placeholder={ 'sweep' === mode ? __( 'Site default', 'sgs-blocks' ) : __( 'Default', 'sgs-blocks' ) }
					onChange={ ( next ) => onThicknessChange( next ?? '' ) }
				/>
			) }
			{ hasLine && (
				<DesignTokenPicker
					label={ __( 'Underline colour', 'sgs-blocks' ) }
					help={ __( 'Leave empty to draw the underline in the link colour.', 'sgs-blocks' ) }
					states={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: colour,
							onChange: ( next ) => onColourChange( next ?? '' ),
							linked: true,
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: colourHover,
							onChange: ( next ) => onColourHoverChange( next ?? '' ),
							linked: true,
						},
					] }
				/>
			) }
			{ hasGap && (
				<SgsLengthControl
					label={ __( 'Underline gap', 'sgs-blocks' ) }
					help={ __( 'Space between the text and its underline.', 'sgs-blocks' ) }
					value={ offset }
					units={ [ { value: 'px', label: 'px', default: 2 } ] }
					placeholder={ __( 'Default', 'sgs-blocks' ) }
					onChange={ ( next ) => onOffsetChange( next ?? '' ) }
				/>
			) }
		</>
	);
}
