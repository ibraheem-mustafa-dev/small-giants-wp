/**
 * Separators: the one editor hook every canvas uses to preview a list's lines.
 *
 * A block that declares `supports.sgs.separators` previews the lines in its own canvas
 * through this hook (scripts/check-separators-through-helper.py fails a block that does
 * not). The two drawing paths of the front end are one API here:
 *
 * Flow list (a grid or wrapping list; native gap decorations, the measured overlay in
 * Safari and Firefox). The hook returns the list element's `ref` and `style`:
 *
 *   const sep = useSeparatorsCanvas( { separators, device: previewTier, active: 'grid' === layout } );
 *   <div ref={ sep.ref } style={ { ...sep.style } }> ...items... </div>
 *
 * Where the list element is also the block root, merge `sep.ref` with `blockProps.ref`
 * (`useMergeRefs`) and spread `sep.style` into the block's style.
 *
 * Line list (a single row or column whose items draw the line): pass `line` and render the
 * returned `css` in a `<style>` beside the list. `name` (and `attribute`) say which
 * block.json entry decides whether the outer-lines choice applies.
 *
 *   const sep = useSeparatorsCanvas( { separators, device: tier, name: 'sgs/icon-list',
 *       line: { item: '.x > .item', direction: 'column', gap: '8px' } } );
 *   { sep.css && <style>{ sep.css }</style> }
 *
 * @package SGS\Blocks
 */

import { useRef } from '@wordpress/element';
import {
	separatorCaps,
	separatorsFlowPreview,
} from '../../utils/separators';
import { separatorsLineCss } from '../../utils/separators-line';
import { useSeparatorOverlay } from './useSeparatorOverlay';

/**
 * @param {Object}  args
 * @param {Object}  args.separators  The stored setting.
 * @param {string}  [args.device]    The previewed device tier. Default 'desktop'.
 * @param {boolean} [args.active]    Whether the list is a layout that can draw (grid, flex, stack). Default true.
 * @param {Array}   [args.deps]      Other values that move the items (columns, gap): they re-run the overlay.
 * @param {Object}  [args.line]      The line-list descriptor ({ item, direction, gap, pseudo, pseudoEnd }); omit for a flow list.
 * @param {string}  [args.name]      Block name, for a line list's outer-lines choice.
 * @param {string}  [args.attribute] The attribute holding the setting. Default 'separators'.
 * @return {{ref: {current: HTMLElement|null}, style: Object, css: string}} Flow list: attach `ref`, spread `style`. Line list: render `css`.
 */
export function useSeparatorsCanvas( {
	separators,
	device = 'desktop',
	active = true,
	deps = [],
	line,
	name,
	attribute = 'separators',
} ) {
	const ref = useRef( null );
	const style =
		! line && active ? separatorsFlowPreview( separators, device ) : {};
	const drawing = Object.keys( style ).length > 0;
	// A line list's items draw their own lines, so only a flow list runs the overlay.
	useSeparatorOverlay(
		ref,
		drawing ? JSON.stringify( [ separators, device, ...deps ] ) : ''
	);
	let css = '';
	if ( line && active ) {
		const edges = separatorCaps( name, attribute )?.edges
			? separators?.edges
			: 'between';
		css = separatorsLineCss( separators, line, device, edges );
	}
	return { ref, style, css };
}
