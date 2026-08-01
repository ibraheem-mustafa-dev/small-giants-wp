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

// Promoted common footer elements (Spec 37 §3.5 / FR-37-34). Steering, not
// gating: the row still accepts ANY block via the normal inserter — this list
// only fast-paths the elements a footer typically needs, as placeholder
// quick-insert buttons AND a prioritised position in the block inserter.
// Slugs verified against plugins/sgs-blocks/src/blocks/*/block.json.
const FOOTER_PROMOTED = [
	{
		slug: 'sgs/business-info',
		variant: 'address',
		label: __( 'Business info', 'sgs-blocks' ),
		attributes: { displayType: 'address' },
	},
	{
		slug: 'sgs/business-info',
		variant: 'phone',
		label: __( 'Contact details', 'sgs-blocks' ),
		attributes: { displayType: 'phone' },
	},
	{ slug: 'sgs/social-icons', label: __( 'Social links', 'sgs-blocks' ) },
	{ slug: 'sgs/nav-menu', label: __( 'Footer navigation', 'sgs-blocks' ) },
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
		variant: 'copyright',
		label: __( 'Copyright line', 'sgs-blocks' ),
		attributes: { displayType: 'copyright' },
	},
];
const FOOTER_PROMOTED_SLUGS = [
	...new Set( FOOTER_PROMOTED.map( ( item ) => item.slug ) ),
];

// No allowedBlocks restriction: site-footer-row is a container-equivalent (like
// sgs/container in free mode) — it accepts ANY block, not a curated palette.

// Distribution maps to the shared wrapper's justifyContent attr (flex rows only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

// Row layout maps to the shared wrapper's `layout` attr — Cluster (wrapping flex)
// or Columns (equal grid of N per device, stacks to 1 on mobile). Every row
// chooses independently. The footer's `columns` row defaults to grid; the CTA and
// copyright strips default to cluster, but any of them can switch.
const LAYOUT_OPTIONS = [
	{ label: __( 'Cluster (wraps)', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Columns (grid)', 'sgs-blocks' ), value: 'grid' },
];

const ROW_LABELS = {
	top: __( 'Top row — CTA / newsletter strip', 'sgs-blocks' ),
	columns: __(
		'Columns row — up to 6 columns (collapse to 1 on mobile)',
		'sgs-blocks'
	),
	bottom: __( 'Bottom bar — copyright / legal / attribution', 'sgs-blocks' ),
};

// Columns are an operator-set COUNT per device (Spec 37 §3.3, Bean-locked), NOT
// a CSS grid-template ratio string. These map 1:1 onto the shared wrapper's flat
// integer attrs (class-sgs-container-wrapper.php:149-154), rendered as scoped
// per-tier rules at the grid selector.
//
// D455: for THIS block the count is a CEILING, not a fixed number. block.json
// declares `supports.sgs.intrinsicColumns`, so the wrapper emits a bounded
// auto-fit track list per tier instead of `repeat(N,1fr)` — fewer columns are
// used automatically once content stops fitting, continuously, rather than at a
// pixel cliff. Measured live before the change: all three rows dropped 3 tracks
// to 1 between viewport 768px and 767px while content needed only 496px of the
// 767px available. Hence the inspector says "Maximum columns", not "Columns" —
// a control that promised an exact count would now be lying.
// (Until 2026-07-23 the tiers rode on `sgs-cols-*` classes instead —
// removed because they addressed the wrapper while the grid had moved to
// `.sgs-container__inner`, so mobile never stacked. FR-37-11.)
// The ResponsiveOverride device switcher wants a {desktop,tablet,mobile} object,
// so we bridge the three flat attrs to that shape and back — no gridTemplateColumns
// string is ever written from this control. A per-device custom template remains
// available as an advanced override by setting gridTemplateColumns directly.
const COUNT_ATTR = {
	desktop: 'columns',
	tablet: 'columnsTablet',
	mobile: 'columnsMobile',
};

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		rowSlot,
		layout,
		gap,
		columns,
		columnsTablet,
		columnsMobile,
		justifyContent,
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
	const halved = ( value ) => ( value ? `calc(${ value } / 2)` : value );
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

	// Bridge the three flat count attrs to the object shape ResponsiveOverride
	// expects. A tier is present only when its attr is set, so a blank tablet /
	// mobile reads as "inherit" in the switcher.
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
	// column grid at the desktop tier, flex rows as a wrapping cluster.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns: `repeat(${ columns || 3 }, 1fr)`,
				gap: ( gap && gap.desktop ) || '48px',
		  }
		: {
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: ( gap && gap.desktop ) || 'clamp(0.5rem, 2vw, 1.5rem)',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-footer-row${
			rowSlot ? ` sgs-site-footer-row--${ rowSlot }` : ''
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
						promoted={ FOOTER_PROMOTED }
						label={ __( 'Add a footer element', 'sgs-blocks' ) }
						instructions={ __(
							'Choose a common footer element below, or use the block inserter (+) for anything else.',
							'sgs-blocks'
						) }
					/>
			  ),
		prioritizedInserterBlocks: FOOTER_PROMOTED_SLUGS,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Footer row', 'sgs-blocks' ) }>
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
							label={ __( 'Maximum columns', 'sgs-blocks' ) }
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
											'The MOST columns to show at this device — fewer are used automatically when there is not enough room, right down to a single column on a narrow phone. Leave a device blank to inherit the one above.',
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
						label={ __( 'Gap', 'sgs-blocks' ) }
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
