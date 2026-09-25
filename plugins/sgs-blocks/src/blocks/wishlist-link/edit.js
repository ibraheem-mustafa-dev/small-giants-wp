/**
 * SGS Wishlist Link — editor.
 *
 * A header/footer icon-link to the wishlist panel with a live count badge
 * (filled client-side by view.js — the editor preview always shows 0, the
 * same "renders 0, hydrates client-side" pattern as sgs/cart's badge).
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	__experimentalUnitControl as UnitControl, // eslint-disable-line camelcase
} from '@wordpress/components';
import {
	IconPicker,
	IconPreview,
	SgsColourPanel,
	ResponsiveControl,
	fillRow,
	textRow,
} from '../../components';

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		wishlistUrl,
		iconSource,
		iconName,
		showCount,
		showLabel,
		label,
		iconSize,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-wishlist-link' } );

	const colourRows = [
		fillRow( {
			key: 'icon',
			label: __( 'Icon', 'sgs-blocks' ),
			attrs: { base: 'iconColour', hover: 'iconColourHover' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'badgeBackground',
			label: __( 'Badge background', 'sgs-blocks' ),
			attrs: { base: 'badgeBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'badgeText',
			label: __( 'Badge text', 'sgs-blocks' ),
			attrs: { base: 'badgeTextColour' },
			attributes,
			setAttributes,
		} ),
	];

	return (
		<>
			<InspectorControls group="color">
				<SgsColourPanel rows={ colourRows } />
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Wishlist link', 'sgs-blocks' ) } initialOpen>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Wishlist page URL', 'sgs-blocks' ) }
						help={ __(
							'Leave empty to link to the cart page (where the Saved for later panel lives by default).',
							'sgs-blocks'
						) }
						value={ wishlistUrl }
						onChange={ ( value ) => setAttributes( { wishlistUrl: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( value ) => setAttributes( { label: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show saved-item count', 'sgs-blocks' ) }
						checked={ !! showCount }
						onChange={ ( value ) => setAttributes( { showCount: value } ) }
					/>
					<ResponsiveControl label={ __( 'Show text label', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'Show text label', 'sgs-blocks' ) }
								hideLabelFromVision
								checked={ !! showLabel[ breakpoint ] }
								onChange={ ( value ) =>
									setAttributes( {
										showLabel: { ...showLabel, [ breakpoint ]: value },
									} )
								}
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Icon size (px)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Icon size', 'sgs-blocks' ) }
								hideLabelFromVision
								units={ [ { value: 'px', label: 'px' } ] }
								value={ iconSize[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									setAttributes( {
										iconSize: { ...iconSize, [ breakpoint ]: value },
									} )
								}
							/>
						) }
					</ResponsiveControl>
				</PanelBody>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) } initialOpen={ false }>
					<IconPicker
						value={ { source: iconSource, name: iconName } }
						onChange={ ( { source, name } ) =>
							setAttributes( { iconSource: source, iconName: name } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<span className="sgs-wishlist-link__icon" aria-hidden="true">
					<IconPreview
						source={ iconSource || 'lucide' }
						name={ iconName || 'heart' }
						size={ 24 }
					/>
				</span>
				{ label ? (
					<span className="sgs-wishlist-link__label">{ label }</span>
				) : null }
				{ showCount ? (
					<span className="sgs-wishlist-link__badge">0</span>
				) : null }
			</div>
		</>
	);
}
