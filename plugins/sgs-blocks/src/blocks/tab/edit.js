import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { TextControl, PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { textPaintPreview } from '../../utils';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { label, textColour, textColourGradient, backgroundColour, backgroundColourGradient } = attributes;

	// Contrast check for border — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the block has no background
	// set, there's no static background to compare against, so the check is
	// skipped. Follows the text.js pattern.
	//
	// `contrastAgainst` only accepts a FLAT colour/token — it is not itself
	// gradient-aware. When `backgroundColourGradient` is set, the gradient (not
	// the flat `backgroundColour`) is what actually paints, so comparing against
	// the flat colour would compare against a surface that isn't rendered — skip
	// the check entirely in that case rather than feed the raw gradient string in.
	const tabContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// Determine which tab index this block occupies in the parent.
	const tabIndex = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlockIndex } =
				select( 'core/block-editor' );
			const parentId = getBlockRootClientId( clientId );
			return getBlockIndex( clientId, parentId );
		},
		[ clientId ]
	);

	// Read the parent block's activeEditorTab from its attributes
	// so we can show/hide this panel in the editor canvas.
	const isActive = useSelect(
		( select ) => {
			const { getBlockRootClientId, getSelectedBlockClientId, getBlocks } =
				select( 'core/block-editor' );
			const parentId = getBlockRootClientId( clientId );
			if ( ! parentId ) {
				return true;
			}
			// Show the tab if it is currently selected or contains the selected block.
			const selectedId = getSelectedBlockClientId();
			const siblings = getBlocks( parentId );
			// Active = first tab by default, or whichever contains the selected block.
			if ( ! selectedId ) {
				return tabIndex === 0;
			}
			const selectedAncestors =
				select( 'core/block-editor' ).getBlockParents(
					selectedId,
					true
				);
			if (
				selectedAncestors.includes( clientId ) ||
				selectedId === clientId
			) {
				return true;
			}
			// No tab in this group is selected — show first tab.
			const anyTabSelected = siblings.some( ( sib ) => {
				const sibAncestors =
					select( 'core/block-editor' ).getBlockParents(
						selectedId,
						true
					);
				return (
					sibAncestors.includes( sib.clientId ) ||
					selectedId === sib.clientId
				);
			} );
			if ( ! anyTabSelected ) {
				return tabIndex === 0;
			}
			return false;
		},
		[ clientId, tabIndex ]
	);

	// D288/D636 pattern (mirrors sgs/container): render.php applies textColour/
	// textColourGradient to $root_sel — the block's own root `wrapper` element
	// (block.json attrMap css:color/css:background-image) — so the preview
	// belongs on blockProps.style, merged with the existing active/hidden toggle.
	const [ colourPalette ] = useSettings( 'color.palette' );

	const blockProps = useBlockProps( {
		className: [
			'sgs-tab',
			isActive ? 'sgs-tab--active' : 'sgs-tab--hidden',
		].join( ' ' ),
		style: {
			display: isActive ? undefined : 'none',
			...textPaintPreview( textColour, textColourGradient, colourPalette ),
		},
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-tab__content' },
		{
			templateLock: false,
			template: [
				[
					'sgs/text',
					{
						placeholder: __(
							'Add content for this tab\u2026',
							'sgs-blocks'
						),
					},
				],
			],
		}
	);

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ /* Width / spacing (WS-4 container mirror) */ }
			<InspectorControls>
				<PanelBody title={ __( 'Tab Settings', 'sgs-blocks' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'Tab label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						help={ __( 'Label shown on the tab button.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ tabContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-tab__label-control">
					<TextControl
						label={ __( 'Tab label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
