import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, InspectorControls } from '@wordpress/block-editor';
import { TextControl, PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { label } = attributes;

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

	const blockProps = useBlockProps( {
		className: [
			'sgs-tab',
			isActive ? 'sgs-tab--active' : 'sgs-tab--hidden',
		].join( ' ' ),
		style: { display: isActive ? undefined : 'none' },
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
			{ /* Width / spacing (WS-4 container mirror) */ }
			<InspectorControls>
				<PanelBody title={ __( 'Tab Settings', 'sgs-blocks' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'Tab label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						help={ __( 'Label shown on the tab button.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-tab__label-control">
					<TextControl
						label={ __( 'Tab label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
					/>
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
