/**
 * One shadow colour and its opacity. Colour and opacity are separate: the panel stores the
 * colour token (`site`, a palette slug or a hex) and the opacity, and the server builds the
 * `color-mix()` itself. "Site colour" follows the one site-wide shadow colour, so a rebrand
 * recolours every shadow at once; picking any other colour makes this layer its own.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Button, RangeControl } from '@wordpress/components';
import DesignTokenPicker from '../DesignTokenPicker';
import { parseColourToken } from '../../utils/shadow-model';

/**
 * @param {Object}   props
 * @param {string}   props.label        Field label.
 * @param {string}   props.colour       Colour token.
 * @param {number}   props.alpha        Opacity 0 to 100.
 * @param {Function} props.onChange     Receives `{ colour, alpha }` (only the changed part).
 * @param {boolean}  [props.noOpacity]  Hide the opacity slider (the builder has its own intensity).
 */
export default function ColourOpacity( { label, colour, alpha, onChange, noOpacity = false } ) {
	const isSite = 'site' === colour;
	return (
		<div className="sgs-shadow-control__colour">
			<Button
				variant={ isSite ? 'primary' : 'secondary' }
				aria-pressed={ isSite }
				onClick={ () => onChange( { colour: 'site' } ) }
				__next40pxDefaultSize
			>
				{ __( 'Site colour', 'sgs-blocks' ) }
			</Button>
			<DesignTokenPicker
				label={ label || __( 'Or pick a colour', 'sgs-blocks' ) }
				value={ isSite ? undefined : colour }
				onChange={ ( v ) => {
					const parsed = v ? parseColourToken( String( v ) ) : null;
					onChange( { colour: parsed ? parsed.colour : 'site' } );
				} }
				linked
				enableAlpha={ false }
				statesProvidedByParent
			/>
			{ ! noOpacity && (
				<RangeControl
					label={ __( 'Opacity', 'sgs-blocks' ) }
					value={ alpha }
					min={ 0 }
					max={ 100 }
					onChange={ ( v ) => onChange( { alpha: v ?? 0 } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</div>
	);
}
