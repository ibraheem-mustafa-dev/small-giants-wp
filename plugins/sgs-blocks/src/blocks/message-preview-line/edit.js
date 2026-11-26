/**
 * Message preview line: editor component. Shows the starting text; the group, box and wording are set in the
 * inspector. The box list comes from the Message preview fields blocks of the same group on this page.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import {
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import {
	SgsColourPanel,
	TypographyControls,
	textRow,
	ResponsiveBoxControls,
} from '../../components';
import {
	colourVar,
	tierBoxLonghands,
	typographyPreviewStyle,
	usePreviewTier,
} from '../../utils';

const cleanKey = ( val ) => val.toLowerCase().replace( /[^a-z0-9_-]+/g, '' );

/**
 * The boxes of every fields block in a block tree that shares a group.
 *
 * @param {Array}  blocks Block tree.
 * @param {string} group  Group name.
 * @return {Array} `{ value, label }` options.
 */
function boxesOf( blocks, group ) {
	let found = [];
	blocks.forEach( ( b ) => {
		if (
			b.name === 'sgs/message-preview' &&
			( b.attributes.group || 'note' ) === group
		) {
			found = found.concat(
				( b.attributes.fields || [] ).map( ( f ) => ( {
					value: f.key,
					label: f.label || f.key,
				} ) )
			);
		}
		found = found.concat( boxesOf( b.innerBlocks || [], group ) );
	} );
	return found;
}

export default function Edit( { attributes, setAttributes } ) {
	const tier = usePreviewTier();
	const { group, field, startingText, prefix, suffix, fallback } = attributes;

	const boxes = useSelect(
		( select ) =>
			boxesOf( select( blockEditorStore ).getBlocks(), group || 'note' ),
		[ group ]
	);

	const blockProps = useBlockProps( {
		className: 'sgs-message-preview-line',
		style: {
			...typographyPreviewStyle( attributes, '', tier ),
			...tierBoxLonghands( attributes.padding, tier, 'padding' ),
			...( attributes.textColour
				? { color: colourVar( attributes.textColour ) }
				: {} ),
		},
	} );

	return (
		<>
			<InspectorControls group="styles">
				<SgsColourPanel
					initialOpen
					rows={ [
						textRow( {
							key: 'text',
							label: __( 'Line text', 'sgs-blocks' ),
							attrs: { base: 'textColour' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
				<PanelBody
					title={ __( 'Line text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showResponsive
						fontSizePresets
						showFontFamily
						showWeight
						showLineHeight
						showLetterSpacing
						showTransform
						showTextAlign
					/>
				</PanelBody>
				<ResponsiveBoxControls
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>
			<InspectorControls>
				<PanelBody initialOpen title={ __( 'What this line shows', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Group name', 'sgs-blocks' ) }
						help={ __(
							'The group name of the Message preview fields block it follows.',
							'sgs-blocks'
						) }
						value={ group }
						onChange={ ( val ) =>
							setAttributes( { group: cleanKey( val ) } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ boxes.length ? (
						<SelectControl
							label={ __( 'Box it shows', 'sgs-blocks' ) }
							value={ field }
							options={ [
								{
									value: '',
									label: __( 'Choose a box', 'sgs-blocks' ),
								},
								...boxes,
							] }
							onChange={ ( val ) =>
								setAttributes( { field: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) : (
						<TextControl
							label={ __( 'Box it shows', 'sgs-blocks' ) }
							help={ __(
								'The box name from the fields block. No fields block with this group name is on the page yet.',
								'sgs-blocks'
							) }
							value={ field }
							onChange={ ( val ) =>
								setAttributes( { field: cleanKey( val ) } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Line wording', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Text before', 'sgs-blocks' ) }
						value={ prefix }
						onChange={ ( val ) => setAttributes( { prefix: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Text after', 'sgs-blocks' ) }
						value={ suffix }
						onChange={ ( val ) => setAttributes( { suffix: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __(
							'Text when the box is empty',
							'sgs-blocks'
						) }
						help={ __(
							'Shown instead of the three above while the box is empty. Leave blank to show nothing.',
							'sgs-blocks'
						) }
						value={ fallback }
						onChange={ ( val ) =>
							setAttributes( { fallback: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Starting text', 'sgs-blocks' ) }
						help={ __(
							'Shown before the visitor types, and when scripts are off. Match the box’s starting text, with the text before and after added.',
							'sgs-blocks'
						) }
						value={ startingText }
						onChange={ ( val ) =>
							setAttributes( { startingText: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>
			<p { ...blockProps }>{ startingText }</p>
		</>
	);
}
