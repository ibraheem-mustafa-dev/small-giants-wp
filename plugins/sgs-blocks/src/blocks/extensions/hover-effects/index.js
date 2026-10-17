/**
 * Block link extension: the whole-block link panel.
 *
 * `blockLink` is opt-in: attached only to a block that declares
 * `supports.sgs.enabledExtensions: ["blockLink"]` (see ../hide-extensions.js).
 *
 * The overlay anchor is injected server-side by includes/hover-effects/ via
 * the render_block filter. A getSaveContent.extraProps filter here would bake
 * markup into save() output and cause block validation failures whenever
 * defaults change; render-time injection is the correct path for both static
 * and dynamic blocks.
 *
 * Files: attributes.js (the blocks.registerBlockType filter callback) and
 * panels/BlockLinkPanel.js (the inspector panel). This file wires them
 * together: the HOC plus both addFilter registrations.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import { isExtensionEnabled, isExtensionFlagged } from '../hide-extensions';
import { addBlockLinkAttributes } from './attributes';
import BlockLinkPanel from './panels/BlockLinkPanel';

addFilter(
	'blocks.registerBlockType',
	'sgs/block-link/attributes',
	addBlockLinkAttributes
);

/**
 * Add the block-link panel to the inspector.
 */
const withBlockLinkControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;
		const type = getBlockType( name );

		if ( type?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		const hideBlockLink = ! isExtensionEnabled( name, 'blockLink' );
		// A block that resolves its own link destination at render time
		// (supports.sgs.blockLinkAutoUrl) gets the panel's toggle instead of
		// its URL field: one control for the one capability. Its optional
		// `blockLinkAutoHelp` string says, in the operator's words, where
		// that destination goes.
		const hasAutoUrl = isExtensionFlagged( name, 'blockLinkAutoUrl' );
		// A block whose whole-surface link is permanent, not optional
		// (supports.sgs.blockLinkAlways): the panel renders the help line
		// only, and render.php applies the link with no attribute to read.
		const hasAlwaysLink = isExtensionFlagged( name, 'blockLinkAlways' );
		const autoUrlHelp = String( type?.supports?.sgs?.blockLinkAutoHelp || '' );

		const {
			sgsBlockLink,
			sgsBlockLinkTarget,
			sgsBlockLinkLabel,
			sgsBlockLinkSource,
			sgsBlockLinkAuto,
		} = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				{ /*
				 * Block Link is behaviour (it turns the block into a link), so
				 * it belongs in the default (Settings) tab, not Styles. It
				 * styles nothing: no CSS property sits behind it.
				 */ }
				<InspectorControls>
					{ ! hideBlockLink && (
						<BlockLinkPanel
							sgsBlockLink={ sgsBlockLink }
							sgsBlockLinkTarget={ sgsBlockLinkTarget }
							sgsBlockLinkLabel={ sgsBlockLinkLabel }
							sgsBlockLinkSource={ sgsBlockLinkSource }
							sgsBlockLinkAuto={ sgsBlockLinkAuto }
							hasAutoUrl={ hasAutoUrl }
							autoUrlHelp={ autoUrlHelp }
							alwaysOn={ hasAlwaysLink }
							setAttributes={ setAttributes }
						/>
					) }
				</InspectorControls>
			</>
		);
	};
}, 'withBlockLinkControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/block-link/controls',
	withBlockLinkControls
);
