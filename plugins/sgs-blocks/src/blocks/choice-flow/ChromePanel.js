/**
 * sgs/choice-flow — the header logo's media panel (Spec 43 Phase 3/4 §5), shown while the header is on. The header switch, Close
 * label and Close style are in ShowcasePanel.js ("Progress and steps"), the sticky footer in FlowNavigationPanel.js. The progress colours are rows in the block's Styles-tab
 * colour panel (`colour-rows.js`).
 * Kept as its OWN component (never inlined into edit.js) — edit.js is at its
 * size cap and the build contract forbids adding logic to it; the main
 * thread wires this in with one import + one render line.
 *
 * @package SGS\Blocks
 */

import { InspectorControls } from '@wordpress/block-editor';
import { MediaElementPanel } from '../../components';
import metadata from './block.json';

const LOGO_SLOT = metadata.supports.sgs.mediaElements.find(
	( e ) => 'headerLogo' === e.prefix
);

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function ChromePanel( { attributes, setAttributes } ) {
	const { showHeader } = attributes;

	return (
		<InspectorControls>
			{ showHeader && (
				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					blockName="sgs/choice-flow"
					blockSlug="sgs/choice-flow"
					prefix="headerLogo"
					inGroup="settings"
					atoms={ LOGO_SLOT.atoms }
					kinds={ LOGO_SLOT.kinds }
					context={ LOGO_SLOT.context }
				/>
			) }
		</InspectorControls>
	);
}
