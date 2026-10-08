/**
 * LinkUnderlineControl — how the links inside a block's text are underlined.
 *
 * Mounted in the `after` slot of a block's "Link colour" row in SgsColourPanel, so the
 * underline sits beside the colour it is painted in. Writes `{prefix}LinkUnderline` and
 * `{prefix}LinkUnderlineThickness`; render.php prints them through
 * includes/helpers-link-underline.php::sgs_link_underline_css and the canvas through
 * src/utils/link-underline.js::linkUnderlinePreviewCss.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import SgsLengthControl from './SgsLengthControl';

const MODE_HELP = {
	none: __( 'Links show no underline, so only their colour marks them. Not recommended for links inside paragraphs.', 'sgs-blocks' ),
	sweep: __( 'No underline until the link is hovered or focused with the keyboard. Links inside paragraphs are easier to spot with Always.', 'sgs-blocks' ),
	always: __( 'This styles the links inside the text. Text decoration under Typography styles the whole text.', 'sgs-blocks' ),
};

/**
 * @param {Object}   props
 * @param {string}   [props.mode]              '', 'none', 'always' or 'sweep'.
 * @param {string}   [props.thickness]         The line's thickness (a CSS length).
 * @param {Function} props.onModeChange        Receives the next mode.
 * @param {Function} props.onThicknessChange   Receives the next thickness string.
 * @return {Element} The control.
 */
export default function LinkUnderlineControl( { mode = '', thickness = '', onModeChange, onThicknessChange } ) {
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
					{ label: __( 'Slides in on hover', 'sgs-blocks' ), value: 'sweep' },
				] }
				help={ MODE_HELP[ mode ] }
				onChange={ ( next ) => onModeChange( next ) }
			/>
			{ ( 'always' === mode || 'sweep' === mode ) && (
				<SgsLengthControl
					label={ __( 'Underline thickness', 'sgs-blocks' ) }
					value={ thickness }
					units={ [ { value: 'px', label: 'px', default: 1 } ] }
					placeholder={ 'sweep' === mode ? __( 'Site default', 'sgs-blocks' ) : __( 'Default', 'sgs-blocks' ) }
					onChange={ ( next ) => onThicknessChange( next ?? '' ) }
				/>
			) }
		</>
	);
}
