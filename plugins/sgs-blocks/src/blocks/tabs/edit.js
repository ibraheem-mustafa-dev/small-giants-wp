import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
// WS-4: shared sgs/container wrapper editor controls (layout kind).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { SgsColourPanel,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { colourVar, textPaintPreview, borderPaintPreview } from '../../utils';

const TEMPLATE = [
	[ 'sgs/tab', { label: __( 'Tab 1', 'sgs-blocks' ) } ],
	[ 'sgs/tab', { label: __( 'Tab 2', 'sgs-blocks' ) } ],
	[ 'sgs/tab', { label: __( 'Tab 3', 'sgs-blocks' ) } ],
];

const ORIENTATION_OPTIONS = [
	{ label: __( 'Horizontal', 'sgs-blocks' ), value: 'horizontal' },
	{ label: __( 'Vertical', 'sgs-blocks' ), value: 'vertical' },
];

const ALIGNMENT_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const STYLE_OPTIONS = [
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Boxed', 'sgs-blocks' ), value: 'boxed' },
	{ label: __( 'Pills', 'sgs-blocks' ), value: 'pills' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		blockLabel,
		orientation,
		tabAlignment,
		tabStyle,
		tabTextColour,
		tabTextColourGradient,
		tabBgColour,
		tabBgColourGradient,
		tabActiveTextColour,
		tabActiveBgColour,
		tabIndicatorColour,
		tabIndicatorColourGradient,
		tabActiveIndicatorColour,
		tabActiveIndicatorColourGradient,
		tabHoverBgColour,
		panelBgColour,
		panelBgColourGradient,
		panelBgColourHover,
		panelBgColourHoverGradient,
		panelBorderColour,
		panelBorderColourGradient,
		transitionDuration,
	} = attributes;

	const [ activeEditorTab, setActiveEditorTab ] = useState( 0 );
	const [ colourPalette ] = useSettings( 'color.palette' );

	// Read inner block (tab) labels from the store so the nav stays in sync.
	const tabLabels = useSelect(
		( select ) => {
			const innerBlocks =
				select( 'core/block-editor' ).getBlocks( clientId );
			return innerBlocks.map(
				( block ) => block.attributes?.label || __( 'Tab', 'sgs-blocks' )
			);
		},
		[ clientId ]
	);

	const wrapperClassName = [
		'sgs-tabs',
		`sgs-tabs--${ orientation }`,
		`sgs-tabs--style-${ tabStyle }`,
		`sgs-tabs--align-${ tabAlignment }`,
	].join( ' ' );

	const cssVars = {};
	if ( tabTextColour ) {
		cssVars[ '--sgs-tab-text' ] = colourVar( tabTextColour );
	}
	if ( tabBgColour ) {
		cssVars[ '--sgs-tab-bg' ] = colourVar( tabBgColour );
	}
	if ( tabBgColourGradient ) {
		cssVars[ '--sgs-tab-bg-gradient' ] = tabBgColourGradient;
	}
	if ( tabActiveTextColour ) {
		cssVars[ '--sgs-tab-active-text' ] = colourVar( tabActiveTextColour );
	}
	if ( tabActiveBgColour ) {
		cssVars[ '--sgs-tab-active-bg' ] = colourVar( tabActiveBgColour );
	}
	if ( tabIndicatorColour ) {
		cssVars[ '--sgs-tab-indicator' ] = colourVar( tabIndicatorColour );
	}
	if ( tabActiveIndicatorColour ) {
		cssVars[ '--sgs-tab-active-indicator' ] = colourVar(
			tabActiveIndicatorColour
		);
	}
	if ( tabHoverBgColour ) {
		cssVars[ '--sgs-tab-hover-bg' ] = colourVar( tabHoverBgColour );
	}
	if ( panelBgColour ) {
		cssVars[ '--sgs-panel-bg' ] = colourVar( panelBgColour );
	}
	if ( panelBgColourGradient ) {
		cssVars[ '--sgs-panel-bg-gradient' ] = panelBgColourGradient;
	}
	if ( panelBorderColour ) {
		cssVars[ '--sgs-panel-border' ] = colourVar( panelBorderColour );
	}
	if ( transitionDuration ) {
		cssVars[ '--sgs-transition-duration' ] = `${ transitionDuration }ms`;
	}

	const blockProps = useBlockProps( {
		className: wrapperClassName,
		style: cssVars,
	} );

	// Inner blocks must be children of the wrapper element (not the nav).
	// We render them conditionally via CSS display — only show the active tab.
	// `templateMode` (grid-section/card-grid presets) was removed from
	// block.json — this composite already restricts children to its own
	// structural child block (`sgs/tab`) below; a generic preset would only
	// conflict with that fixed relationship.
	// panelBorderColourGradient (D636) real mechanism: render.php scopes a
	// masked `::before` ring (`sgs_border_gradient_css()`) to `.sgs-tabs__panel`
	// — the same technique `borderPaintPreview()` already approximates via
	// `border-image` for `sgs/container` (documented deliberate approximation:
	// the real masked ring needs a `::before` pseudo-element a plain inline
	// style cannot reach). The editor never renders individual `.sgs-tabs__panel`
	// divs per tab (only the ONE visible panel's InnerBlocks, direct children of
	// `.sgs-tabs__panels`), so the preview applies to that wrapper instead — the
	// only panel-shaped element the canvas actually has.
	const panelBorderPreview = borderPaintPreview( panelBorderColour, panelBorderColourGradient, colourPalette );

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-tabs__panels',
			'data-active-tab': activeEditorTab,
			style: panelBorderPreview.borderImage ? { borderImage: panelBorderPreview.borderImage } : undefined,
		},
		{
			allowedBlocks: [ 'sgs/tab' ],
			template: TEMPLATE,
			renderAppender: false,
		}
	);

	return (
		<>
			{ /* D618/D619/D621 — ONE grouped, SGS-OWNED colour panel (own
			   PanelBody, group="styles"), rendered FIRST so it sits at the top
			   of the Styles tab. Replaces the scattered "Colours" ToolsPanel
			   that used to sit in the Settings tab below. This is a BLOCK-LEVEL
			   repeater (uniform styling for every sgs/tab child, not per-item —
			   confirmed against render.php: tabTextColour etc. resolve to
			   `--sgs-tab-*` custom properties on the outer wrapper, read by
			   style.css for every `.sgs-tabs__tab`/`.sgs-tabs__panel`; there is
			   no per-tab colour attribute anywhere in this block or in sgs/tab's
			   own block.json). Grouped normal/hover/active per CSS property per
			   element (not per individual DB attr):
			     - Tab background: normal=tabBgColour, hover=tabHoverBgColour,
			       active=tabActiveBgColour (a genuine 3-state row — style.css
			       lines 71/100/132 all target background-color on the same
			       tab element).
			     - Tab text colour: normal=tabTextColour, active=tabActiveText
			       Colour (no hover text-colour attribute exists — style.css has
			       no color rule inside `.sgs-tabs__tab:hover`).
			     - Tab indicator/border colour: normal=tabIndicatorColour,
			       active=tabActiveIndicatorColour (no hover indicator attribute
			       exists either).
			   Panel background/border have only ONE colour attribute each
			   (panelBgColour/panelBorderColour) — `state=current` per the DB
			   census, labelled "Active" here because CSS only ever paints the
			   currently-visible panel (`.sgs-tabs__panel[hidden]` hides the
			   rest); there is no separate resting-panel colour to pair it
			   with, so these are single-state rows (still `linked: true`). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'tab-bg',
						label: __( 'Tab background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tabBgColour,
								onChange: ( val ) => setAttributes( { tabBgColour: val ?? '' } ),
								linked: true,
								gradientValue: tabBgColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabBgColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: tabHoverBgColour,
								onChange: ( val ) => setAttributes( { tabHoverBgColour: val ?? '' } ),
								linked: true,
								// No tabHoverBgColourGradient attribute exists (out of
								// scope for this rollout) — required no-op, not a missing
								// feature (GradientCapableColourControl calls
								// onGradientChange('') on every pick for every state in a
								// gradientCapable row).
								onGradientChange: () => {},
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: tabActiveBgColour,
								onChange: ( val ) => setAttributes( { tabActiveBgColour: val ?? '' } ),
								linked: true,
								onGradientChange: () => {},
							},
						],
					},
					{
						key: 'tab-text',
						label: __( 'Tab text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tabTextColour,
								onChange: ( val ) => setAttributes( { tabTextColour: val ?? '' } ),
								linked: true,
								gradientValue: tabTextColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabTextColourGradient: val ?? '' } ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: tabActiveTextColour,
								onChange: ( val ) => setAttributes( { tabActiveTextColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'tab-indicator',
						label: __( 'Tab indicator colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tabIndicatorColour,
								onChange: ( val ) => setAttributes( { tabIndicatorColour: val ?? '' } ),
								linked: true,
								gradientValue: tabIndicatorColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabIndicatorColourGradient: val ?? '' } ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: tabActiveIndicatorColour,
								onChange: ( val ) => setAttributes( { tabActiveIndicatorColour: val ?? '' } ),
								linked: true,
								gradientValue: tabActiveIndicatorColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabActiveIndicatorColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'panel-bg',
						label: __( 'Panel background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: panelBgColour,
								onChange: ( val ) => setAttributes( { panelBgColour: val ?? '' } ),
								linked: true,
								gradientValue: panelBgColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { panelBgColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: panelBgColourHover,
								onChange: ( val ) => setAttributes( { panelBgColourHover: val ?? '' } ),
								linked: true,
								gradientValue: panelBgColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { panelBgColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'panel-border',
						label: __( 'Panel border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: panelBorderColour,
								onChange: ( val ) => setAttributes( { panelBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: panelBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { panelBorderColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* WS-4: mirrored sgs/container wrapper controls (layout kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ ORIENTATION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { orientation: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Tab alignment', 'sgs-blocks' ) }
						value={ tabAlignment }
						options={ ALIGNMENT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { tabAlignment: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Tab style', 'sgs-blocks' ) }
						value={ tabStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { tabStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Accessibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __(
							'Accessible label (screen readers)',
							'sgs-blocks'
						) }
						help={ __(
							"Read out by screen readers to identify this tab group. Leave blank to fall back to the first tab's label.",
							'sgs-blocks'
						) }
						value={ blockLabel }
						onChange={ ( val ) =>
							setAttributes( { blockLabel: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						min={ 100 }
						max={ 500 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
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
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Tab navigation bar — editor preview */ }
				<div
					className="sgs-tabs__nav"
					role="tablist"
					aria-label={ __( 'Content tabs', 'sgs-blocks' ) }
					aria-orientation={ orientation }
				>
					{ tabLabels.map( ( label, index ) => {
						const isActive = index === activeEditorTab;
						// tabTextColourGradient (D948-follow-up) real mechanism:
						// render.php's `sgs_resolve_text_colour_or_gradient()` +
						// `sgs_text_colour_decl()` — a genuine background-clip:text
						// gradient, scoped ONLY to `:not([aria-selected='true'])`
						// (resting tabs). textPaintPreview() is the exact same
						// technique already used by sgs/container's own text-colour
						// mirror, so it applies unmodified here; the active tab is
						// deliberately excluded, matching the frontend selector.
						const textPreview = ! isActive
							? textPaintPreview( tabTextColour, tabTextColourGradient, colourPalette )
							: {};
						return (
							<Button
								key={ index }
								className={ [
									'sgs-tabs__tab',
									isActive ? 'sgs-tabs__tab--active' : '',
								]
									.filter( Boolean )
									.join( ' ' ) }
								style={ textPreview }
								aria-selected={ isActive }
								onClick={ () => setActiveEditorTab( index ) }
							>
								{ label }
							</Button>
						);
					} ) }
				</div>

				{ /* Tab panels — only active tab's InnerBlocks are visible */ }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
