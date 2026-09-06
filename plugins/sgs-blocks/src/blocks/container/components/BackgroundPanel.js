/**
 * BackgroundPanel — shared wrapper panel.
 *
 * Split out of ContainerWrapperControls.js on 2026-08-17 (Bean-requested). That file held six
 * independently-mountable shared panels in one module, which repeatedly read as a "monolith" — an
 * audit in this repo measured the decomposition by its LINE COUNT, concluded no split had happened,
 * and had to retract it. One panel per file removes the ambiguity: the split is visible in `ls`.
 *
 * Blocks may import this directly, or via ContainerWrapperControls.js which re-exports it for the
 * existing ~30 call sites.
 */

import { __ } from '@wordpress/i18n';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	ToggleControl,
	TextareaControl,
	TabPanel,
} from '@wordpress/components';
import {
	ResponsiveControl,
	DesignTokenPicker,
	GradientOverlayControl,
	SgsColourPanel,
	SgsLengthControl,
	MediaElementPanel,
} from '../../../components';
import { isExtensionEnabled } from '../../extensions/hide-extensions';
import { LENGTH_UNITS } from './_shared';

const BG_SIZE_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
];

const BG_POSITION_OPTIONS = [
	{ label: __( 'Centre centre', 'sgs-blocks' ), value: 'center center' },
	{ label: __( 'Top centre', 'sgs-blocks' ), value: 'top center' },
	{ label: __( 'Bottom centre', 'sgs-blocks' ), value: 'bottom center' },
	{ label: __( 'Centre left', 'sgs-blocks' ), value: 'center left' },
	{ label: __( 'Centre right', 'sgs-blocks' ), value: 'center right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top right' },
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom right' },
];

const BG_REPEAT_OPTIONS = [
	{ label: __( 'No repeat', 'sgs-blocks' ), value: 'no-repeat' },
	{ label: __( 'Repeat', 'sgs-blocks' ), value: 'repeat' },
	{ label: __( 'Repeat X', 'sgs-blocks' ), value: 'repeat-x' },
	{ label: __( 'Repeat Y', 'sgs-blocks' ), value: 'repeat-y' },
];

const BG_ATTACHMENT_OPTIONS = [
	{ label: __( 'Scroll', 'sgs-blocks' ), value: 'scroll' },
	{ label: __( 'Fixed (parallax)', 'sgs-blocks' ), value: 'fixed' },
];

// Mirrors block.json's `backgroundOverlayBlendMode` enum exactly (the CSS
// mix-blend-mode keyword list that property supports). Kept as a literal
// array rather than importing block.json — an out-of-sync value here would
// silently coerce to the block's default on save (WP enum coercion), which
// is worse than a duplicated list that's easy to eyeball against the schema.
const BG_OVERLAY_BLEND_MODE_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Multiply', 'sgs-blocks' ), value: 'multiply' },
	{ label: __( 'Screen', 'sgs-blocks' ), value: 'screen' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Darken', 'sgs-blocks' ), value: 'darken' },
	{ label: __( 'Lighten', 'sgs-blocks' ), value: 'lighten' },
	{ label: __( 'Colour dodge', 'sgs-blocks' ), value: 'color-dodge' },
	{ label: __( 'Colour burn', 'sgs-blocks' ), value: 'color-burn' },
	{ label: __( 'Soft light', 'sgs-blocks' ), value: 'soft-light' },
	{ label: __( 'Hard light', 'sgs-blocks' ), value: 'hard-light' },
	{ label: __( 'Difference', 'sgs-blocks' ), value: 'difference' },
	{ label: __( 'Exclusion', 'sgs-blocks' ), value: 'exclusion' },
];

