/**
 * Float position: take a block out of the flow and place it by its edges, per device.
 *
 * A block opts in with
 *
 *   "supports": { "sgs": { "enabledExtensions": [ "floatPosition" ] } }
 *
 * Attributes (per tier, `{desktop,tablet,mobile}`; a blank tablet/mobile tier inherits the tier above):
 *   - sgsPosition:    '' (the block's own position) | 'static' | 'relative' | 'absolute'
 *   - sgsInsetTop, sgsInsetRight, sgsInsetBottom, sgsInsetLeft: a CSS length, read while the tier's position is
 *     relative or absolute
 *
 * The frontend rules come from includes/float-position.php (render_block, a scoped <style>, never an inline
 * style). The editor preview below adds a modifier class and the offsets as custom properties on the block
 * wrapper; the declarations live in float-position.scss.
 *
 * @package
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

const SLUG = 'floatPosition';
const MODES = [ 'static', 'relative', 'absolute' ];
const FLOATING = [ 'relative', 'absolute' ];
const DEVICE_TO_TIER = {
	Desktop: 'desktop',
	Tablet: 'tablet',
	Mobile: 'mobile',
};
const EDGES = [
	{ attr: 'sgsInsetTop', label: __( 'Top', 'sgs-blocks' ), property: 'top' },
	{
		attr: 'sgsInsetRight',
		label: __( 'Right', 'sgs-blocks' ),
		property: 'right',
	},
	{
		attr: 'sgsInsetBottom',
		label: __( 'Bottom', 'sgs-blocks' ),
		property: 'bottom',
	},
	{
		attr: 'sgsInsetLeft',
		label: __( 'Left', 'sgs-blocks' ),
		property: 'left',
	},
];
const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: 'vw', label: 'vw' },
];
const MODE_OPTIONS = [
	{
		value: '',
		label: __( 'In the layout (the block decides)', 'sgs-blocks' ),
	},
	{ value: 'static', label: __( 'In the flow, no offsets', 'sgs-blocks' ) },
	{ value: 'relative', label: __( 'In the flow, shifted', 'sgs-blocks' ) },
	{
		value: 'absolute',
		label: __( 'Floating over its container', 'sgs-blocks' ),
	},
];
const MODE_OPTIONS_TIER = [
	{ value: '', label: __( '— Same as the larger screen —', 'sgs-blocks' ) },
	...MODE_OPTIONS.slice( 1 ),
];

addFilter(
	'blocks.registerBlockType',
	'sgs/float-position/attributes',
	( settings ) => {
		if ( ! isExtensionEnabled( settings, SLUG ) ) {
			return settings;
		}
		return {
			...settings,
			attributes: {
				...settings.attributes,
				sgsPosition: { type: 'object', default: {} },
				sgsInsetTop: { type: 'object', default: {} },
				sgsInsetRight: { type: 'object', default: {} },
				sgsInsetBottom: { type: 'object', default: {} },
				sgsInsetLeft: { type: 'object', default: {} },
			},
		};
	}
);

/**
 * The active editor device as a tier key.
 *
 * @return {string} 'desktop' | 'tablet' | 'mobile'.
 */
function useActiveTier() {
	return useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && 'function' === typeof ed.getDeviceType
				? ed.getDeviceType()
				: null;
		return DEVICE_TO_TIER[ device ] || 'desktop';
	}, [] );
}

function FloatPositionPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Position', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ResponsiveOverride
				label={ __( 'Position', 'sgs-blocks' ) }
				value={ attributes.sgsPosition || {} }
				onChange={ ( obj ) => setAttributes( { sgsPosition: obj } ) }
			>
				{ ( { tier, effectiveValue, ownValue, setOwnValue } ) => (
					<>
						<SelectControl
							label={ __( 'Position', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ ownValue }
							options={
								'desktop' === tier
									? MODE_OPTIONS
									: MODE_OPTIONS_TIER
							}
							onChange={ setOwnValue }
							help={ __(
								'Floating takes the block out of the flow and places it from the edges of the nearest container.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ FLOATING.includes( effectiveValue ) &&
							EDGES.map( ( { attr, label } ) => {
								const obj = attributes[ attr ] || {};
								return (
									<SgsLengthControl
										key={ attr }
										label={ label }
										value={ obj[ tier ] || '' }
										placeholder={
											obj[ tier ]
												? undefined
												: resolveResponsiveTier(
														obj,
														tier
												  ).value || ''
										}
										units={ UNITS }
										onChange={ ( raw ) => {
											const next = { ...obj };
											if ( raw ) {
												next[ tier ] = raw;
											} else {
												delete next[ tier ];
											}
											setAttributes( { [ attr ]: next } );
										} }
									/>
								);
							} ) }
					</>
				) }
			</ResponsiveOverride>
		</PanelBody>
	);
}

const withFloatPositionControls = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		if ( ! isExtensionEnabled( props.name, SLUG ) ) {
			return <BlockEdit { ...props } />;
		}
		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls group="styles">
					<FloatPositionPanel
						attributes={ props.attributes }
						setAttributes={ props.setAttributes }
					/>
				</InspectorControls>
			</>
		);
	},
	'withFloatPositionControls'
);

addFilter(
	'editor.BlockEdit',
	'sgs/float-position/controls',
	withFloatPositionControls
);

/**
 * Editor preview on the block wrapper: a modifier class for the active tier's position and the offsets as custom
 * properties (Spec 32 forbids inline property declarations; the rules are in float-position.scss).
 */
const withFloatPositionPreview = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const tier = useActiveTier();
		const { attributes, name } = props;
		if ( ! attributes?.sgsPosition || ! isExtensionEnabled( name, SLUG ) ) {
			return <BlockListBlock { ...props } />;
		}
		const mode = resolveResponsiveTier(
			attributes.sgsPosition,
			tier
		).value;
		if ( ! MODES.includes( mode ) ) {
			return <BlockListBlock { ...props } />;
		}
		const vars = {};
		if ( FLOATING.includes( mode ) ) {
			EDGES.forEach( ( { attr, property } ) => {
				const value = resolveResponsiveTier(
					attributes[ attr ] || {},
					tier
				).value;
				if ( value ) {
					vars[ `--sgs-float-${ property }` ] = value;
				}
			} );
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [
				props.wrapperProps?.className,
				`sgs-float-position--${ mode }`,
			]
				.filter( Boolean )
				.join( ' ' ),
			style: { ...( props.wrapperProps?.style || {} ), ...vars },
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	},
	'withFloatPositionPreview'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/float-position/preview',
	withFloatPositionPreview
);
