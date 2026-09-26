/**
 * SGS Account — editor.
 *
 * The account page is per-visitor (logged-in state, order history) — there
 * is nothing meaningful to hand-build in the editor canvas, so it previews
 * via `ServerSideRender`, the same pattern `sgs/product-card`'s bound mode
 * uses. Inspector controls are split across panel components (Menu /
 * Dashboard / Logged out / Colours / Typography / Spacing) to keep this
 * file under the 250-line JS limit.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { ResponsiveControl, SgsBorderControl, SgsColourPanel, SsrPreviewGuard, fillRow, textRow, TypographyControls } from '../../components';
import { UnitControl } from '../../components/primitives';
import { patchTier } from '../../utils';
import MenuPanel from './MenuPanel';
import DashboardPanel from './DashboardPanel';
import LoggedOutPanel from './LoggedOutPanel';

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { navWidth, gap, contentMaxWidth } = attributes;
	const blockProps = useBlockProps( { className: 'sgs-account' } );

	const colourRows = [
		textRow( {
			key: 'menuText',
			label: __( 'Menu text', 'sgs-blocks' ),
			attrs: { base: 'menuTextColour', hover: 'menuTextColourHover' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'menuActiveText',
			label: __( 'Active menu item text', 'sgs-blocks' ),
			attrs: { base: 'menuActiveTextColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'menuActiveIndicator',
			label: __( 'Active item indicator (sidebar bar)', 'sgs-blocks' ),
			attrs: { base: 'menuActiveIndicatorColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'menuActiveBackground',
			label: __( 'Active item background (tabs pill)', 'sgs-blocks' ),
			attrs: { base: 'menuActiveBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'cardBackground',
			label: __( 'Card background', 'sgs-blocks' ),
			attrs: { base: 'cardBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'contentLink',
			label: __( 'Content links', 'sgs-blocks' ),
			attrs: { base: 'contentLinkColour', hover: 'contentLinkColourHover' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'heading',
			label: __( 'Headings', 'sgs-blocks' ),
			attrs: { base: 'headingColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'chipBackground',
			label: __( 'Status chip background', 'sgs-blocks' ),
			attrs: { base: 'chipBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'chipText',
			label: __( 'Status chip text', 'sgs-blocks' ),
			attrs: { base: 'chipTextColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'track',
			label: __( 'Progress track', 'sgs-blocks' ),
			attrs: { base: 'trackColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'trackDone',
			label: __( 'Progress track (completed)', 'sgs-blocks' ),
			attrs: { base: 'trackDoneColour' },
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
				<MenuPanel attributes={ attributes } setAttributes={ setAttributes } />
				<DashboardPanel attributes={ attributes } setAttributes={ setAttributes } />
				<LoggedOutPanel attributes={ attributes } setAttributes={ setAttributes } />
				<PanelBody title={ __( 'Card border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.cardBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { cardBorderWidth: next } ) }
						styleValue={ attributes.cardBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { cardBorderStyle: val ?? '' } ) }
						colourLabel={ __( 'Card border colour', 'sgs-blocks' ) }
						colourValue={ attributes.cardBorderColour }
						onColourChange={ ( val ) => setAttributes( { cardBorderColour: val ?? '' } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{ key: 'menu', label: __( 'Menu', 'sgs-blocks' ), prefix: 'menu', showFontFamily: true, showDecoration: true, showTransform: true },
							{ key: 'heading', label: __( 'Headings', 'sgs-blocks' ), prefix: 'heading', showFontFamily: true, showDecoration: true, showTransform: true },
							{ key: 'cardTitle', label: __( 'Card titles', 'sgs-blocks' ), prefix: 'cardTitle', showFontFamily: true, showDecoration: true, showTransform: true },
						] }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl label={ __( 'Menu width', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Menu width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ navWidth?.[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									patchTier( attributes, setAttributes, 'navWidth', breakpoint, value )
								}
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ gap?.[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									patchTier( attributes, setAttributes, 'gap', breakpoint, value )
								}
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Content max width', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Content max width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ contentMaxWidth?.[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									patchTier( attributes, setAttributes, 'contentMaxWidth', breakpoint, value )
								}
							/>
						) }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender block="sgs/account" attributes={ attributes } />
				</SsrPreviewGuard>
			</div>
		</>
	);
}
