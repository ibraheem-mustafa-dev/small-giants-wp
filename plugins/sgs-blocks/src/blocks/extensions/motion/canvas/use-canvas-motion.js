/**
 * The editor-canvas motion preview (Spec 38A §11; FR-38A-28): for a block with the motion support, write the same
 * scoped CSS the page gets (`emit-scoped-css.js`, scoped to the block's canvas id) into the canvas document as one
 * `<style>` per block, and stamp the data attributes `assets/css/motion.css` keys on onto the block's canvas elements,
 * so hovering the canvas previews the hover state and Replay (`replay.js`) can play an entrance. A block with a
 * whole-block link is the hover group (`data-sgs-hover-group`) even when it has no motion of its own.
 *
 * The stamps follow the canvas: a block that mounts later is found by a mutation observer (no timers), a re-rendered
 * part or a remounted block element is planned and stamped again, and everything is removed on unmount. Blocks inside
 * a block preview (the inserter, the style book, a products-mode grid's product previews) do nothing; a products-mode
 * grid's template card reaches each of its product previews instead (`mirrors.js`). Mounted for every supporting block
 * by `with-canvas-motion.js`.
 *
 * @package SGS\Blocks
 */

import { useEffect, useMemo } from '@wordpress/element';
import { getBlockType } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import {
	canvasRootSelector,
	findBlockElement,
	planCanvas,
	removeStyle,
	stamp,
	unstamp,
	watchForMount,
	writeStyle,
} from './canvas-dom';
import { declaredStates } from './trigger-rules';
import { shadowValues } from './emit-ring';
import { activeDelegation } from '../source-mode';
import { mirrorRoots } from './mirrors';
import { registry } from './replay';
import { TIERS } from './motion-schema';
import { columnsAt } from '../entrance/entrance-facts';

export { replay, canReplay, REPLAY_REDUCED_NOTICE } from './replay';

/**
 * The canvas preview for one block.
 *
 * @param {Object} props            Block props.
 * @param {string} props.clientId   Block client id.
 * @param {string} props.name       Block name.
 * @param {Object} props.attributes Block attributes.
 */
export function useCanvasMotion( { clientId, name, attributes } ) {
	const motion = attributes?.[ MOTION_ATTRIBUTE_NAME ];
	const linked = Boolean( attributes?.sgsBlockLink || attributes?.sgsBlockLinkAuto );
	const preview = useSelect(
		( select ) => Boolean( select( 'core/block-editor' )?.getSettings?.()?.__unstableIsPreviewMode ),
		[]
	);
	// Whether the block holds inner blocks: then the stagger's "Apply entrance to children" moves the container's entrance
	// to them (`stagger-apply.js`).
	const hasInnerBlocks = useSelect(
		( select ) => ( select( 'core/block-editor' )?.getBlockCount?.( clientId ) ?? 0 ) > 0,
		[ clientId ]
	);
	// Only the attributes that decide the hover ring's refusal (the shadow attributes) reach the options, so editing
	// anything else does not re-emit the block's motion.
	const shadows = JSON.stringify(
		shadowValues( getBlockType( name )?.supports?.sgs?.elements, attributes )
	);
	// In a delegating mode the grid hands its stagger entrance to the cards unless its template card's root keeps an
	// entrance of its own (`delegated-children.js`); a template card is mirrored by the grid's product previews.
	const { delegation, mirrored } = useSelect(
		( select ) => {
			const store = select( 'core/block-editor' );
			const active = activeDelegation( getBlockType( name )?.supports?.sgs, attributes );
			const parentId = store?.getBlockRootClientId?.( clientId );
			const parentName = parentId ? store.getBlockName( parentId ) : null;
			const parentDelegation = parentName
				? activeDelegation( getBlockType( parentName )?.supports?.sgs, store.getBlockAttributes( parentId ) )
				: null;
			const template = active ? ( store?.getBlocks?.( clientId ) || [] ).find( ( block ) => block.name === active.block ) : null;
			const base = template?.attributes?.[ MOTION_ATTRIBUTE_NAME ]?.elements?.root?.entrance?.base;
			return {
				delegation: active
					? JSON.stringify( {
							...active,
							childRootEntrance: Boolean( base ) && typeof base === 'object' && ! Array.isArray( base ),
							childStates: declaredStates( getBlockType( active.block )?.supports?.sgs?.motion ),
					  } )
					: 'null',
				mirrored: parentDelegation?.block === name,
			};
		},
		[ clientId, name, attributes ]
	);
	// The grid columns per tier, which decide the stagger's per-item delays of a block that prints its items itself.
	const loopColumns = JSON.stringify( Object.fromEntries( TIERS.map( ( tier ) => [ tier, columnsAt( name, attributes, tier ) ] ) ) );
	const options = useMemo( () => {
		const sgs = getBlockType( name )?.supports?.sgs || {};
		return {
			blockName: name,
			elements: sgs.elements || {},
			animationItems: sgs.animationItems || '',
			states: declaredStates( sgs.motion ),
			root: canvasRootSelector( clientId, mirrored ),
			attributes: JSON.parse( shadows ),
			motionItems: sgs.motionItems,
			delegation: JSON.parse( delegation ),
			hasInnerBlocks,
			loopColumns: JSON.parse( loopColumns ),
		};
	}, [ name, clientId, shadows, delegation, mirrored, hasInnerBlocks, loopColumns ] );

	useEffect( () => {
		if ( preview || ( ! motion && ! linked ) ) {
			return undefined;
		}
		let rootEl = null;
		let touched = [];
		let observer = null;
		const mirrorsOf = ( el ) => ( mirrored ? mirrorRoots( clientId, el ) : [] );
		let frame = 0;
		let stopWatch = () => {};

		const apply = () => {
			frame = 0;
			const found = findBlockElement( clientId );
			if ( ! found ) {
				return;
			}
			touched.forEach( ( [ map, el ] ) => unstamp( map, el ) );
			observer?.disconnect();
			rootEl = found;
			const win = rootEl.ownerDocument.defaultView || window;
			const mirrors = mirrorsOf( rootEl );
			observer = new win.MutationObserver( schedule );
			[ rootEl, ...mirrors ].forEach( ( el ) => observer.observe( el, { childList: true, subtree: true } ) );
			if ( rootEl.parentNode ) {
				observer.observe( rootEl.parentNode, { childList: true } );
			}
			if ( mirrored && rootEl.parentNode?.parentNode ) {
				// The list the template card and its mirrors sit in: a product added or removed adds or removes a mirror.
				observer.observe( rootEl.parentNode.parentNode, { childList: true } );
			}
			const emitted = planCanvas( rootEl, motion, options );
			if ( linked ) {
				emitted.rootAttrs = { ...emitted.rootAttrs, 'data-sgs-hover-group': '' };
			}
			writeStyle( rootEl, clientId, emitted.css );
			touched = [ rootEl, ...mirrors ].map( ( el ) => [ stamp( el, emitted ), el ] );
			registry.set( clientId, {
				emitted,
				element: () => findBlockElement( clientId ),
				mirrors: () => mirrorsOf( findBlockElement( clientId ) ),
			} );
		};
		function schedule() {
			if ( ! frame ) {
				frame = window.requestAnimationFrame( apply );
			}
		}
		stopWatch = watchForMount( clientId, apply );

		return () => {
			stopWatch();
			if ( frame ) {
				window.cancelAnimationFrame( frame );
			}
			observer?.disconnect();
			touched.forEach( ( [ map, el ] ) => unstamp( map, el ) );
			removeStyle( clientId );
			registry.delete( clientId );
		};
	}, [ clientId, motion, linked, preview, options, mirrored ] );
}
