import { InnerBlocks } from '@wordpress/block-editor';

/**
 * SGS Tab — save output.
 *
 * Persists the InnerBlocks panel content to post_content so render.php
 * receives a non-empty $content string. Without this, save:()=>null drops
 * all child blocks on re-save (gotcha B4, plugins/sgs-blocks/CLAUDE.md).
 *
 * sgs/tab is a dynamic block (render.php drives 100% of frontend output);
 * save returns the BARE InnerBlocks marker only — NO wrapper div. render.php
 * already wraps $content in `.sgs-tab__content`, so a save-side wrapper would
 * leak an extra div into $content (the static-div-in-$content problem, D136).
 *
 * @return {JSX.Element} InnerBlocks content placeholder.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
