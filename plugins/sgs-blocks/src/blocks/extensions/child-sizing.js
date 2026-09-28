/**
 * Child sizing: how a block sizes itself inside a flex row.
 *
 * WordPress core answers this with `layout.selfStretch` (fit / fill / fixed +
 * `flexSize`) in the Dimensions panel. SGS blocks replace native supports with
 * their own controls, so this is the SGS equivalent: one shared, per-device
 * control any block can opt into with
 *
 *   "supports": { "sgs": { "enabledExtensions": [ "childSizing" ] } }
 *
 * Attributes (per tier, `{desktop,tablet,mobile}`; a blank tablet/mobile tier
 * inherits the tier above):
 *   - sgsChildSizing: '' (the block's natural size) | 'fit' | 'fill' | 'fixed'
 *   - sgsChildWidth:  a CSS length, read when the tier's sizing is 'fixed'
 *
 * The frontend rules come from includes/child-sizing.php (render_block, a
 * scoped <style>, never an inline style). The editor preview below adds a
 * modifier class and, for 'fixed', one custom property on the block wrapper;
 * the declarations live in child-sizing.scss.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { isExtensionEnabled } from './hide-extensions';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import SgsLengthControl from '../../components/SgsLengthControl';
import { resolveResponsiveTier } from '../../utils/responsive';

const SLUG = 'childSizing';
const MODES = [ 'fit', 'fill', 'fixed' ];
const DEVICE_TO_TIER = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };
const WIDTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: 'vw', label: 'vw' },
];

const MODE_OPTIONS = [
	{ value: '', label: __( 'Natural (the block decides)', 'sgs-blocks' ) },
	{ value: 'fit', label: __( 'Fit content', 'sgs-blocks' ) },
	{ value: 'fill', label: __( 'Fill remaining space', 'sgs-blocks' ) },
	{ value: 'fixed', label: __( 'Fixed width', 'sgs-blocks' ) },
];
const MODE_OPTIONS_TIER = [
	{ value: '', label: __( '— Same as the larger screen —', 'sgs-blocks' ) },
	...MODE_OPTIONS.slice( 1 ),
];

addFilter( 'blocks.registerBlockType', 'sgs/child-sizing/attributes', ( settings ) => {
	if ( ! isExtensionEnabled( settings, SLUG ) ) {
		return settings;
	}
	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsChildSizing: { type: 'object', default: {} },
			sgsChildWidth: { type: 'object', default: {} },
		},
	};
} );

/**
 * The active editor device as a tier key.
 *
 * @return {string} 'desktop' | 'tablet' | 'mobile'.
 */
function useActiveTier() {
	return useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device = ed && 'function' === typeof ed.getDeviceType ? ed.getDeviceType() : null;
		return DEVICE_TO_TIER[ device ] || 'desktop';
	}, [] );
}

function ChildSizingPanel( { attributes, setAttributes } ) {
	const sizing = attributes.sgsChildSizing || {};
	const widths = attributes.sgsChildWidth || {};

	return (
		<PanelBody title={ __( 'Size in row', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveOverride
				label={ __( 'Sizing', 'sgs-blocks' ) }
				value={ sizing }
				onChange={ ( obj ) => setAttributes( { sgsChildSizing: obj } ) }
			>
				{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
					const ownWidth = widths[ tier ] || '';
					const inheritedWidth = resolveResponsiveTier( widths, tier ).value || '';
					return (
						<>
							<SelectControl
								label={ __( 'Sizing', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue }
								options={ 'desktop' === tier ? MODE_OPTIONS : MODE_OPTIONS_TIER }
								onChange={ setOwnValue }
								help={ __( 'Applies when this block sits in a row: a header or footer row, or a container set to Flex. Fill takes the space the other blocks leave.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ 'fixed' === effectiveValue && (
								<SgsLengthControl
									label={ __( 'Width', 'sgs-blocks' ) }
									value={ ownWidth }
									placeholder={ ownWidth ? undefined : inheritedWidth }
									units={ WIDTH_UNITS }
									onChange={ ( raw ) => {
										const next = { ...widths };
										if ( raw ) {
											next[ tier ] = raw;
										} else {
											delete next[ tier ];
										}
										setAttributes( { sgsChildWidth: next } );
									} }
								/>
							) }
						</>
					);
				} }
			</ResponsiveOverride>
		</PanelBody>
	);
}

const withChildSizingControls = createHigherOrderComponent( ( BlockEdit ) => ( props ) => {
	if ( ! isExtensionEnabled( props.name, SLUG ) ) {
		return <BlockEdit { ...props } />;
	}
	return (
		<>
			<BlockEdit { ...props } />
			<InspectorControls group="styles">
				<ChildSizingPanel attributes={ props.attributes } setAttributes={ props.setAttributes } />
			</InspectorControls>
		</>
	);
}, 'withChildSizingControls' );

addFilter( 'editor.BlockEdit', 'sgs/child-sizing/controls', withChildSizingControls );

/**
 * Editor preview on the block wrapper (the flex item in the canvas): a
 * modifier class for the active tier's mode, and the width as a custom
 * property. Custom properties only, as fx.js's grid-dots preview: Spec 32
 * forbids inline property declarations; the rules are in child-sizing.scss.
 */
const withChildSizingPreview = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
	const tier = useActiveTier();
	const { attributes, name } = props;
	if ( ! attributes?.sgsChildSizing || ! isExtensionEnabled( name, SLUG ) ) {
		return <BlockListBlock { ...props } />;
	}
	const mode = resolveResponsiveTier( attributes.sgsChildSizing, tier ).value;
	if ( ! MODES.includes( mode ) ) {
		return <BlockListBlock { ...props } />;
	}
	const width = 'fixed' === mode ? resolveResponsiveTier( attributes.sgsChildWidth || {}, tier ).value : '';
	const wrapperProps = {
		...( props.wrapperProps || {} ),
		className: [ props.wrapperProps?.className, `sgs-child-sizing--${ mode }` ].filter( Boolean ).join( ' ' ),
		style: {
			...( props.wrapperProps?.style || {} ),
			...( width ? { '--sgs-child-width': width } : {} ),
		},
	};
	return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
}, 'withChildSizingPreview' );

addFilter( 'editor.BlockListBlock', 'sgs/child-sizing/preview', withChildSizingPreview );
