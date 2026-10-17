/**
 * Block link extension: attribute registration.
 *
 * Registered against `blocks.registerBlockType` by ./index.js under
 * 'sgs/block-link/attributes'. A block opts in with
 * `supports.sgs.enabledExtensions: ["blockLink"]`.
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import { isExtensionEnabled, isExtensionFlagged } from '../hide-extensions';

/**
 * Add the block-link attributes to a block that opts in.
 *
 * @param {Object} settings Block settings from blocks.registerBlockType.
 * @return {Object} Settings with the block-link attributes merged in.
 */
export function addBlockLinkAttributes( settings ) {
	const type = getBlockType( settings.name );
	// Skip blocks that do not support className.
	if ( type?.supports?.className === false ) {
		return settings;
	}

	const linkAttributes = isExtensionEnabled( settings, 'blockLink' )
		? {
			// Block link: injects an empty stretched-link overlay <a> as
			// the block root's last child (server-side, includes/hover-
			// effects/hover-effects.php). Never wraps the block, which would
			// produce invalid nested <a> whenever the block has its own links.
			sgsBlockLink:         { type: 'string',  default: '' },
			sgsBlockLinkTarget:   { type: 'boolean', default: false },
			// Accessible name for the overlay anchor: an empty anchor has no
			// text content for screen readers.
			sgsBlockLinkLabel:    { type: 'string',  default: '' },
			// Where the link goes ('' = the typed sgsBlockLink): a page by ID,
			// a Site Info link or back to top, resolved server-side by
			// includes/helpers-link-source.php (shared link popover's source).
			sgsBlockLinkSource:   { type: 'string',  default: '' },
		}
		: {};

	// Whole-block link for a block that resolves its OWN destination at
	// render time (supports.sgs.blockLinkAutoUrl). The block hands the URL to
	// the same overlay mechanism from its render.php via
	// includes/helpers-stretched-link.php::sgs_stretched_link_handover, so the
	// operator gets a toggle instead of a URL field (see BlockLinkPanel).
	const linkAutoAttributes = isExtensionFlagged( settings, 'blockLinkAutoUrl' )
		? {
			sgsBlockLinkAuto:     { type: 'boolean', default: false },
		}
		: {};

	return {
		...settings,
		attributes: {
			...settings.attributes,
			...linkAttributes,
			...linkAutoAttributes,
		},
	};
}
