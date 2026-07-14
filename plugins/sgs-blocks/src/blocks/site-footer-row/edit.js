import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { ResponsiveOverride, SpacingControl, ResponsiveBoxControls } from '../../components';

const ALLOWED_BLOCKS = [
	'core/group',
	'sgs/responsive-logo',
	'core/site-logo',
	'core/site-title',
	'core/heading',
	'core/paragraph',
	'core/list',
	'core/social-links',
	'core/html',
	'sgs/business-info',
	'sgs/button',
	'core/buttons',
];

// Distribution maps to the shared wrapper's justifyContent attr (flex rows only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __( 'Top row — CTA / newsletter strip', 'sgs-blocks' ),
	columns: __( 'Columns row — up to 6 columns (collapse to 1 on mobile)', 'sgs-blocks' ),
	bottom: __( 'Bottom bar — copyright / legal / attribution', 'sgs-blocks' ),
};

// Client-friendly columns number <-> the CSS grid-template-columns the engine stores.
const columnsToTemplate = ( n ) => ( n <= 1 ? '1fr' : `repeat(${ n }, 1fr)` );
const templateToColumns = ( tpl ) => {
	if ( ! tpl ) {
		return 1;
	}
	const repeatMatch = /repeat\(\s*(\d+)/.exec( tpl );
	if ( repeatMatch ) {
		return parseInt( repeatMatch[ 1 ], 10 );
	}
	// Fall back to counting explicit track tokens (e.g. "1fr 2fr 1fr").
	return tpl.trim().split( /\s+/ ).filter( Boolean ).length || 1;
};

export default function Edit( { attributes, setAttributes } ) {
	const { rowSlot, layout, gap, gridTemplateColumns, justifyContent } =
		attributes;

	const isGrid = 'grid' === layout;

	// Editor preview mirrors the frontend: grid rows preview as a column grid at
	// the desktop tier, flex rows as a wrapping cluster.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns:
					( gridTemplateColumns && gridTemplateColumns.desktop ) ||
					'repeat(3, 1fr)',
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
		className: `sgs-site-footer-row${ rowSlot ? ` sgs-site-footer-row--${ rowSlot }` : '' }`,
		style: previewStyle,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		orientation: 'horizontal',
		renderAppender: undefined,
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

					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ gridTemplateColumns }
							onChange={ ( obj ) =>
								setAttributes( { gridTemplateColumns: obj } )
							}
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => {
								const shown = inherited ? effectiveValue : ownValue;
								return (
									<RangeControl
										value={ templateToColumns( shown ) }
										onChange={ ( val ) =>
											setOwnValue( columnsToTemplate( val ) )
										}
										min={ 1 }
										max={ 6 }
										help={ __(
											'Columns at this device. Set fewer on mobile (e.g. 1) — leave a device blank to inherit the one above.',
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
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
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
