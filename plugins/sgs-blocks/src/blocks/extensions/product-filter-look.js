/**
 * "Look" extension for WooCommerce's category chips and sort control.
 *
 * Adds settings to `woocommerce/product-filter-chips` (the chips of a category, attribute or brand filter)
 * and `woocommerce/catalog-sorting` (the "Sort by" select) ONLY. Every default is empty or off, which changes
 * nothing; set values are painted on the frontend by includes/product-filter-look.php as scoped rules.
 *
 * Chips: `sgsChipFontWeight`, `sgsChipBorderWidth`, `sgsChipPaintButtons` (print the colours picked on the block onto
 * the chip buttons, resting and chosen), and a count pill (`sgsChipCountPill`, `sgsChipCountBackground`,
 * `sgsChipCountColour`, `sgsChipCountRadius`).
 * Sort: `sgsSortBackground`, `sgsSortBorderColour`, `sgsSortBorderWidth`, `sgsSortBorderRadius`, `sgsSortFontWeight`.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import SgsLengthControl from '../../components/SgsLengthControl';
import DesignTokenPicker, { resolveColourToken } from '../../components/DesignTokenPicker';
import './product-filter-look.scss';

const CHIPS_BLOCK = 'woocommerce/product-filter-chips';
const SORT_BLOCK = 'woocommerce/catalog-sorting';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

const WEIGHT_OPTIONS = [
	{ value: '', label: __( 'Default', 'sgs-blocks' ) },
	{ value: '400', label: __( 'Regular (400)', 'sgs-blocks' ) },
	{ value: '500', label: __( 'Medium (500)', 'sgs-blocks' ) },
	{ value: '600', label: __( 'Semi-bold (600)', 'sgs-blocks' ) },
	{ value: '700', label: __( 'Bold (700)', 'sgs-blocks' ) },
	{ value: '800', label: __( 'Extra bold (800)', 'sgs-blocks' ) },
];

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsFilterLookRegistered ) {
	window.__sgsFilterLookRegistered = true;

	addFilter( 'blocks.registerBlockType', 'sgs/product-filter-look/attributes', ( settings, name ) => {
		if ( CHIPS_BLOCK === name ) {
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsChipFontWeight: { type: 'string', default: '' },
					sgsChipBorderWidth: { type: 'string', default: '' },
					sgsChipPaintButtons: { type: 'boolean', default: false },
					sgsChipCountPill: { type: 'boolean', default: false },
					sgsChipCountBackground: { type: 'string', default: '' },
					sgsChipCountColour: { type: 'string', default: '' },
					sgsChipCountRadius: { type: 'string', default: '' },
				},
			};
		}
		if ( SORT_BLOCK === name ) {
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsSortBackground: { type: 'string', default: '' },
					sgsSortBorderColour: { type: 'string', default: '' },
					sgsSortBorderWidth: { type: 'string', default: '' },
					sgsSortBorderRadius: { type: 'string', default: '' },
					sgsSortFontWeight: { type: 'string', default: '' },
				},
			};
		}
		return settings;
	} );

	const colourControl = ( label, attributes, setAttributes, key, help ) => (
		<DesignTokenPicker
			linked
			clearable
			label={ label }
			help={ help }
			states={ [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes[ key ] || '',
					onChange: ( picked ) => setAttributes( { [ key ]: picked || '' } ),
					linked: true,
				},
			] }
		/>
	);

	const weightControl = ( label, attributes, setAttributes, key ) => (
		<SelectControl
			label={ label }
			value={ attributes[ key ] || '' }
			options={ WEIGHT_OPTIONS }
			onChange={ ( val ) => setAttributes( { [ key ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	const withFilterLookControls = createHigherOrderComponent( ( BlockEdit ) => ( props ) => {
		const { name, attributes, setAttributes } = props;
		if ( CHIPS_BLOCK !== name && SORT_BLOCK !== name ) {
			return <BlockEdit { ...props } />;
		}
		const empty = __( 'Leave empty to keep the default.', 'sgs-blocks' );
		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls group="styles">
					{ CHIPS_BLOCK === name && (
						<PanelBody title={ __( 'Chip look', 'sgs-blocks' ) } initialOpen={ false }>
							{ weightControl( __( 'Chip font weight', 'sgs-blocks' ), attributes, setAttributes, 'sgsChipFontWeight' ) }
							<SgsLengthControl
								scale="spacing"
								label={ __( 'Chip border width', 'sgs-blocks' ) }
								value={ attributes.sgsChipBorderWidth || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { sgsChipBorderWidth: val || '' } ) }
								help={ empty }
							/>
							<ToggleControl
								label={ __( 'Paint the chip colours onto the buttons', 'sgs-blocks' ) }
								help={ __( 'Prints this block’s chip, border and chosen-chip colours directly on each chip button. Off keeps the theme’s chip look.', 'sgs-blocks' ) }
								checked={ !! attributes.sgsChipPaintButtons }
								onChange={ ( val ) => setAttributes( { sgsChipPaintButtons: !! val } ) }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Show the count as a pill', 'sgs-blocks' ) }
								help={ __( 'Needs “Display product counts” on the filter.', 'sgs-blocks' ) }
								checked={ !! attributes.sgsChipCountPill }
								onChange={ ( val ) => setAttributes( { sgsChipCountPill: !! val } ) }
								__nextHasNoMarginBottom
							/>
							{ !! attributes.sgsChipCountPill && (
								<>
									{ colourControl( __( 'Count pill fill', 'sgs-blocks' ), attributes, setAttributes, 'sgsChipCountBackground', empty ) }
									{ colourControl( __( 'Count pill text colour', 'sgs-blocks' ), attributes, setAttributes, 'sgsChipCountColour', empty ) }
									<SgsLengthControl
										scale="spacing"
										label={ __( 'Count pill corner radius', 'sgs-blocks' ) }
										value={ attributes.sgsChipCountRadius || '' }
										units={ LENGTH_UNITS }
										onChange={ ( val ) => setAttributes( { sgsChipCountRadius: val || '' } ) }
										help={ __( 'Empty makes a full pill.', 'sgs-blocks' ) }
									/>
								</>
							) }
						</PanelBody>
					) }
					{ SORT_BLOCK === name && (
						<PanelBody title={ __( 'Sort control look', 'sgs-blocks' ) } initialOpen={ false }>
							{ colourControl( __( 'Fill', 'sgs-blocks' ), attributes, setAttributes, 'sgsSortBackground', empty ) }
							{ colourControl( __( 'Border colour', 'sgs-blocks' ), attributes, setAttributes, 'sgsSortBorderColour', empty ) }
							<SgsLengthControl
								scale="spacing"
								label={ __( 'Border width', 'sgs-blocks' ) }
								value={ attributes.sgsSortBorderWidth || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { sgsSortBorderWidth: val || '' } ) }
								help={ empty }
							/>
							<SgsLengthControl
								scale="spacing"
								label={ __( 'Corner radius', 'sgs-blocks' ) }
								value={ attributes.sgsSortBorderRadius || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { sgsSortBorderRadius: val || '' } ) }
								help={ empty }
							/>
							{ weightControl( __( 'Font weight', 'sgs-blocks' ), attributes, setAttributes, 'sgsSortFontWeight' ) }
						</PanelBody>
					) }
				</InspectorControls>
			</>
		);
	}, 'withFilterLookControls' );

	addFilter( 'editor.BlockEdit', 'sgs/product-filter-look/controls', withFilterLookControls );

	/**
	 * Editor preview: each set setting becomes a custom property plus a modifier class on the block wrapper
	 * (custom properties only: Spec 32 forbids inline declarations), read by product-filter-look.scss.
	 */
	const withFilterLookPreview = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
		const [ palette ] = useSettings( 'color.palette' );
		const { attributes, name } = props;
		if ( ( CHIPS_BLOCK !== name && SORT_BLOCK !== name ) || ! attributes ) {
			return <BlockListBlock { ...props } />;
		}
		const colour = ( ...values ) => {
			const raw = values.find( Boolean );
			return raw ? resolveColourToken( raw, palette ) : '';
		};
		let rows;
		if ( CHIPS_BLOCK === name ) {
			const paint = true === attributes.sgsChipPaintButtons;
			const pill = true === attributes.sgsChipCountPill;
			rows = [
				[ 'chip-weight', attributes.sgsChipFontWeight ],
				[ 'chip-border-width', attributes.sgsChipBorderWidth ],
				[ 'chip-fill', paint && colour( attributes.customChipBackground, attributes.chipBackground ) ],
				[ 'chip-edge', paint && colour( attributes.customChipBorder, attributes.chipBorder ) ],
				[ 'chip-text', paint && colour( attributes.customChipText, attributes.chipText ) ],
				[ 'chip-chosen-fill', paint && colour( attributes.customSelectedChipBackground, attributes.selectedChipBackground ) ],
				[ 'chip-chosen-edge', paint && colour( attributes.customSelectedChipBorder, attributes.selectedChipBorder ) ],
				[ 'chip-chosen-text', paint && colour( attributes.customSelectedChipText, attributes.selectedChipText ) ],
				[ 'count-pill', pill && 'on' ],
				[ 'count-fill', pill && colour( attributes.sgsChipCountBackground ) ],
				[ 'count-text', pill && colour( attributes.sgsChipCountColour ) ],
			];
		} else {
			rows = [
				[ 'sort-fill', colour( attributes.sgsSortBackground ) ],
				[ 'sort-border-width', attributes.sgsSortBorderWidth ],
				[ 'sort-edge', colour( attributes.sgsSortBorderColour ) ],
				[ 'sort-radius', attributes.sgsSortBorderRadius ],
				[ 'sort-weight', attributes.sgsSortFontWeight ],
			];
		}
		const style = {};
		const classes = [];
		rows.forEach( ( [ key, value ] ) => {
			if ( value ) {
				classes.push( `sgs-filter-look-preview--${ key }` );
				style[ `--sgs-fl-${ key }` ] = value;
			}
		} );
		if ( CHIPS_BLOCK === name && attributes.sgsChipCountRadius ) {
			style[ '--sgs-fl-count-radius' ] = attributes.sgsChipCountRadius;
		}
		if ( ! classes.length ) {
			return <BlockListBlock { ...props } />;
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, ...classes ].filter( Boolean ).join( ' ' ),
			style: { ...( props.wrapperProps?.style || {} ), ...style },
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}, 'withFilterLookPreview' );

	addFilter( 'editor.BlockListBlock', 'sgs/product-filter-look/preview', withFilterLookPreview );
} // end guard: window.__sgsFilterLookRegistered
