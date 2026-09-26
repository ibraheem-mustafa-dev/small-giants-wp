/**
 * sgs/choice-flow — root chrome inspector panel (Spec 43 Phase 3/4 §5).
 *
 * Owed Eye Care hand-build design items: the progress bar fill's colour, an
 * optional header (logo, "Step N of M" eyebrow, Close), and a sticky footer.
 * Kept as its OWN component (never inlined into edit.js) — edit.js is at its
 * size cap and the build contract forbids adding logic to it; the main
 * thread wires this in with one import + one render line.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl, SelectControl, Button } from '@wordpress/components';
import { SgsColourPanel } from '../../components';
import fillRow from '../../components/colour-variants/fillRow';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function ChromePanel( { attributes, setAttributes } ) {
	const { progressColour, showHeader, headerLogo, closeLabel, closeStyle, stickyFooter } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Progress bar colour', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsColourPanel
					rows={ [
						fillRow( {
							key: 'progress-fill',
							label: __( 'Fill', 'sgs-blocks' ),
							attrs: { base: 'progressColour' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
			</PanelBody>

			<PanelBody title={ __( 'Header', 'sgs-blocks' ) } initialOpen={ false }>
				<ToggleControl
					label={ __( 'Show header', 'sgs-blocks' ) }
					checked={ !! showHeader }
					onChange={ ( val ) => setAttributes( { showHeader: val } ) }
					help={ __(
						'A logo, a "Step N of M" eyebrow and a Close button above the progress bar. Close only shows when this flow is inside a modal.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				{ showHeader && (
					<>
						<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
							{ __( 'Logo', 'sgs-blocks' ) }
						</p>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										headerLogo: { id: media.id, url: media.url, alt: media.alt || '' },
									} )
								}
								allowedTypes={ [ 'image' ] }
								value={ headerLogo?.id }
								render={ ( { open } ) => (
									<div style={ { marginBottom: '8px' } }>
										{ headerLogo?.url ? (
											<>
												<img
													src={ headerLogo.url }
													alt=""
													style={ { maxWidth: '160px', display: 'block', marginBottom: '8px' } }
												/>
												<Button
													variant="secondary"
													onClick={ () => setAttributes( { headerLogo: {} } ) }
													isDestructive
												>
													{ __( 'Remove logo', 'sgs-blocks' ) }
												</Button>
											</>
										) : (
											<Button variant="secondary" onClick={ open }>
												{ __( 'Select logo', 'sgs-blocks' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
						<TextControl
							label={ __( 'Close button label', 'sgs-blocks' ) }
							value={ closeLabel }
							onChange={ ( val ) => setAttributes( { closeLabel: val } ) }
							help={ __( 'Shown as visible text next to a decorative ×.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Close button', 'sgs-blocks' ) }
							value={ closeStyle || 'icon' }
							options={ [
								{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
								{ label: __( 'Text', 'sgs-blocks' ), value: 'text' },
							] }
							onChange={ ( val ) => setAttributes( { closeStyle: val } ) }
							help={ __(
								'Icon: a round 44px button. Text: a bordered rectangular button with the label then a decorative ×.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</>
				) }
			</PanelBody>

			<PanelBody title={ __( 'Footer', 'sgs-blocks' ) } initialOpen={ false }>
				<ToggleControl
					label={ __( 'Sticky footer', 'sgs-blocks' ) }
					checked={ !! stickyFooter }
					onChange={ ( val ) => setAttributes( { stickyFooter: val } ) }
					help={ __(
						'Pins the Back button (and the result step’s primary action) to the bottom of the screen while a step is in view.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
	);
}
