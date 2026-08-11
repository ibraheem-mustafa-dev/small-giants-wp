import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, Notice } from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveBoxControl,
	ResponsiveOverride,
	ShadowControl,
} from '../../components';
// Reused directly rather than duplicated (Spec 35 Part B / composite-mirror rule,
// D152): physics-canvas KEEPS SGS_Container_Wrapper (containerKind: 'section'), so
// its box + width controls must be the SAME shape sgs/container itself exposes —
// WidthPanel already handles maxWidth/contentWidth + their Tablet/Mobile tiers,
// MIN_HEIGHT_OPTIONS is the shared preset list for the min-height SelectControl
// (mirrors trust-bar's "Section (outer)" panel exactly).
import { WidthPanel, MIN_HEIGHT_OPTIONS } from '../container/components/ContainerWrapperControls';

// Semantic HTML tag (mirrors sgs/container's edit.js exactly — must match the
// block.json `tagName` enum here and render.php's sanitize_key() default).
const TAG_NAME_OPTIONS = [
	{ label: __( 'Section (default)', 'sgs-blocks' ), value: 'section' },
	{ label: __( 'Div (no semantics)', 'sgs-blocks' ), value: 'div' },
	{ label: __( 'Main (page main content)', 'sgs-blocks' ), value: 'main' },
	{ label: __( 'Article (self-contained)', 'sgs-blocks' ), value: 'article' },
	{ label: __( 'Aside (complementary)', 'sgs-blocks' ), value: 'aside' },
	{ label: __( 'Nav (navigation)', 'sgs-blocks' ), value: 'nav' },
	{ label: __( 'Header', 'sgs-blocks' ), value: 'header' },
	{ label: __( 'Footer', 'sgs-blocks' ), value: 'footer' },
	{ label: __( 'Figure', 'sgs-blocks' ), value: 'figure' },
];

/**
 * DECORATIVE-ONLY roster (Spec 38 FR-38-27 / D447). Every entry here renders
 * with no operable control and no must-read body copy, which is what
 * dissolves WCAG 2.5.7 for this block: nothing a user must reach is ever
 * throwable, so no discrete single-pointer alternative is owed. Do NOT add a
 * block that can carry a link, button, form field, or primary body copy —
 * if you find yourself reaching for one, that is this constraint firing as
 * intended, not a gap to patch.
 */
const ALLOWED_BLOCKS = [
	'core/image',
	'sgs/media',
	'sgs/icon',
	'sgs/decorative-image',
];

export default function Edit( { attributes, setAttributes } ) {
	const { physicsGravity, physicsBounce, physicsEdgeResistance } = attributes;

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		renderAppender: undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Physics', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<Notice status="info" isDismissible={ false }>
						{ __(
							"Physics run on the live site only — the editor always shows the resting layout. Under a visitor's reduced-motion setting, physics turn off and every body stays put where you placed it.",
							'sgs-blocks'
						) }
					</Notice>
					<RangeControl
						label={ __( 'Gravity', 'sgs-blocks' ) }
						help={ __(
							'How fast a thrown body falls once released.',
							'sgs-blocks'
						) }
						value={ physicsGravity }
						onChange={ ( value ) =>
							setAttributes( { physicsGravity: value } )
						}
						min={ 0 }
						max={ 4000 }
						step={ 50 }
					/>
					<RangeControl
						label={ __( 'Bounce', 'sgs-blocks' ) }
						help={ __(
							'How much energy a body keeps when it hits the edge of the canvas.',
							'sgs-blocks'
						) }
						value={ physicsBounce }
						onChange={ ( value ) =>
							setAttributes( { physicsBounce: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
					/>
					<RangeControl
						label={ __( 'Drag resistance', 'sgs-blocks' ) }
						help={ __(
							'How firmly the canvas edge resists a body being dragged past it.',
							'sgs-blocks'
						) }
						value={ physicsEdgeResistance }
						onChange={ ( value ) =>
							setAttributes( { physicsEdgeResistance: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
					/>
				</PanelBody>

				{ /* ── Section (outer): width + min-height ────────────────────
				     Same shape as sgs/container / sgs/trust-bar's own "Section
				     (outer)" panel (composite-mirror rule, D152) — this is the
				     resizable arena box: minHeight ships defaults (480px desktop /
				     320px mobile) with no control until now, so a client could
				     never resize the throw arena at all. */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'HTML tag', 'sgs-blocks' ) }
						value={ attributes.tagName || 'section' }
						options={ TAG_NAME_OPTIONS }
						onChange={ ( val ) => setAttributes( { tagName: val } ) }
						help={ __( 'Semantic tag for accessibility landmarks and SEO. Use Main / Nav / Aside / Article for their meaning; Div for a plain wrapper.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<hr style={ { margin: '16px 0' } } />
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
						  `minHeight` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gridTemplateColumns` in ContainerWrapperControls.
						  `minHeightTablet`/`…Mobile` are no longer declared in
						  block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Padding & margin (box-object tiers) — base tier writes to the
				     WP-native style.spacing object; tablet/mobile write to the
				     paddingTablet/paddingMobile + marginTablet/marginMobile object
				     attrs the wrapper's @media tiers read. Mirrors sgs/container's
				     and sgs/trust-bar's own edit.js exactly. ────────────────── */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				{ /* ── Content band (Layer 2 __inner) — this band IS the physics
				     arena (block.json's own note); its rendered box is what view.js
				     reads as Draggable's bounds and the Physics2D floor/wall
				     geometry, so band padding/background here directly changes the
				     playable area, not just decoration. ─────────────────────── */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band — the throw arena itself (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
					</p>
					<DesignTokenPicker
						label={ __( 'Band background colour', 'sgs-blocks' ) }
						value={ attributes.contentBandBackground || '' }
						onChange={ ( val ) => setAttributes( { contentBandBackground: val } ) }
					/>
					<ResponsiveBoxControl
						label={ __( 'Band padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.contentBandPadding ?? {},
							tablet: attributes.contentBandPaddingTablet ?? {},
							mobile: attributes.contentBandPaddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const attrMap = {
								base: 'contentBandPadding',
								tablet: 'contentBandPaddingTablet',
								mobile: 'contentBandPaddingMobile',
							};
							setAttributes( { [ attrMap[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* ── Shadow — legacy string token attr (sm/md/lg/glow OR a raw
				     box-shadow CSS string built by ShadowControl), resolved by
				     sgs_shadow_value(). ───────────────────────────────────────── */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				<p className="wp-block-sgs-physics-canvas__editor-notice">
					{ __(
						'Decorative content only — images, media and icons. No links, buttons or body text (they would have no keyboard/reduced-motion alternative once thrown).',
						'sgs-blocks'
					) }
				</p>
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
