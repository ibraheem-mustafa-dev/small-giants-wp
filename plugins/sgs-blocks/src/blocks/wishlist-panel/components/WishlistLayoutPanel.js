/**
 * SGS Wishlist Panel — "Layout" inspector panel.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	RangeControl,
	SelectControl,
} from '@wordpress/components';
import { UnitControl } from '../../../components/primitives';
import { ResponsiveControl } from '../../../components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function WishlistLayoutPanel( { attributes, setAttributes } ) {
	const {
		heading,
		emptyText,
		emptyLinkLabel,
		showWhenEmpty,
		showPrice,
		showStock,
		showCount,
		columns,
		gap,
		layout,
		maxItems,
		viewAllLabel,
		viewAllUrl,
	} = attributes;

	return (
		<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Layout', 'sgs-blocks' ) }
				value={ layout }
				options={ [
					{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
					{ label: __( 'List', 'sgs-blocks' ), value: 'list' },
					{ label: __( 'Strip (scrolling row)', 'sgs-blocks' ), value: 'strip' },
				] }
				onChange={ ( value ) => setAttributes( { layout: value } ) }
			/>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Heading', 'sgs-blocks' ) }
				value={ heading }
				onChange={ ( value ) => setAttributes( { heading: value } ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show the count in the heading', 'sgs-blocks' ) }
				checked={ !! showCount }
				onChange={ ( value ) => setAttributes( { showCount: value } ) }
			/>
			{ 'strip' === layout && (
				<>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Rows to show (0 = all)', 'sgs-blocks' ) }
						min={ 0 }
						max={ 12 }
						value={ maxItems }
						onChange={ ( value ) => setAttributes( { maxItems: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( '"View all" link label', 'sgs-blocks' ) }
						value={ viewAllLabel }
						onChange={ ( value ) => setAttributes( { viewAllLabel: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( '"View all" link URL', 'sgs-blocks' ) }
						help={ __(
							'Leave blank to use the Saved items page automatically.',
							'sgs-blocks'
						) }
						value={ viewAllUrl }
						onChange={ ( value ) => setAttributes( { viewAllUrl: value } ) }
					/>
				</>
			) }
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Empty-wishlist text', 'sgs-blocks' ) }
				value={ emptyText }
				onChange={ ( value ) => setAttributes( { emptyText: value } ) }
			/>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Empty-wishlist link label', 'sgs-blocks' ) }
				value={ emptyLinkLabel }
				onChange={ ( value ) => setAttributes( { emptyLinkLabel: value } ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show the panel even when the wishlist is empty', 'sgs-blocks' ) }
				help={ __(
					'Off by default on the cart page — the panel simply does not render for an empty wishlist.',
					'sgs-blocks'
				) }
				checked={ !! showWhenEmpty }
				onChange={ ( value ) => setAttributes( { showWhenEmpty: value } ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show price', 'sgs-blocks' ) }
				checked={ !! showPrice }
				onChange={ ( value ) => setAttributes( { showPrice: value } ) }
			/>
			{ 'strip' !== layout && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Show stock status', 'sgs-blocks' ) }
					checked={ !! showStock }
					onChange={ ( value ) => setAttributes( { showStock: value } ) }
				/>
			) }
			{ 'strip' !== layout && (
				<>
					<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Columns', 'sgs-blocks' ) }
								hideLabelFromVision
								min={ 1 }
								max={ 4 }
								value={ columns[ breakpoint ] ?? ( 'desktop' === breakpoint ? 3 : 1 ) }
								onChange={ ( value ) =>
									setAttributes( { columns: { ...columns, [ breakpoint ]: value } } )
								}
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Row gap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Row gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ gap[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									setAttributes( { gap: { ...gap, [ breakpoint ]: value } } )
								}
							/>
						) }
					</ResponsiveControl>
				</>
			) }
		</PanelBody>
	);
}
