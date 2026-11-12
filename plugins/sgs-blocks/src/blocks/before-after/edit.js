/**
 * Editor for sgs/before-after.
 *
 * Fully dynamic block: save() returns null, all output comes from
 * render.php. The canvas shows a live <ServerSideRender> preview so the
 * frame/labels/divider position reflect real render.php output — never a
 * hand-built editor-only approximation (ssr-fixes-hand-built-preview-drift).
 *
 * Spec 38 §9 editor canvas story for Draggable effects: STATIC (the
 * server-rendered CSS-only split at `startPosition`), with a Notice reading
 * "Drag interactions are live-site only" — view.js is a frontend-only
 * viewScriptModule and never runs in wp-admin, so there is nothing to fake
 * here; the static preview IS the truth.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import {
	PanelBody,
	ToggleControl,
	RangeControl,
	SelectControl,
	Notice,
	Spinner,
} from '@wordpress/components';
import ServerSideRender from '../../components/ServerSideRender';
import {
	SgsColourPanel,
	SsrPreviewGuard,
	textRow,
	DesignTokenPicker,
	ShadowControl,
	TypographyControls,
	ResponsiveOverride,
	shadowAttrKeys,
	SgsLengthControl,
	SgsBorderControl,
	resolveColourToken,
	MediaElementPanel,
	IconPicker,
} from '../../components';
import { hasFile } from '../../components/media/mediaSlotWrites.js';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';
const HEIGHT_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'vh', label: 'vh' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: '%', label: '%' },
];

const WIDTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

/**
 * ServerSideRender serialises its `attributes` prop into REST query args via
 * `@wordpress/url`'s `addQueryArgs`, which turns a JS `null` into an EMPTY
 * STRING in the URL (there is no way to put a real `null` in a query
 * string). The `/wp/v2/block-renderer` endpoint then validates that empty
 * string against THIS block's own attribute schema — and for
 * `videoAutoplayTablet`/`videoAutoplayMobile` (typed `["boolean","null"]`,
 * default `null`, the framework's "inherit the tier above" convention) an
 * empty string matches neither branch. The whole preview request 400s with
 * `rest_invalid_param`, and ServerSideRender surfaces that as the canvas
 * error notice "Preview failed to load." — confirmed live: the REST call
 * returns `{"code":"rest_invalid_param","data":{"params":{"attributes":
 * "[videoAutoplayTablet] is not of type boolean,null."}}}`.
 *
 * Fix: omit any attribute whose value is `null` before handing attributes
 * to ServerSideRender. An omitted query param is never validated against
 * the schema at all, and render.php already reads every attribute through
 * an `?? null`/`?? default` fallback (see `$video_autoplay_tablet_raw`
 * above) — so the effective value render.php sees is identical whether the
 * key is present-as-null or simply absent. This is a transport-layer fix,
 * not a behaviour change.
 *
 * @param {Object} attrs Full block attributes.
 * @return {Object} The same attributes with any `null`-valued key removed.
 */
function omitNullAttributes( attrs ) {
	const out = {};
	for ( const key in attrs ) {
		if ( null !== attrs[ key ] ) {
			out[ key ] = attrs[ key ];
		}
	}
	return out;
}

/**
 * Whether a comparison side has a file on any device, mirroring the renderer's own test so the editor's placeholder
 * and preview toggle never disagree with what render.php will print.
 *
 * @param {Object} attributes Full block attributes.
 * @param {string} side       'before' | 'after'.
 * @return {boolean} True when the side has media.
 */
function slotHasContent( attributes, side ) {
	const stored = attributes[ `${ side }Source` ];
	return [ 'desktop', 'tablet', 'mobile' ].some( ( device ) => hasFile( stored?.[ device ] ) );
}

/**
 * One side's `supports.sgs.mediaElements` entry: its kinds and the atoms it narrows to.
 *
 * @param {string} side 'before' | 'after'.
 * @return {{kinds: string[], atoms: string[], context: string}} The entry.
 */