export function BackgroundPanel( { attributes, setAttributes, name } ) {
	if ( undefined !== name && ! isExtensionEnabled( name, 'background' ) ) {
		return null;
	}

	const {
		backgroundImage,
		backgroundImageTablet,
		backgroundImageMobile,
		backgroundSize = 'cover',
		backgroundPosition = 'center center',
		backgroundRepeat = 'no-repeat',
		backgroundAttachment = 'scroll',
		bgVideo,
		bgVideoTablet,
		bgVideoMobile,
		bgParallax = false,
		bgKenBurns = false,
		bgAnimationDuration = 20,
		bgSvgContent = '',
		bgSvgPosition = 'background',
		bgSvgAnimation = 'none',
		bgSvgAnimationSpeed = 'medium',
		backgroundOverlayOpacity = 30,
		backgroundOverlayBlendMode = 'normal',
		bgSvgOpacity = 100,
		bgSvgTextShadow = false,
		bgSvgMinHeight = '',
	} = attributes;

	const hasBgImage = !! backgroundImage?.url;

	return (
		<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
			{ /* Help text rewritten 2026-08-21. The previous wording made three claims that
			   are all false under the two-layer model (D2 revised): it called this colour
			   "the background" (it is the OVERLAY), said "there is no separate overlay to
			   set up" (there is — sgs/container gained a real backgroundColour base layer in
			   1905257e), and told clients to LOWER ITS ALPHA to blend over media.
			   That last one was the harmful one: DesignTokenPicker stores a palette SLUG only
			   when the picked colour is string-equal to a palette entry, so changing the alpha
			   breaks the match and stores a RAW HEX instead — silently unlinking the client's
			   brand token, so a later rebrand leaves that colour behind. The shipped help text
			   was instructing people to do it.
			   ⛔ Deliberately NOT renamed to "Background colour": that rename came from D2b,
			   which the design doc marks SUPERSEDED. Under D2 revised the overlay names are
			   correct, and renaming would leave TWO controls both labelled "Background
			   colour" — the real duplicate.
			   Step 4 SHIPPED 2026-08-21 (D717): the blend mechanism is the Overlay
			   opacity control below, and alpha is now switched off on the colour row
			   entirely (GradientOverlayControl.js). This text no longer promises
			   anything that does not exist. */ }
			<p className="components-base-control__help">
				{ __(
					'Sits OVER any image or video behind it — a tint or scrim. Use the opacity slider below to let the media show through. For a plain background with no media, use the Background colour setting instead.',
					'sgs-blocks'
				) }
			</p>
			{ /* Overlay colour — ONE row, deliberately NOT inside <ResponsiveControl>.
			   D739 moved the device axis onto OPACITY below. Colour now has exactly the
			   golden shape every other colour control in the framework has: one row,
			   Normal/Hover tabs, a Solid/Gradient toggle inside each tab.
			   Previously this ALSO sat inside the device switcher, giving one property
			   three axes with two of them in different places on screen — which is what
			   produced the seam Bean caught: a hover tab visible on the desktop tier
			   only. Colour rarely varies by device; scrim WEIGHT does. */ }
			<GradientOverlayControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				solidLabel={ __( 'Overlay colour', 'sgs-blocks' ) }
			/>
			{ /* D717 (2026-08-21). REPLACES the colour picker's alpha channel as the
			   overlay's transparency mechanism — see the help-text comment above for
			   why alpha was actively harmful. Reaches all eight blocks that mount this
			   panel (container, cta-section, hero, multi-button, physics-canvas,
			   site-footer, site-header, trust-bar) with no per-block wiring, and is
			   painted by the one shared owner, sgs_overlay_decls(). */ }
			<ResponsiveControl label={ __( 'Overlay opacity', 'sgs-blocks' ) }>
				{ ( bp ) => {
					// D739: opacity carries the device axis, because what varies per
					// device is HOW HEAVY the scrim is, not what colour it is. Desktop
					// writes the base attr; a tier writes its own and is left UNDEFINED
					// when unset, so it inherits desktop by ordinary cascade instead of
					// pinning a duplicate value that would then fight a later edit.
					const key =
						'desktop' === bp
							? 'backgroundOverlayOpacity'
							: 'tablet' === bp
							? 'backgroundOverlayOpacityTablet'
							: 'backgroundOverlayOpacityMobile';
					return (
						<RangeControl
							label={ __( 'Overlay opacity', 'sgs-blocks' ) }
							// <ResponsiveControl> paints its own label span
							// unconditionally, so the visible text would appear TWICE
							// without this. The label prop stays for the accessible
							// name — hiding it from vision is not the same as removing
							// it, and a RangeControl with no accessible name is worse
							// than a duplicated one. Caught by inspector-scan rule 29.
							hideLabelFromVision
							help={
								'desktop' === bp
									? __(
											'How solid the overlay is. Lower it to let an image or video behind show through.',
											'sgs-blocks'
									  )
									: __(
											'Leave unset to use the desktop value. Set it to make the scrim heavier or lighter at this screen size.',
											'sgs-blocks'
									  )
							}
							value={ attributes[ key ] }
							onChange={ ( val ) =>
								setAttributes( {
									[ key ]:
										undefined === val
											? ( 'desktop' === bp ? 30 : undefined )
											: val,
								} )
							}
							min={ 0 }
							max={ 100 }
							step={ 1 }
							allowReset
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					);
				} }
			</ResponsiveControl>
			{ /* Blend mode — the plain CSS `mix-blend-mode` keyword the overlay
			   paints with against whatever sits behind it (media, block
			   background). Options list mirrors block.json's enum verbatim;
			   if the two ever disagree WordPress silently coerces an
			   out-of-enum stored value back to "normal" on save, so any
			   future edit to the enum must land in both places together. */ }
			<SelectControl
				label={ __( 'Overlay blend mode', 'sgs-blocks' ) }
				help={ __(
					'How the overlay colour mixes with the image or video behind it.',
					'sgs-blocks'
				) }
				value={ backgroundOverlayBlendMode }
				options={ BG_OVERLAY_BLEND_MODE_OPTIONS }
				onChange={ ( val ) =>
					setAttributes( { backgroundOverlayBlendMode: val } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TabPanel
				tabs={ [
					{ name: 'image', title: __( 'Image', 'sgs-blocks' ) },
					{ name: 'video', title: __( 'Video', 'sgs-blocks' ) },
					{ name: 'svg', title: __( 'SVG', 'sgs-blocks' ) },
				] }
			>
				{ ( tab ) => {
					// ---- Image tab ----
					if ( tab.name === 'image' ) {
						return (
							<>
								{ /* The BASE picker stays OUTSIDE the device switcher, always
								     visible. It is the primary control: putting it inside the
								     desktop branch would hide it whenever the global device
								     toggle sits on tablet/mobile, so a client on a narrow
								     preview could not set the main image at all — and the
								     tier gate's "set a desktop image above" would point at
								     nothing. Matches src/blocks/media/edit.js, where the base
								     picker precedes the tier control. */ }
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Background image', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( { backgroundImage: { id: media.id, url: media.url, alt: media.alt } } )
										}
										allowedTypes={ [ 'image' ] }
										value={ backgroundImage?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ backgroundImage?.url ? (
													<>
														<img src={ backgroundImage.url } alt="" style={ { maxWidth: '100%', marginBottom: '8px' } } />
														<Button variant="secondary" onClick={ () => setAttributes( { backgroundImage: undefined } ) } isDestructive>
															{ __( 'Remove image', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select image', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								{ /* ONE consolidated per-device override (was 2 more always-visible
								     stacked MediaUpload controls). Gated on the base image
								     existing — an override for an image that is not there is a
								     dead control (Spec 35 Part D5). */ }
								{ hasBgImage && (
								<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
									{ ( bp ) => {
										if ( 'desktop' === bp ) {
											return (
												<p style={ { margin: 0, fontStyle: 'italic' } }>
													{ __(
														'The image above is used on desktop. Switch to tablet or mobile to set a different crop.',
														'sgs-blocks'
													) }
												</p>
											);
										}

										const key = 'tablet' === bp ? 'backgroundImageTablet' : 'backgroundImageMobile';
										const tierImage = attributes[ key ];
										return (
											<>
												<MediaUploadCheck>
													<MediaUpload
														onSelect={ ( media ) =>
															setAttributes( { [ key ]: { id: media.id, url: media.url, alt: media.alt } } )
														}
														allowedTypes={ [ 'image' ] }
														value={ tierImage?.id }
														render={ ( { open } ) => (
															<Button variant="secondary" onClick={ open }>
																{ tierImage?.url
																	? __( 'Replace image', 'sgs-blocks' )
																	: __( 'Set image', 'sgs-blocks' ) }
															</Button>
														) }
													/>
												</MediaUploadCheck>
												{ tierImage?.url && (
													<Button
														variant="link"
														isDestructive
														onClick={ () => setAttributes( { [ key ]: undefined } ) }
														style={ { marginTop: '8px', display: 'block' } }
													>
														{ __( 'Use the main image here', 'sgs-blocks' ) }
													</Button>
												) }
											</>
										);
									} }
								</ResponsiveControl>
								) }

								{ hasBgImage && (
									<>
										<SelectControl
											label={ __( 'Size', 'sgs-blocks' ) }
											value={ backgroundSize }
											options={ BG_SIZE_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundSize: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ backgroundPosition }
											options={ BG_POSITION_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundPosition: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Repeat', 'sgs-blocks' ) }
											value={ backgroundRepeat }
											options={ BG_REPEAT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundRepeat: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Attachment', 'sgs-blocks' ) }
											value={ backgroundAttachment }
											options={ BG_ATTACHMENT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundAttachment: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</>
								) }
							</>
						);
					}

					// ---- Video tab ----
					if ( tab.name === 'video' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Video replaces the background image. Add an image as fallback for browsers that block autoplay.', 'sgs-blocks' ) }
								</p>
								{ /* BASE picker OUTSIDE the device switcher, always visible —
								     same reasoning as the image tab above: the base video is the
								     primary control and must not disappear when the global device
								     toggle sits on tablet/mobile. */ }
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Background video', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) => setAttributes( { bgVideo: { id: media.id, url: media.url } } ) }
										allowedTypes={ [ 'video' ] }
										value={ bgVideo?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ bgVideo?.url ? (
													<>
														<p style={ { fontSize: '12px', marginBottom: '4px' } }>{ bgVideo.url.split( '/' ).pop() }</p>
														<Button variant="secondary" onClick={ () => setAttributes( { bgVideo: undefined } ) } isDestructive>
															{ __( 'Remove video', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select video', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								{ /* ONE consolidated per-device override, gated on the base video
								     existing (Spec 35 Part D5). Mirrors src/blocks/media/edit.js's
								     video art-direction control. */ }
								{ bgVideo?.url && (
								<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
									{ ( bp ) => {
										if ( 'desktop' === bp ) {
											return (
												<p style={ { margin: 0, fontStyle: 'italic' } }>
													{ __(
														'The video above is used on desktop. Switch to tablet or mobile to set a different one.',
														'sgs-blocks'
													) }
												</p>
											);
										}

										const key = 'tablet' === bp ? 'bgVideoTablet' : 'bgVideoMobile';
										const tierVideo = attributes[ key ];
										return (
											<>
												<MediaUploadCheck>
													<MediaUpload
														onSelect={ ( media ) => setAttributes( { [ key ]: { id: media.id, url: media.url } } ) }
														allowedTypes={ [ 'video' ] }
														value={ tierVideo?.id }
														render={ ( { open } ) => (
															<Button variant="secondary" onClick={ open }>
																{ tierVideo?.url
																	? __( 'Replace video', 'sgs-blocks' )
																	: __( 'Set video', 'sgs-blocks' ) }
															</Button>
														) }
													/>
												</MediaUploadCheck>
												{ tierVideo?.url && (
													<>
														<p style={ { fontSize: '12px', marginTop: '4px', marginBottom: '4px' } }>{ tierVideo.url.split( '/' ).pop() }</p>
														<Button
															variant="link"
															isDestructive
															onClick={ () => setAttributes( { [ key ]: undefined } ) }
															style={ { marginTop: '4px', display: 'block' } }
														>
															{ __( 'Use the main video here', 'sgs-blocks' ) }
														</Button>
													</>
												) }
											</>
										);
									} }
								</ResponsiveControl>
								) }

								{ /* Size/Position — closes the gap this atom migration exists for:
								     the Image tab has had Size/Position since the panel shipped;
								     the Video tab had NOTHING, so a client setting a video
								     background had no way to control how it fits/positions. Routes
								     into the SAME backgroundSize/backgroundPosition attributes the
								     Image tab's controls write (prefix="background" + the object-fit/
								     focal-point atoms' own "Size"/"Position" backdrop-scope bases —
								     mediaAttrName('background','Size') derives 'backgroundSize' exactly,
								     zero renames, no second attribute family). Deliberately NOT
								     replacing the Image tab's own hand-rolled Size/Position
								     SelectControls — this is a pure ADDITION for a tab that had zero
								     such controls, keeping the Image tab's byte-identical existing
								     behaviour completely untouched. Repeat/Attachment stay hand-rolled
								     Image-tab-only, unaffected — no atom owns those two bases. Gated on
								     bgVideo existing, matching the art-direction control above. */ }
								{ bgVideo?.url && (
									<>
										<p className="components-base-control__label" style={ { fontWeight: 600, marginTop: '12px', marginBottom: '4px' } }>
											{ __( 'Video sizing', 'sgs-blocks' ) }
										</p>
										<MediaElementPanel
											attributes={ attributes }
											setAttributes={ setAttributes }
											prefix="background"
											blockSlug={ name }
											insertion="element"
											atoms={ [ 'object-fit', 'focal-point' ] }
											scope="backdrop"
										/>
									</>
								) }
							</>
						);
					}

					// ---- SVG tab ----
					if ( tab.name === 'svg' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Paste SVG markup to render it as an animated background or foreground layer. Animations use pure CSS — no JavaScript required.', 'sgs-blocks' ) }
								</p>
								<TextareaControl
									label={ __( 'SVG code', 'sgs-blocks' ) }
									value={ bgSvgContent }
									onChange={ ( val ) => setAttributes( { bgSvgContent: val } ) }
									help={ __( 'Paste your <svg>…</svg> markup here.', 'sgs-blocks' ) }
									rows={ 8 }
								/>
								{ bgSvgContent && (
									<>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ bgSvgPosition }
											options={ [
												{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
												{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgPosition: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<RangeControl
											label={ __( 'Opacity (%)', 'sgs-blocks' ) }
											value={ bgSvgOpacity }
											onChange={ ( val ) => setAttributes( { bgSvgOpacity: val } ) }
											min={ 0 }
											max={ 100 }
											step={ 5 }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Animation', 'sgs-blocks' ) }
											value={ bgSvgAnimation }
											options={ [
												{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
												{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
												{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
												{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgAnimation: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										{ bgSvgAnimation !== 'none' && (
											<SelectControl
												label={ __( 'Animation speed', 'sgs-blocks' ) }
												value={ bgSvgAnimationSpeed }
												options={ [
													{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
													{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
													{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
												] }
												onChange={ ( val ) => setAttributes( { bgSvgAnimationSpeed: val } ) }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										) }
										<ToggleControl
											label={ __( 'Text shadow', 'sgs-blocks' ) }
											help={ __( 'Adds a subtle shadow to inner text for readability over busy SVG layers.', 'sgs-blocks' ) }
											checked={ bgSvgTextShadow }
											onChange={ ( val ) => setAttributes( { bgSvgTextShadow: val } ) }
											__nextHasNoMarginBottom
										/>
										<SgsLengthControl
											presets={ false }
											label={ __( 'Minimum height', 'sgs-blocks' ) }
											value={ bgSvgMinHeight }
											units={ LENGTH_UNITS }
											onChange={ ( val ) => setAttributes( { bgSvgMinHeight: val ?? '' } ) }
											help={ __(
												'Minimum height applied to the SVG background layer, e.g. 400px or 50vh. Leave blank for no minimum.',
												'sgs-blocks'
											) }
										/>
									</>
								) }
							</>
						);
					}

					return null;
				} }
			</TabPanel>

			{ /* Ken-burns/parallax are MODIFIERS on whichever media source is active
			    above (image/video), not a media source themselves — so they sit
			    below the tabs rather than as a peer "Anim" tab. Same relocation
			    technique as the Overlay colour/gradient row above the tabs. */ }
			<hr style={ { margin: '16px 0' } } />
			<p className="components-base-control__help">
				{ __( 'Requires a background image. Ken-burns and parallax are mutually exclusive — ken-burns takes priority.', 'sgs-blocks' ) }
			</p>
			<ToggleControl
				label={ __( 'Ken-burns zoom', 'sgs-blocks' ) }
				help={ __( 'Slow zoom animation on the background image.', 'sgs-blocks' ) }
				checked={ bgKenBurns }
				onChange={ ( val ) =>
					setAttributes( { bgKenBurns: val, bgParallax: val ? false : bgParallax } )
				}
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Parallax scroll', 'sgs-blocks' ) }
				help={ __( 'Fixed background-attachment parallax effect. Disabled on touch devices.', 'sgs-blocks' ) }
				checked={ bgParallax }
				onChange={ ( val ) =>
					setAttributes( { bgParallax: val, bgKenBurns: val ? false : bgKenBurns } )
				}
				__nextHasNoMarginBottom
			/>
			{ bgKenBurns && (
				<RangeControl
					label={ __( 'Animation duration (seconds)', 'sgs-blocks' ) }
					value={ bgAnimationDuration }
					onChange={ ( val ) => setAttributes( { bgAnimationDuration: val } ) }
					min={ 5 }
					max={ 60 }
					step={ 1 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}

/**
 * `WrapperColourPanel` (shape-divider + grid-item colour rows) never lived
 * in this file as code — this was a design-stage docblock with no function
 * attached to it. The real component is `./WrapperColourPanel.js`, which
 * was neutralised to a no-op on 2026-08-22 (D4/D5/step-7, unified-colour-
 * panel design): it had zero JSX mounts anywhere in the plugin, and two of
 * its four rows duplicated `ShapeDividersPanel.js`'s live gradient-capable
 * colour controls with conflicting (non-gradient) semantics. See that
 * file's own docblock for the full reasoning and the follow-up still owed
 * (repointing `ContainerWrapperControls.js`'s import, then deleting it).
 */
