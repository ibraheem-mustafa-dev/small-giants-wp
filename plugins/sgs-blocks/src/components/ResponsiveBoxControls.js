/**
 * ResponsiveBoxControls — FR-S9-6 per-device spacing + width panel.
 *
 * The shared inspector panel for the §S9 header/footer/nav row blocks
 * (site-header-row / site-footer-row / adaptive-nav). Edits padding, margin,
 * max-width and content-width on the ONE `{desktop,tablet,mobile}` object model
 * (Spec 17 FR-S9-6) via the SGS-owned `ResponsiveOverride` device switcher —
 * padding/margin through WP's native `BoxControl` (4 sides), max-width through
 * `UnitControl`, content-width through a token `SelectControl`.
 *
 * Replaces the legacy `ResponsiveSpacingPanel` (flat `paddingTopTablet…` attrs +
 * WP-native `style.spacing` base). ONE system: these blocks declare NO
 * `supports.spacing`, so all box CSS flows through the object model here →
 * emitted by `SGS_Container_Wrapper` (padding/margin/max-width to the outer,
 * content-width band to the inner) under `responsive_model=object`.
 *
 * Per-side inheritance is handled by the PHP emitter (`sgs_responsive_normalise_object`
 * + per-side null-coalesce): a blank side on tablet/mobile inherits the tier above.
 * The editor writes only the tier the operator touched; `ResponsiveOverride`
 * supplies the inherited-value indicator + keyboard reset (WCAG 2.2, FR-S9-6).
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	BoxControl,
	__experimentalUnitControl as UnitControl,
	SelectControl,
} from '@wordpress/components';
import ResponsiveOverride from './ResponsiveOverride';

/** Units offered in the BoxControl / UnitControl inputs. */
const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

/** contentWidth tokens — mirror the PHP resolver (normal→content-size, wide→wide-size, full→no cap). */
const CONTENT_WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Normal (content width)', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
];

/**
 * Collapse an all-empty BoxControl object to '' so the tier is cleared (→ inherit),
 * rather than storing an empty `{}` that would still count as an override.
 *
 * @param {Object|undefined} box BoxControl value.
 * @return {Object|string} The box object, or '' when every side is empty.
 */
const normaliseBox = ( box ) => {
	if ( ! box || typeof box !== 'object' ) {
		return '';
	}
	const hasAny = Object.values( box ).some(
		( v ) => v !== undefined && v !== null && v !== ''
	);
	return hasAny ? box : '';
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes ({ padding, margin, maxWidth, contentWidth }).
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {boolean}  [props.initialOpen=false] PanelBody initial state.
 * @return {JSX.Element} The inspector panel.
 */
export default function ResponsiveBoxControls( {
	attributes,
	setAttributes,
	initialOpen = false,
} ) {
	const { padding, margin, maxWidth, contentWidth } = attributes;

	return (
		<PanelBody
			title={ __( 'Spacing & width (per device)', 'sgs-blocks' ) }
			initialOpen={ initialOpen }
		>
			<ResponsiveOverride
				label={ __( 'Padding', 'sgs-blocks' ) }
				value={ padding }
				onChange={ ( obj ) => setAttributes( { padding: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<BoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						hideLabelFromVision
						values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
						units={ LENGTH_UNITS }
						onChange={ ( next ) => setOwnValue( normaliseBox( next ) ) }
					/>
				) }
			</ResponsiveOverride>

			<ResponsiveOverride
				label={ __( 'Margin', 'sgs-blocks' ) }
				value={ margin }
				onChange={ ( obj ) => setAttributes( { margin: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<BoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						hideLabelFromVision
						values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
						units={ LENGTH_UNITS }
						onChange={ ( next ) => setOwnValue( normaliseBox( next ) ) }
					/>
				) }
			</ResponsiveOverride>

			<ResponsiveOverride
				label={ __( 'Max width', 'sgs-blocks' ) }
				value={ maxWidth }
				onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<UnitControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						hideLabelFromVision
						units={ LENGTH_UNITS }
						value={ ownValue || '' }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ ( v ) => setOwnValue( v || '' ) }
					/>
				) }
			</ResponsiveOverride>

			<ResponsiveOverride
				label={ __( 'Content width', 'sgs-blocks' ) }
				value={ contentWidth }
				onChange={ ( obj ) => setAttributes( { contentWidth: obj } ) }
			>
				{ ( { tier, ownValue, setOwnValue } ) => (
					<SelectControl
						label={ __( 'Content width', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue || '' }
						options={
							tier === 'desktop'
								? CONTENT_WIDTH_OPTIONS
								: [
										{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
										...CONTENT_WIDTH_OPTIONS,
								  ]
						}
						onChange={ ( v ) => setOwnValue( v ) }
						__nextHasNoMarginBottom
					/>
				) }
			</ResponsiveOverride>
		</PanelBody>
	);
}
