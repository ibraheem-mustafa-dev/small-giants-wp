import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useEffect, useMemo } from '@wordpress/element';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { PanelBody, Button } from '@wordpress/components';
import CollectionPanel from './components/collection-panel';
import ItemEditor from './components/ItemEditor';
import ElementColourPanels from './components/ElementColourPanels';
import CardStylesPanel from './components/CardStylesPanel';
import ContentSourcePanel from './components/ContentSourcePanel';
import ProductsToolsPanel from './components/ProductsToolsPanel';
import GlyphOverlayPanels from './components/GlyphOverlayPanels';
import GridSettingsPanel from './components/GridSettingsPanel';
import CardGridHoverEffectsPanel from './components/CardGridHoverEffectsPanel';
import TextStylingPanel from './components/TextStylingPanel';
import CardSpacingStylingPanel from './components/CardSpacingStylingPanel';
import LayoutBorderPanel from './components/LayoutBorderPanel';
import CardGridCanvas from './components/CardGridCanvas';
import {
	colourVar,
	spacingVar,
	resolveResponsiveTier,
	resolveTextColourPreviewStyle,
	generateItemKey,
	withStableItemKeys,
	usePreviewTier,
	typographyPreviewCss,
	wrapperPreview,
} from '../../utils';
import { cardGridPreview } from './preview-style';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		variant,
		headingLevel,
		items: rawItems,
		columns,
		gap,
		aspectRatio,
		effectHover,
		titleColour,
		titleColourGradient,
		subtitleColour,
		subtitleColourGradient,
		cardBackground,
		cardBackgroundGradient,
		source,
		overlayColour,
		overlayGradient,
	} = attributes;

	// Stable per-item `_key` for CSS scoping (Spec 35 Part 4) — backfilled
	// silently for items authored before this field existed. useMemo keeps
	// the generated keys stable within a render even before the effect
	// below persists them; the effect fires at most once per real backfill
	// (withStableItemKeys returns the SAME reference when nothing changed).
	const items = useMemo( () => withStableItemKeys( rawItems ), [ rawItems ] );
	useEffect( () => {
		if ( items !== rawItems ) {
			setAttributes( { items } );
		}
	}, [ items, rawItems, setAttributes ] );

	const isQueryMode = source === 'query';
	const isWcProductMode = source === 'wc-product';
	const isCptCollectionMode = source === 'cpt-collection';

	// Contrast check for card text (title/subtitle) against the card's
	// background. `contrastAgainst` only accepts a FLAT colour/token, so this
	// only fires when a flat `cardBackground` is set AND no
	// `cardBackgroundGradient` overrides it — when a gradient is set, the
	// gradient (not the flat colour) is what actually paints, so comparing
	// against the flat colour would compare against a surface that isn't
	// rendered. Otherwise the check is skipped (ambiguous/inherited/gradient
	// background). Mirrors site-header-row's rowHasOwnBackground pattern.
	const cardBackgroundForContrast =
		cardBackground && ! cardBackgroundGradient ? cardBackground : '';

	// Flat help-text resolution (no nested ternary — S3358).
	let sourceHelp = __( 'Add and arrange cards manually below.', 'sgs-blocks' );
	if ( isWcProductMode ) {
		sourceHelp = __( 'Products are pulled from your WooCommerce catalogue.', 'sgs-blocks' );
	} else if ( isCptCollectionMode ) {
		sourceHelp = __(
			'Products are pulled from your SGS product library. This works whether or not WooCommerce is installed.',
			'sgs-blocks'
		);
	} else if ( isQueryMode ) {
		sourceHelp = __( 'Cards are pulled automatically from your posts.', 'sgs-blocks' );
	}

	const className = [
		'sgs-card-grid',
		`sgs-card-grid--${ variant }`,
		`sgs-card-grid--hover-${ effectHover }`,
		overlayColour || overlayGradient ? 'sgs-card-grid--has-image-overlay' : '',
	].filter( Boolean ).join( ' ' );

	const previewTier = usePreviewTier();
	// Collection mode shows render.php's own output, whose page-button rule
	// refreshes only when the server render does. This scoped rule paints the real
	// page buttons from the current attributes at once; #block-{clientId} keeps it
	// to this instance and outranks the server render's .{uid} rule while editing.
	const pageButtonPreviewCss = isCptCollectionMode
		? typographyPreviewCss( attributes, 'pageButton', `#block-${ clientId } .sgs-card-grid__page-btn`, previewTier )
		: '';
	const [ palette ] = useSettings( 'color.palette' );
	const wrapper = wrapperPreview( attributes, previewTier, palette );
	const cardPreview = cardGridPreview( attributes, previewTier, palette );
	const blockProps = useBlockProps( { className } );

	// D649 — heading level is an identity control (document-outline placement),
	// not a style control; the tag mirrors render.php's own allowlist fallback.
	const HeadingTag = headingLevel || 'h3';

	// columns is a TIER OBJECT (Spec 35 pass 4) — resolve each tier explicitly,
	// or the editor preview would emit "--sgs-card-grid-columns: [object
	// Object]" and CSS custom properties silently fail to apply (same D567
	// class as the container/gridTemplateColumns fix).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const columnsTabletTier = resolveResponsiveTier( columns, 'tablet' )?.value || 2;
	const columnsMobileTier = resolveResponsiveTier( columns, 'mobile' )?.value || 1;

	const gridStyle = {
		'--sgs-card-grid-columns': columnsDesktop,
		'--sgs-card-grid-columns-tablet': columnsTabletTier,
		'--sgs-card-grid-columns-mobile': columnsMobileTier,
		'--sgs-card-grid-gap': spacingVar( gap ),
		'--sgs-card-grid-aspect': aspectRatio,
	};

	const titleStyle = resolveTextColourPreviewStyle( titleColour, titleColourGradient, colourVar );

	const subtitleStyle = resolveTextColourPreviewStyle( subtitleColour, subtitleColourGradient, colourVar );

	const updateItem = ( index, updatedItem ) => {
		const updated = [ ...items ];
		updated[ index ] = updatedItem;
		setAttributes( { items: updated } );
	};

	const removeItem = ( index ) => {
		setAttributes( {
			items: items.filter( ( _, i ) => i !== index ),
		} );
	};

	const addItem = () => {
		setAttributes( {
			items: [
				...items,
				{
					media: null,
					title: '',
					subtitle: '',
					badge: '',
					badgeVariant: '',
					link: '',
					decorative: false,
					_key: generateItemKey(),
					objectFit: 'cover',
					focalPoint: { x: 0.5, y: 0.5 },
				},
			],
		} );
	};

	return (
		<>
			<ElementColourPanels attributes={ attributes } setAttributes={ setAttributes } cardBackgroundForContrast={ cardBackgroundForContrast } />

			<CardStylesPanel attributes={ attributes } setAttributes={ setAttributes } />

			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<ContentSourcePanel attributes={ attributes } setAttributes={ setAttributes } isQueryMode={ isQueryMode } sourceHelp={ sourceHelp } />

				{ /* ── Collection panel: visible only in cpt-collection mode ── */ }
				{ isCptCollectionMode && (
					<CollectionPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				) }

				<ProductsToolsPanel attributes={ attributes } setAttributes={ setAttributes } isWcProductMode={ isWcProductMode } />

				{ ! isQueryMode && ! isWcProductMode && ! isCptCollectionMode && (
				<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						<ItemEditor
							key={ index }
							item={ item }
							index={ index }
							onChange={ ( updated ) =>
								updateItem( index, updated )
							}
							onRemove={ () => removeItem( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( 'Add item', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				) }

				<GlyphOverlayPanels attributes={ attributes } setAttributes={ setAttributes } />

				<GridSettingsPanel attributes={ attributes } setAttributes={ setAttributes } />

				<CardGridHoverEffectsPanel attributes={ attributes } setAttributes={ setAttributes } />

				<TextStylingPanel attributes={ attributes } setAttributes={ setAttributes } isCptCollectionMode={ isCptCollectionMode } />

				<CardSpacingStylingPanel attributes={ attributes } setAttributes={ setAttributes } />
				<LayoutBorderPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			<CardGridCanvas attributes={ attributes } isWcProductMode={ isWcProductMode } isCptCollectionMode={ isCptCollectionMode } blockProps={ blockProps } pageButtonPreviewCss={ pageButtonPreviewCss } wrapper={ wrapper } gridStyle={ gridStyle } items={ items } cardPreview={ cardPreview } titleStyle={ titleStyle } subtitleStyle={ subtitleStyle } HeadingTag={ HeadingTag } />
		</>
	);
}
