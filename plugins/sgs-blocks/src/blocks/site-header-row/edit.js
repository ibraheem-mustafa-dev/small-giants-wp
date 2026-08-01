import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl } from '@wordpress/components';
import {
	ResponsiveOverride,
	SpacingControl,
	ResponsiveBoxControls,
	RowQuickInsertAppender,
	RowScrollBehaviourControls,
} from '../../components';

// Promoted common header elements (Spec 37 §3.5 / FR-37-34). Steering, not
// gating: the row still accepts ANY block via the normal inserter — this list
// only fast-paths the elements a header typically needs, as placeholder
// quick-insert buttons AND a prioritised position in the block inserter.
// Slugs verified against plugins/sgs-blocks/src/blocks/*/block.json.
const HEADER_PROMOTED = [
	{ slug: 'sgs/responsive-logo', label: __( 'Logo', 'sgs-blocks' ) },
	{ slug: 'sgs/nav-menu', label: __( 'Navigation', 'sgs-blocks' ) },
	{ slug: 'sgs/product-search', label: __( 'Search', 'sgs-blocks' ) },
	{ slug: 'sgs/cart', label: __( 'Cart', 'sgs-blocks' ) },
	{
		slug: 'sgs/button',
		variant: 'account',
		label: __( 'Account link', 'sgs-blocks' ),
		attributes: {
			label: __( 'My Account', 'sgs-blocks' ),
			url: '/my-account/',
			inheritStyle: 'outline',
		},
	},
	{
		slug: 'sgs/button',
		variant: 'cta',
		label: __( 'Call to action', 'sgs-blocks' ),
		attributes: {
			label: __( 'Get In Touch', 'sgs-blocks' ),
			inheritStyle: 'primary',
		},
	},
	{
		slug: 'sgs/business-info',
		variant: 'phone',
		label: __( 'Contact details', 'sgs-blocks' ),
		attributes: { displayType: 'phone' },
	},
];
const HEADER_PROMOTED_SLUGS = [
	...new Set( HEADER_PROMOTED.map( ( item ) => item.slug ) ),
];

// No allowedBlocks restriction: site-header-row is a container-equivalent (like
// sgs/container in free mode) — it accepts ANY block, not a curated palette. The
// row's job is layout, not gatekeeping content.

// Row layout maps to the shared wrapper's `layout` attr. Cluster = a wrapping
// flex row (unlike items: logo + nav + cart); Columns = an equal-width grid of
// N per device that stacks to 1 on mobile (same engine as the footer columns
// row). Every row chooses independently — its own block instance, own attrs.
const LAYOUT_OPTIONS = [
	{ label: __( 'Cluster (one line)', 'sgs-blocks' ), value: 'flex' },
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

export default function Edit( { attributes, setAttributes, clientId } ) {
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

	// Editor-preview only: "Show me the shrunk size" (Row behaviour panel).
	// Local UI state — never persisted, never rendered on the front end.
	const [ previewShrunk, setPreviewShrunk ] = useState( false );

	// The editor preview previously ignored the row's padding entirely, so an
	// operator could not see their own spacing OR what shrink would do to it.
	// Mirror the desktop tier here (the tier the editor canvas represents), and
	// halve top/bottom while previewing — the same 0.5 ratio render.php emits.
	const previewPad = ( attributes.padding && attributes.padding.desktop ) || {};
	const halved = ( value ) =>
		value ? `calc(${ value } / 2)` : value;
	const paddingPreview = {
		...( previewPad.top
			? {
					paddingTop: previewShrunk
						? halved( previewPad.top )
						: previewPad.top,
			  }
			: {} ),
		...( previewPad.bottom
			? {
					paddingBottom: previewShrunk
						? halved( previewPad.bottom )
						: previewPad.bottom,
			  }
			: {} ),
		...( previewPad.left ? { paddingLeft: previewPad.left } : {} ),
		...( previewPad.right ? { paddingRight: previewPad.right } : {} ),
	};

	// Empty-row detection drives the promoted quick-insert placeholder — once
	// the operator adds any block (promoted or otherwise), this reverts to
	// the normal (unrestricted) appender behaviour.
	const hasInnerBlocks = useSelect(
		( select ) =>
			!! select( blockEditorStore ).getBlock( clientId )?.innerBlocks
				?.length,
		[ clientId ]
	);

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
	// column grid at the desktop tier; cluster rows NEVER wrap (D455) — they
	// yield by shrinking their children, mirroring style.css's nowrap lock. The
	// never-overflow guarantee (nowrap + min-width:0 + per-child floors) comes
	// from style.css.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns: `repeat(${ columns || 3 }, 1fr)`,
				gap: ( gap && gap.desktop ) || '16px',
		  }
		: {
				display: 'flex',
				// D455 — mirrors the frontend lock. The row never wraps or
				// stacks; it yields by shrinking its children instead.
				flexWrap: 'nowrap',
				alignItems: 'center',
				// Matches block.json's gap default. This previously fell back to
				// `clamp(0.5rem, 2vw, 1.5rem)` while block.json said `16px`, so
				// the editor preview and the front end disagreed by up to 8px.
				gap: ( gap && gap.desktop ) || '16px',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-header-row${
			rowSlot ? ` sgs-site-header-row--${ rowSlot }` : ''
		}`,
		style: { ...previewStyle, ...paddingPreview },
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		templateLock: false,
		orientation: 'horizontal',
		renderAppender: hasInnerBlocks
			? undefined
			: () => (
					<RowQuickInsertAppender
						clientId={ clientId }
						promoted={ HEADER_PROMOTED }
						label={ __( 'Add a header element', 'sgs-blocks' ) }
						instructions={ __(
							'Choose a common header element below, or use the block inserter (+) for anything else.',
							'sgs-blocks'
						) }
					/>
			  ),
		prioritizedInserterBlocks: HEADER_PROMOTED_SLUGS,
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
							'Cluster: elements stay on one line at every screen size, shrinking to fit rather than stacking. Columns: an equal grid of N columns that stacks to 1 on mobile.',
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
								'How elements spread across the row. They stay on one line at every screen size and shrink to fit, so nothing ever wraps or runs off the edge.',
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
				<RowScrollBehaviourControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					clientId={ clientId }
					previewShrunk={ previewShrunk }
					setPreviewShrunk={ setPreviewShrunk }
				/>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
