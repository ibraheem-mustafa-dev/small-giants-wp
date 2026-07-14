import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ResponsiveOverride, SpacingControl, ResponsiveBoxControls } from '../../components';

// No allowedBlocks restriction: site-header-row is a container-equivalent (like
// sgs/container in free mode) — it accepts ANY block, not a curated palette. The
// row's job is layout (the never-overflow cluster), not gatekeeping content.

// Distribution maps to the shared wrapper's justifyContent attr (consumed by
// SGS_Container_Wrapper). Curated to the four clients actually use.
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __( 'Top row — utility strip (contact, search, social)', 'sgs-blocks' ),
	middle: __( 'Middle row — logo, navigation, cart', 'sgs-blocks' ),
	bottom: __( 'Bottom row — message / business info', 'sgs-blocks' ),
};

export default function Edit( { attributes, setAttributes } ) {
	const { rowSlot, justifyContent, gap } = attributes;

	// Editor preview mirrors the frontend cluster so what you see matches the
	// deployed header. The never-overflow guarantee (flex-wrap + min-width:0)
	// comes from style.css; this inline preview just aids editing.
	const blockProps = useBlockProps( {
		className: `sgs-site-header-row${ rowSlot ? ` sgs-site-header-row--${ rowSlot }` : '' }`,
		style: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'center',
			gap: ( gap && gap.desktop ) || 'clamp(0.5rem, 2vw, 1.5rem)',
			justifyContent: justifyContent || 'flex-start',
		},
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
						label={ __( 'Distribution', 'sgs-blocks' ) }
						value={ justifyContent || '' }
						options={ DISTRIBUTION_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
						help={ __(
							'How elements spread across the row. Elements always wrap to a new line rather than overflowing.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ResponsiveOverride
						label={ __( 'Gap between elements', 'sgs-blocks' ) }
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
