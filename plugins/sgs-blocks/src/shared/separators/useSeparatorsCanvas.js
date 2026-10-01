/**
 * Separators: the one editor hook every client-rendered canvas uses to preview a flow list.
 *
 * A block that declares `supports.sgs.separators` previews the lines in its own canvas
 * through this hook (scripts/check-separators-through-helper.py fails a block that does
 * not). It returns the list element's `ref` and `style`: native gap decorations where the
 * browser has them (Chrome, Edge), and the measured overlay in Safari and Firefox.
 *
 *   const sep = useSeparatorsCanvas( { separators, device: previewTier, active: 'grid' === layout } );
 *   <div ref={ sep.ref } style={ { ...sep.style } }> ...items... </div>
 *
 * Where the list element is also the block root, merge `sep.ref` with `blockProps.ref`
 * (`useMergeRefs`) and spread `sep.style` into the block's style.
 *
 * @package SGS\Blocks
 */

import { useRef } from '@wordpress/element';
import { separatorsFlowPreview } from '../../utils/separators';
import { useSeparatorOverlay } from './useSeparatorOverlay';

/**
 * @param {Object}  args
 * @param {Object}  args.separators The stored setting.
 * @param {string}  [args.device]   The previewed device tier. Default 'desktop'.
 * @param {boolean} [args.active]   Whether the list is a layout that can draw (grid, flex, stack). Default true.
 * @param {Array}   [args.deps]     Other values that move the items (columns, gap): they re-run the overlay.
 * @return {{ref: {current: HTMLElement|null}, style: Object}} Attach `ref` to the list element and spread `style` into its style.
 */
export function useSeparatorsCanvas( { separators, device = 'desktop', active = true, deps = [] } ) {
	const ref = useRef( null );
	const style = active ? separatorsFlowPreview( separators, device ) : {};
	const drawing = Object.keys( style ).length > 0;
	useSeparatorOverlay( ref, drawing ? JSON.stringify( [ separators, device, ...deps ] ) : '' );
	return { ref, style };
}
