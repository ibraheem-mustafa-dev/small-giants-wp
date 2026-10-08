/**
 * Gallery settings-tab Carousel panel, shown only for the carousel layout.
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, ToggleControl } from '@wordpress/components';
// ToolsPanel/ToolsPanelItem exist only as `__experimental*` on WP 7.1 (unprefixed = undefined,
// React error #130 on selecting the block): they must come from the primitives boundary.
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';

export default function GalleryCarouselPanel( { attributes, setAttributes, set } ) {
	const {
		layout,
		carouselAutoplay,
		carouselSpeed,
		carouselShowDots,
		carouselShowArrows,
		dragToScroll,
		dragMomentum,
		loopCarousel,
	} = attributes;

	return (
		<>
				{ /* Panel 6: Carousel (conditional — only when layout = carousel) */ }
				{ 'carousel' === layout && (
					<ToolsPanel
						label={ __( 'Carousel', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								carouselShowArrows: true,
								carouselShowDots: true,
								carouselAutoplay: false,
								carouselSpeed: 5000,
								dragToScroll: false,
								dragMomentum: true,
								loopCarousel: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							hasValue={ () => carouselShowArrows !== true }
							onDeselect={ () => setAttributes( { carouselShowArrows: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show arrows', 'sgs-blocks' ) }
								checked={ carouselShowArrows }
								onChange={ set( 'carouselShowArrows' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show dots', 'sgs-blocks' ) }
							hasValue={ () => carouselShowDots !== true }
							onDeselect={ () => setAttributes( { carouselShowDots: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show dots', 'sgs-blocks' ) }
								checked={ carouselShowDots }
								onChange={ set( 'carouselShowDots' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () => carouselAutoplay !== false }
							onDeselect={ () => setAttributes( { carouselAutoplay: false } ) }
						>
							<ToggleControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								checked={ carouselAutoplay }
								onChange={ set( 'carouselAutoplay' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ carouselAutoplay && (
							<ToolsPanelItem
								label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
								hasValue={ () => carouselSpeed !== 5000 }
								onDeselect={ () => setAttributes( { carouselSpeed: 5000 } ) }
							>
								<RangeControl
									label={ __(
										'Autoplay speed (ms)',
										'sgs-blocks'
									) }
									value={ carouselSpeed }
									onChange={ set( 'carouselSpeed' ) }
									min={ 1000 }
									max={ 10000 }
									step={ 500 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13).
						 * Desktop-only click-and-drag upgrade over the CSS
						 * scroll-snap this layout already renders — touch
						 * keeps its native scroll either way, so this never
						 * needs its own "touch" caveat in the help text.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () => setAttributes( { dragToScroll: false } ) }
						>
							<ToggleControl
								label={ __(
									'Drag to scroll (desktop)',
									'sgs-blocks'
								) }
								checked={ dragToScroll }
								onChange={ set( 'dragToScroll' ) }
								help={ __(
									'Lets visitors click and drag with a mouse to scroll the carousel, on top of the usual arrows, dots, swipe and scrollbar.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ dragToScroll && (
							<ToolsPanelItem
								label={ __( 'Momentum', 'sgs-blocks' ) }
								hasValue={ () => dragMomentum !== true }
								onDeselect={ () => setAttributes( { dragMomentum: true } ) }
							>
								<ToggleControl
									label={ __( 'Momentum', 'sgs-blocks' ) }
									checked={ dragMomentum }
									onChange={ set( 'dragMomentum' ) }
									help={ __(
										'Carousel keeps coasting briefly after the visitor releases the drag, like a real scroll flick.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Infinite loop (Spec 38 §11 loop FR). Deliberately its
						 * OWN toggle, not gated behind "Drag to scroll" —
						 * Bean's ruling: looping is an independent control,
						 * combinable with drag or used entirely on its own
						 * (native swipe/scrollbar/keyboard still loop with
						 * drag off). Default off, same as drag.
						 */ }
						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () => loopCarousel !== false }
							onDeselect={ () => setAttributes( { loopCarousel: false } ) }
						>
							<ToggleControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								checked={ loopCarousel }
								onChange={ set( 'loopCarousel' ) }
								help={ __(
									'Scrolling or dragging past the last image continues into the first, and back again — never a dead end.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }
		</>
	);
}
