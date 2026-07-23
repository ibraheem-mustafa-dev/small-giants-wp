import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl } from '@wordpress/components';
import {
	ResponsiveOverride,
	SpacingControl,
	ResponsiveBoxControls,
} from '../../components';

// No allowedBlocks restriction: site-header-row is a container-equivalent (like
// sgs/container in free mode) — it accepts ANY block, not a curated palette. The
// row's job is layout, not gatekeeping content.

// Row layout maps to the shared wrapper's `layout` attr. Cluster = a wrapping
// flex row (unlike items: logo + nav + cart); Columns = an equal-width grid of
// N per device that stacks to 1 on mobile (same engine as the footer columns
// row). Every row chooses independently — its own block instance, own attrs.
const LAYOUT_OPTIONS = [
	{ label: __( 'Cluster (wraps)', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Columns (grid)', 'sgs-blocks' ), value: 'grid' },
];

// Distribution maps to the shared wrapper's justifyContent attr (cluster only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __(
		'Top row — utility strip (contact, search, social)',
		'sgs-blocks'
	),
	middle: __( 'Middle row — logo, navigation, cart', 'sgs-blocks' ),
	bottom: __( 'Bottom row — message / business info', 'sgs-blocks' ),
};

// Bridge the three flat count attrs to the {desktop,tablet,mobile} object shape
// the ResponsiveOverride switcher expects — identical to site-footer-row.
const COUNT_ATTR = {
	desktop: 'columns',
	tablet: 'columnsTablet',
	mobile: 'columnsMobile',
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		rowSlot,
		layout,
		justifyContent,
		gap,
		columns,
		columnsTablet,
		columnsMobile,
	} = attributes;

	const isGrid = 'grid' === layout;

	const countValue = {
		...( columns !== undefined ? { desktop: columns } : {} ),
		...( columnsTablet !== undefined ? { tablet: columnsTablet } : {} ),
		...( columnsMobile !== undefined ? { mobile: columnsMobile } : {} ),
	};
	const onCountChange = ( obj ) =>
		setAttributes( {
			[ COUNT_ATTR.desktop ]: obj.desktop,
			[ COUNT_ATTR.tablet ]: obj.tablet,
			[ COUNT_ATTR.mobile ]: obj.mobile,
		} );

	// Editor preview mirrors the frontend: grid rows preview as an equal-count
	// column grid at the desktop tier, cluster rows as a wrapping flex row. The
	// never-overflow guarantee (flex-wrap + min-width:0) comes from style.css.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns: `repeat(${ columns || 3 }, 1fr)`,
				gap: ( gap && gap.desktop ) || '16px',
		  }
		: {
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: ( gap && gap.desktop ) || 'clamp(0.5rem, 2vw, 1.5rem)',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-header-row${
			rowSlot ? ` sgs-site-header-row--${ rowSlot }` : ''
		}`,
		style: previewStyle,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		templateLock: false,
		orientation: 'horizontal',
		renderAppender: undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Header row', 'sgs-blocks' ) }>
					{ rowSlot && (
						<p className="components-base-control__help">
							{ ROW_LABELS[ rowSlot ] || rowSlot }
						</p>
					) }
					<SelectControl
						label={ __( 'Row layout', 'sgs-blocks' ) }
						value={ layout || 'flex' }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { layout: val } ) }
						help={ __(
							'Cluster: elements sit in a row and wrap when cramped. Columns: an equal grid of N columns that stacks to 1 on mobile.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ countValue }
							onChange={ onCountChange }
						>
							{ ( {
								ownValue,
								effectiveValue,
								inherited,
								setOwnValue,
							} ) => {
								const shown = inherited
									? effectiveValue
									: ownValue;
								return (
									<RangeControl
										value={
											typeof shown === 'number'
												? shown
												: 3
										}
										onChange={ ( val ) =>
											setOwnValue( val )
										}
										min={ 1 }
										max={ 6 }
										help={ __(
											'How many columns at this device. They stack to 1 on mobile automatically — leave a device blank to inherit the one above.',
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveOverride>
					) }
					{ ! isGrid && (
						<SelectControl
							label={ __( 'Distribution', 'sgs-blocks' ) }
							value={ justifyContent || '' }
							options={ DISTRIBUTION_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { justifyContent: val } )
							}
							help={ __(
								'How elements spread across the row. Elements always wrap to a new line rather than overflowing.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					<ResponsiveOverride
						label={ __( 'Gap between elements', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
				<ResponsiveBoxControls
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
