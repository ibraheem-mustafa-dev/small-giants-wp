/**
 * sgs/choice-flow — layout inspector panel (FR-43-24).
 *
 * Lets an operator pick the flow's layout: 'compact' (the existing single
 * column, for a flow inline on a page) or 'showcase' (a full-height frame
 * with a sticky stage beside the steps, for a flow shown full screen — see
 * choice-flow/render.php's own `$is_showcase` branches). Set on the saved
 * flow itself, never per placement (FR-43-25) — a linked flow always
 * renders the referenced post's own layout.
 *
 * Kept as its OWN component (never inlined into edit.js) — edit.js is at
 * its size cap; the main thread wires this in with one import + one render
 * line, matching the `ChromePanel`/`NavigationPanel` precedent already set
 * in this directory.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function FlowLayoutPanel( { attributes, setAttributes } ) {
	const { flowLayout } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Layout', 'sgs-blocks' ) }
					value={ flowLayout || 'compact' }
					options={ [
						{ label: __( 'Compact', 'sgs-blocks' ), value: 'compact' },
						{ label: __( 'Showcase (full screen)', 'sgs-blocks' ), value: 'showcase' },
					] }
					onChange={ ( val ) => setAttributes( { flowLayout: val } ) }
					help={ __(
						'Compact is a single column for a flow inline on a page. Showcase spends a full screen — a header bar, a progress line, a sticky stage beside the steps and large image-led option cards — for a flow opened in a popup.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</InspectorControls>
	);
}
