/**
 * sgs/choice-flow — root chrome inspector panel (Spec 43 Phase 3/4 §5).
 *
 * Design items: an optional header (logo, "Step N of M" eyebrow, Close) and a
 * sticky footer. The progress colours are rows in the block's Styles-tab
 * colour panel (`colour-rows.js`).
 * Kept as its OWN component (never inlined into edit.js) — edit.js is at its
 * size cap and the build contract forbids adding logic to it; the main
 * thread wires this in with one import + one render line.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { MediaElementPanel } from '../../components';
import metadata from './block.json';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';

const LOGO_SLOT = metadata.supports.sgs.mediaElements.find( ( e ) => 'headerLogo' === e.prefix );

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function ChromePanel( { attributes, setAttributes } ) {
	const { showHeader, closeLabel, closeStyle, stickyFooter } = attributes;

	return (
		<InspectorControls>
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
						<SgsFreeTextField type="rich" noLink
							label={ __( 'Close button label', 'sgs-blocks' ) }
							value={ closeLabel }
							onChange={ ( val ) => setAttributes( { closeLabel: val } ) }
							help={ __( 'Shown as visible text next to a decorative ×.', 'sgs-blocks' ) }
						/>
						<ToggleGroupControl
							label={ __( 'Close button', 'sgs-blocks' ) }
							value={ closeStyle || 'icon' }
							onChange={ ( val ) => setAttributes( { closeStyle: val } ) }
							help={ __(
								'Icon: a round 44px button. Text: a bordered rectangular button with the label then a decorative ×.',
								'sgs-blocks'
							) }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="icon" label={ __( 'Icon', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="text" label={ __( 'Text', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</>
				) }
			</PanelBody>

			{ showHeader && (
				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					blockName="sgs/choice-flow"
					blockSlug="sgs/choice-flow"
					prefix="headerLogo"
					atoms={ LOGO_SLOT.atoms }
					kinds={ LOGO_SLOT.kinds }
					context={ LOGO_SLOT.context }
				/>
			) }

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
