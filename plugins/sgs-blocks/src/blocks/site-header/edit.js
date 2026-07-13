import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import {
	WidthPanel,
	ResponsiveSpacingPanel,
} from '../container/components/ContainerWrapperControls';

const ALLOWED_BLOCKS = [ 'sgs/site-header-row' ];

// Three fixed rows. The middle row is pre-filled to match the current site
// header (logo + navigation + mobile-nav toggle + cart) so content parity holds
// on first insert. Top and bottom rows start empty and emit zero output until
// an operator adds elements (FR-S9-2 empty-row-zero-output).
const TEMPLATE = [
	[ 'sgs/site-header-row', { rowSlot: 'top' } ],
	[
		'sgs/site-header-row',
		{ rowSlot: 'middle', justifyContent: 'space-between' },
		[
			[ 'core/site-logo', { width: 180, shouldSyncIcon: true } ],
			[
				'core/navigation',
				{
					textColor: 'text',
					fontSize: 'medium',
					style: {
						typography: { fontWeight: '600' },
						spacing: { blockGap: 'var:preset|spacing|40' },
					},
					layout: { type: 'flex', justifyContent: 'right' },
				},
			],
			[ 'sgs/mobile-nav-toggle', {} ],
			[ 'woocommerce/mini-cart', { hasHiddenPrice: true, cartIcon: 'bag' } ],
		],
	],
	[ 'sgs/site-header-row', { rowSlot: 'bottom' } ],
];

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-header' } );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
		// Fixed three rows: operators can't add/remove/reorder rows, but can
		// fully edit the elements inside each row (the rows set their own
		// templateLock:false for their content).
		templateLock: 'insert',
		orientation: 'vertical',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Header width', 'sgs-blocks' ) }>
					<WidthPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>
				<ResponsiveSpacingPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
