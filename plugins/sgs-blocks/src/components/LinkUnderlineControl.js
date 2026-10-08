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
	none: __( 'Links show no underline, so they rely on colour alone. Keep this off links inside running text.', 'sgs-blocks' ),
	sweep: __( 'A line sweeps in under the link on hover and keyboard focus. Links inside running text are easier to spot with an underline that stays.', 'sgs-blocks' ),
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
					{ label: __( 'Sweep in on hover', 'sgs-blocks' ), value: 'sweep' },
				] }
				help={ MODE_HELP[ mode ] }
				onChange={ ( next ) => onModeChange( next ) }
			/>
			{ ( 'always' === mode || 'sweep' === mode ) && (
				<SgsLengthControl
					label={ __( 'Underline thickness', 'sgs-blocks' ) }
					value={ thickness }
					units={ [ { value: 'px', label: 'px', default: 1 } ] }
					placeholder={ 'sweep' === mode ? __( 'Theme', 'sgs-blocks' ) : __( 'Auto', 'sgs-blocks' ) }
					onChange={ ( next ) => onThicknessChange( next ?? '' ) }
				/>
			) }
		</>
	);
}
