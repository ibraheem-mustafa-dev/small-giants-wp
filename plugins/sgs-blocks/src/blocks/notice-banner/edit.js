import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { IconPicker, IconPreview } from '../../components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing only).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

const VARIANT_OPTIONS = [
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Error', 'sgs-blocks' ), value: 'error' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

// The ideal default icon for each variant (Lucide). Shown unless the operator
// picks an override. Must stay in sync with the same map in render.php.
const VARIANT_DEFAULT_ICON = {
	info: 'info',
	success: 'circle-check',
	warning: 'triangle-alert',
	error: 'circle-x',
	accent: 'sparkles',
};

/**
 * Resolve the icon to display: an explicit override, else the variant default.
 *
 * @param {Object} attrs Block attributes.
 * @return {{source:string,name:string}} Resolved icon.
 */
function resolveIcon( attrs ) {
	if ( attrs.iconSource && attrs.iconName ) {
		return { source: attrs.iconSource, name: attrs.iconName };
	}
	return {
		source: 'lucide',
		name: VARIANT_DEFAULT_ICON[ attrs.variant ] || 'info',
	};
}

/**
 * Default InnerBlocks template — one sgs/text child for the notice message.
 * Operators can replace or supplement it with any block, e.g. a button.
 */
const NOTICE_BANNER_TEMPLATE = [
	[ 'sgs/text', { text: __( 'Write your notice message here.', 'sgs-blocks' ), tag: 'p' } ],
];

export default function Edit( { attributes, setAttributes } ) {
	const { variant, showIcon, iconSource } = attributes;

	const className = [ 'sgs-notice-banner', `sgs-notice-banner--${ variant }` ].join(
		' '
	);
	const blockProps = useBlockProps( { className } );
	const innerBlocksProps = useInnerBlocksProps( {}, {
		template: NOTICE_BANNER_TEMPLATE,
	} );
	const resolved = resolveIcon( attributes );
	const usingDefault = ! ( iconSource && attributes.iconName );

	return (
		<>
			<InspectorControls>
				{ /* WS-4: mirrored sgs/container wrapper controls (content kind = width/spacing only). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody title={ __( 'Banner Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						help={ __(
							'Sets the colour and a fitting default icon.',
							'sgs-blocks'
						) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) => setAttributes( { variant: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show icon', 'sgs-blocks' ) }
						checked={ !! showIcon }
						onChange={ ( val ) => setAttributes( { showIcon: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showIcon && (
						<IconPicker
							label={ __( 'Icon (overrides the variant default)', 'sgs-blocks' ) }
							value={ resolved }
							onChange={ ( { source, name } ) =>
								setAttributes( { iconSource: source, iconName: name } )
							}
						/>
					) }
					{ showIcon && ! usingDefault && (
						<ToggleControl
							label={ __( "Use the variant's default icon", 'sgs-blocks' ) }
							checked={ false }
							onChange={ () =>
								setAttributes( { iconSource: '', iconName: '' } )
							}
							help={ __(
								'Reset to the icon that matches the chosen variant.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* FR-22-6: the notice text is now an InnerBlocks child (sgs/text).
			     The wrapper div carries the variant class + role="note". */ }
			<div { ...blockProps } role="note">
				{ showIcon && (
					<span className="sgs-notice-banner__icon" aria-hidden="true">
						<IconPreview source={ resolved.source } name={ resolved.name } size={ 20 } />
					</span>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
