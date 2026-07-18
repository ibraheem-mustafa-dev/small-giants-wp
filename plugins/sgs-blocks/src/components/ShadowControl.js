/**
 * ShadowControl — shared real shadow builder (Spec 35 Part I action item 3).
 *
 * Replaces the old None/Small/Medium 3-option select pattern with genuine
 * X/Y offset, blur, spread, colour+alpha, and inset controls, PLUS a small
 * preset menu that SEEDS the builder from the theme's `theme.json`
 * `settings.shadow.presets` (Small/Medium/Large/Glow) — presets are a
 * starting point, not a ceiling.
 *
 * The stored attribute is a single CSS `box-shadow` VALUE STRING (matches
 * every other SGS colour/shadow attribute — see `DesignTokenPicker`), e.g.
 * `"0 4px 12px #0000001A"` or `"inset 0 0 20px #F87A1F4D"`. This is exactly
 * the shape `sgs_shadow_value()` (`includes/helpers-tokens.php`) already
 * accepts as a "raw" shadow (it starts with a digit/`inset`) — it passes the
 * colour token through `sgs_normalise_css_functional_colours()`, so an
 * `rgba()` colour picked here still survives WordPress's
 * `safecss_filter_attr()` strip of functional notation (D302). A bare theme
 * shadow SLUG (e.g. `"sm"`) is also accepted unchanged — picking a preset
 * without editing it keeps the value linked to the theme token.
 *
 * WCAG 2.1 AA: every field is a labelled native control (`UnitControl`,
 * `ToggleControl`, `DesignTokenPicker`) with WP's own focus styles; the
 * preset buttons carry `aria-pressed` so the active preset is announced.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	ButtonGroup,
	__experimentalUnitControl as UnitControl,
	ToggleControl,
} from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * Parse a raw CSS box-shadow string into its builder parts. Best-effort —
 * only handles a single shadow layer (the builder's own output shape).
 * Returns null when the string doesn't parse as a longhand shadow (e.g. a
 * theme slug like "sm", or an empty string) — the builder then falls back to
 * its defaults rather than fighting the stored value.
 *
 * @param {string} value Raw box-shadow CSS string.
 * @return {?Object} { inset, x, y, blur, spread, colour } or null.
 */
function parseShadow( value ) {
	if ( ! value ) {
		return null;
	}
	const match = String( value )
		.trim()
		.match(
			/^(inset\s+)?(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+([\d.]+)px\s+(.+)$/i
		);
	if ( ! match ) {
		return null;
	}
	return {
		inset: !! match[ 1 ],
		x: Number( match[ 2 ] ),
		y: Number( match[ 3 ] ),
		blur: Number( match[ 4 ] ),
		spread: Number( match[ 5 ] ),
		colour: match[ 6 ].trim(),
	};
}

/**
 * Build a raw CSS box-shadow string from the builder parts.
 *
 * @param {Object} parts Builder parts.
 * @return {string} CSS box-shadow value.
 */
function buildShadow( { inset, x, y, blur, spread, colour } ) {
	return [
		inset ? 'inset' : '',
		`${ x || 0 }px`,
		`${ y || 0 }px`,
		`${ blur || 0 }px`,
		`${ spread || 0 }px`,
		colour || 'rgba(0,0,0,0.1)',
	]
		.filter( Boolean )
		.join( ' ' );
}

const DEFAULT_PARTS = { inset: false, x: 0, y: 4, blur: 12, spread: 0, colour: 'rgba(0,0,0,0.1)' };

/**
 * @param {Object}   props
 * @param {string}   props.label    Field label.
 * @param {string}   [props.value]  Stored raw box-shadow CSS string (or theme slug).
 * @param {Function} props.onChange Receives the next raw box-shadow CSS string.
 */
export default function ShadowControl( { label, value, onChange } ) {
	const [ presets ] = useSettings( 'shadow.presets' );
	const parts = parseShadow( value ) || DEFAULT_PARTS;

	const updatePart = ( key, next ) => {
		onChange( buildShadow( { ...parts, [ key ]: next } ) );
	};

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<div className="sgs-shadow-control__presets">
				<ButtonGroup>
					<Button
						variant={ ! value ? 'primary' : 'secondary' }
						aria-pressed={ ! value }
						onClick={ () => onChange( '' ) }
					>
						{ __( 'None', 'sgs-blocks' ) }
					</Button>
					{ ( presets || [] ).map( ( preset ) => (
						<Button
							key={ preset.slug }
							variant={ value === preset.slug ? 'primary' : 'secondary' }
							aria-pressed={ value === preset.slug }
							onClick={ () => onChange( preset.slug ) }
						>
							{ preset.name }
						</Button>
					) ) }
				</ButtonGroup>
			</div>

			{ !! value && (
				<div className="sgs-shadow-control__builder">
					<div className="sgs-shadow-control__row">
						<UnitControl
							label={ __( 'Offset X', 'sgs-blocks' ) }
							value={ `${ parts.x }px` }
							onChange={ ( v ) => updatePart( 'x', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
						/>
						<UnitControl
							label={ __( 'Offset Y', 'sgs-blocks' ) }
							value={ `${ parts.y }px` }
							onChange={ ( v ) => updatePart( 'y', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-shadow-control__row">
						<UnitControl
							label={ __( 'Blur', 'sgs-blocks' ) }
							value={ `${ parts.blur }px` }
							onChange={ ( v ) => updatePart( 'blur', Math.max( 0, parseFloat( v ) || 0 ) ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
						/>
						<UnitControl
							label={ __( 'Spread', 'sgs-blocks' ) }
							value={ `${ parts.spread }px` }
							onChange={ ( v ) => updatePart( 'spread', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
						/>
					</div>
					<DesignTokenPicker
						label={ __( 'Shadow colour', 'sgs-blocks' ) }
						value={ parts.colour }
						onChange={ ( v ) => updatePart( 'colour', v || DEFAULT_PARTS.colour ) }
						enableAlpha
					/>
					<ToggleControl
						label={ __( 'Inset (inner shadow)', 'sgs-blocks' ) }
						checked={ parts.inset }
						onChange={ ( v ) => updatePart( 'inset', v ) }
						__nextHasNoMarginBottom
					/>
				</div>
			) }
		</BaseControl>
	);
}