function slotEntry( side ) {
	const entries = getBlockType( 'sgs/before-after' )?.supports?.sgs?.mediaElements || [];
	return entries.find( ( entry ) => entry.prefix === side ) || { kinds: [ 'image', 'video', 'svg' ], context: 'content' };
}

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();

	const {
		showLabels,
		beforeLabel,
		afterLabel,
		labelBackgroundColour,
		labelBackgroundColourGradient,
		orientation,
		reverseDirection,
		startPosition,
		freeDrag,
		dividerColour,
		dividerColourGradient,
		dividerColourHover,
		dividerColourHoverGradient,
		dividerWidth,
		handleColour,
		handleColourGradient,
		handleColourHover,
		handleColourHoverGradient,
		handleIconColour,
		handleIconColourGradient,
		handleIconColourHover,
		handleIconColourHoverGradient,
		handleIconSource,
		handleIconName,
		boxShadow,
		boxShadowColour,
	} = attributes;

	const hasBothImages =
		slotHasContent( attributes, 'before' ) &&
		slotHasContent( attributes, 'after' );

	return (
		<>
			{ /* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour
			   panel, rendered FIRST. Replaces the scattered DesignTokenPicker
			   rows previously inline inside the Divider/Labels panels below.
			   labelColour gained a hover pair 2026-09-07 (Task 1,
			   colour-conformance); labelBackground below still has none.
			   boxShadow's colour row (D621/D622) lives here too — the shape
			   stays with ShadowControl in the Frame styling ToolsPanel below,
			   colour is externally managed per the shared colour-architecture. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'labelText',
						label: __( 'Label text colour', 'sgs-blocks' ),
						attrs: {
							base: 'labelColour',
							hover: 'labelColourHover',
							gradient: 'labelColourGradient',
							hoverGradient: 'labelColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'labelBackground',
						label: __( 'Label background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: labelBackgroundColour,
								onChange: ( val ) => setAttributes( { labelBackgroundColour: val } ),
								gradientValue: labelBackgroundColourGradient,
								onGradientChange: ( val ) => setAttributes( { labelBackgroundColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ [ 'before', 'after' ].map( ( side ) => {
				const entry = slotEntry( side );
				return (
					<MediaElementPanel
						key={ side }
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix={ side }
						label={ 'before' === side ? __( 'Before', 'sgs-blocks' ) : __( 'After', 'sgs-blocks' ) }
						blockName="sgs/before-after"
						blockSlug="sgs/before-after"
						atoms={ entry.atoms }
						kinds={ entry.kinds }
						context={ entry.context }
					/>
				);
			} ) }
			<InspectorControls group="settings">
				<PanelBody
					title={ __( 'Divider', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ [
							{
								value: 'horizontal',
								label: __(
									'Horizontal (left/right)',
									'sgs-blocks'
								),
							},
							{
								value: 'vertical',
								label: __(
									'Vertical (top/bottom)',
									'sgs-blocks'
								),
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { orientation: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Reverse direction', 'sgs-blocks' ) }
						help={
							'vertical' === orientation
								? __(
										'Off: after revealed from the top (default). On: after revealed from the bottom.',
										'sgs-blocks'
								  )
								: __(
										'Off: after revealed from the left (default). On: after revealed from the right — the more common slider convention.',
										'sgs-blocks'
								  )
						}
						checked={ !! reverseDirection }
						onChange={ ( val ) =>
							setAttributes( { reverseDirection: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Default split position', 'sgs-blocks' ) }
						help={ __(
							'Where the divider sits before a visitor drags it — also the ENTIRE comparison a no-JS visitor sees.',
							'sgs-blocks'
						) }
						value={ startPosition }
						onChange={ ( val ) =>
							setAttributes( { startPosition: val ?? 50 } )
						}
						min={ 0 }
						max={ 100 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Free drag on image', 'sgs-blocks' ) }
						help={ __(
							'Adds pointer drag anywhere on the image (GSAP Draggable), layered on top of the always-available keyboard/touch slider. Turning this off still leaves the divider fully operable via the slider handle and arrow keys.',
							'sgs-blocks'
						) }
						checked={ !! freeDrag }
						onChange={ ( val ) =>
							setAttributes( { freeDrag: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Divider colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: dividerColour,
								onChange: ( val ) => setAttributes( { dividerColour: val } ),
								gradientValue: dividerColourGradient,
								onGradientChange: ( val ) => setAttributes( { dividerColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: dividerColourHover,
								onChange: ( val ) => setAttributes( { dividerColourHover: val } ),
								gradientValue: dividerColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { dividerColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<RangeControl
						label={ __( 'Divider thickness (px)', 'sgs-blocks' ) }
						value={ dividerWidth }
						onChange={ ( val ) =>
							setAttributes( { dividerWidth: val ?? 3 } )
						}
						min={ 1 }
						max={ 12 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Handle', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Handle colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: handleColour,
								onChange: ( val ) => setAttributes( { handleColour: val } ),
								gradientValue: handleColourGradient,
								onGradientChange: ( val ) => setAttributes( { handleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: handleColourHover,
								onChange: ( val ) => setAttributes( { handleColourHover: val } ),
								gradientValue: handleColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { handleColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Handle icon colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: handleIconColour,
								onChange: ( val ) => setAttributes( { handleIconColour: val } ),
								gradientValue: handleIconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { handleIconColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: handleIconColourHover,
								onChange: ( val ) => setAttributes( { handleIconColourHover: val } ),
								gradientValue: handleIconColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { handleIconColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<IconPicker
						label={ __( 'Handle icon', 'sgs-blocks' ) }
						value={ { source: handleIconSource, name: handleIconName } }
						onChange={ ( { source, name } ) =>
							setAttributes( { handleIconSource: source, handleIconName: name } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Labels', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show labels', 'sgs-blocks' ) }
						checked={ !! showLabels }
						onChange={ ( val ) =>
							setAttributes( { showLabels: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showLabels && (
						<>
							<SgsFreeTextField type="rich"
								label={ __( 'Before label', 'sgs-blocks' ) }
								value={ beforeLabel }
								onChange={ ( val ) =>
									setAttributes( { beforeLabel: val } )
								}
							/>
							<SgsFreeTextField type="rich"
								label={ __( 'After label', 'sgs-blocks' ) }
								value={ afterLabel }
								onChange={ ( val ) =>
									setAttributes( { afterLabel: val } )
								}
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="label"
								fontSizePresets={ true }
								showFontFamily={ true }
								showLineHeight={ true }
								showDecoration={ true }
								showTransform={ true }
								showLetterSpacing={ true }
								showTextAlign={ true }
								showTextWrap={ true }
								showTextStroke
								showTextColumns={ true }
								showWritingMode={ true }
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Frame size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Height', 'sgs-blocks' ) }
						value={ attributes.height }
						onChange={ ( obj ) => setAttributes( { height: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ HEIGHT_UNITS }
							/>
						) }
					</ResponsiveOverride>
					{ /*
					  `maxWidth` is a TIER OBJECT (Spec 35 pass 2) — ONE attr holding
					  {desktop,tablet,mobile}. It must use ResponsiveOverride, which
					  reads and writes the object; ResponsiveControl writes one flat
					  attr per tier and `maxWidthTablet`/`maxWidthMobile` are no
					  longer declared, so WordPress would silently discard them
					  (D338) while the desktop branch wrote a string into an
					  object-typed attr and destroyed the setting (D563).
					*/ }
					<ResponsiveOverride
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ attributes.maxWidth }
						onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ WIDTH_UNITS }
							/>
						) }
					</ResponsiveOverride>
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

			{ /*
			  Border radius previously had TWO controls writing different storage:
			  this panel wrote WP-native style.border.radius (undeclared in
			  block.json, silently discarded by WordPress — check-undeclared-attrs
			  finding), while the "Border" panel's SgsBorderControl above (D876/D881
			  standard) already writes the real private borderRadius/Tablet/Mobile
			  attrs render.php actually reads. Removed the duplicate rather than
			  redirecting it to the same attrs a second control already owns.
			*/ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Frame styling', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( { boxShadow: '', boxShadowColour: '' } )
					}
				>
					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => !! boxShadow }
						onDeselect={ () =>
							setAttributes( { boxShadow: '', boxShadowColour: '' } )
						}
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ shadowAttrKeys( 'boxShadow', { hover: true, hoverColour: true } ) }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! hasBothImages ? (
					<div className="wp-block-sgs-before-after-editor__placeholder">
						<p>
							{ __(
								'Add media for Before and After (image, video, or SVG) to preview the comparison slider.',
								'sgs-blocks'
							) }
						</p>
					</div>
				) : (
					<>
						<Notice
							status="info"
							isDismissible={ false }
							className="wp-block-sgs-before-after-editor__notice"
						>
							{ __(
								'Drag interactions are live-site only — this preview shows the default split position.',
								'sgs-blocks'
							) }
						</Notice>
						<SsrPreviewGuard>
							<ServerSideRender
								block="sgs/before-after"
								attributes={ omitNullAttributes( attributes ) }
								LoadingResponsePlaceholder={ () => (
									<div
										style={ {
											padding: '2rem',
											textAlign: 'center',
										} }
									>
										<Spinner />
									</div>
								) }
								ErrorResponsePlaceholder={ ( { response } ) => (
									<Notice status="error" isDismissible={ false }>
										{ response?.errorMsg ||
											__(
												'Preview failed to load.',
												'sgs-blocks'
											) }
									</Notice>
								) }
							/>
						</SsrPreviewGuard>
					</>
				) }
			</div>
		</>
	);
}
