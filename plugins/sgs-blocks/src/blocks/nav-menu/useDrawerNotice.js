/**
 * SGS Nav Menu (sgs/nav-menu) — burger→drawer pairing hook.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim logic
 * from edit.js, just relocated behind a hook boundary.
 *
 * @package SGS\Blocks
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, store as blocksStore } from '@wordpress/blocks';

/**
 * Resolves the burger↔drawer pairing state and the "add a drawer" action for
 * sgs/nav-menu — see the block-level comments this was extracted from for the
 * full FR-36-9a(2)/W2-a history.
 *
 * @param {Object} root0           Hook params.
 * @param {string} root0.clientId  This block's clientId.
 * @param {number} root0.ref       The block's `ref` attribute (menu id) — seeded
 *                                 into a newly-created drawer's own nav-menu child.
 * @param {string} root0.drawerRef The block's `drawerRef` attribute.
 * @return {Object} { effectiveDrawerRef, drawerState, addDrawer, activeDrawer, showActiveDrawerNotice, showDrawerNotice }.
 */
export default function useDrawerNotice( { clientId, ref, drawerRef } ) {
	// ── FR-36-9a(2) — the burger must open something. ───────────────────────
	//
	// This menu collapses to a burger below `collapsePoint` and opens
	// sgs/nav-drawer BY ID (render.php:295-317 → the drawer's <dialog> id,
	// nav-drawer/render.php:236). Every header STARTER pattern ships a drawer
	// as a SIBLING of sgs/site-header — but a header built by inserting the
	// blocks by hand has none, so the burger opens nothing, silently, and a
	// non-coder cannot diagnose it. That is the only hard FAIL in the FR-37-26
	// operator-simplicity test (parking P-HEADER-SIMPLICITY-FINDINGS finding 1).
	//
	// The drawer CANNOT be seeded from sgs/site-header's own TEMPLATE: its root
	// is a <dialog> that promotes to the top layer, it must be a sibling of the
	// header, and the container is templateLock:'all' around exactly three rows
	// (header-scratch.php:32-35 records the same reasoning for the patterns).
	// A notice on this block is the only thing that reaches the raw-insert path.
	//
	// Informational + fixable, NEVER a save/publish gate (FR-37-19 / P1 DP2a).
	//
	// Both sides fall back to 'sgs-nav-drawer' when the attribute is blank
	// (nav-menu/render.php:295-297, nav-drawer/render.php:61-65) — mirror that
	// here or a blank-vs-default pair would look mismatched when it is not.
	const effectiveDrawerRef = ( drawerRef || '' ).trim() || 'sgs-nav-drawer';

	const drawerState = useSelect(
		( select ) => {
			const be = select( blockEditorStore );

			// A nav-menu INSIDE a drawer renders a vertical list, not a burger.
			// It has no drawer of its own to open, so it must never warn.
			if (
				be.getBlockParentsByBlockName( clientId, 'sgs/nav-drawer' )
					.length > 0
			) {
				return { suppress: true };
			}

			const drawerIds = be.getBlocksByName
				? be.getBlocksByName( 'sgs/nav-drawer' )
				: [];
			const refs = drawerIds.map( ( id ) => {
				const attrs = be.getBlockAttributes( id ) || {};
				return ( attrs.drawerRef || '' ).trim() || 'sgs-nav-drawer';
			} );

			// A new drawer goes at the ROOT, immediately after whichever
			// top-level block this menu sits inside (the header) — a sibling,
			// never a child.
			const parents = be.getBlockParents( clientId );
			const outermost = parents.length ? parents[ 0 ] : clientId;

			return {
				suppress: false,
				total: refs.length,
				matches: refs.includes( effectiveDrawerRef ),
				firstRef: refs[ 0 ] || '',
				insertIndex: be.getBlockIndex( outermost ) + 1,
				// createBlock throws on an unregistered slug — never offer a
				// fix action that cannot run.
				canCreate: !! select( blocksStore ).getBlockType(
					'sgs/nav-drawer'
				),
			};
		},
		[ clientId, effectiveDrawerRef ]
	);

	const { insertBlock } = useDispatch( blockEditorStore );

	const addDrawer = () => {
		insertBlock(
			createBlock(
				'sgs/nav-drawer',
				{ drawerRef: effectiveDrawerRef },
				// Seed the same menu the bar uses, matching header-scratch.php
				// — the drawer opens with real links rather than empty.
				[ createBlock( 'sgs/nav-menu', { ref: ref || 0 } ) ]
			),
			drawerState.insertIndex,
			undefined, // root level
			true // select it, so the operator lands on its content
		);
	};

	// ── W2-a — the drawer moved to its own edit screen, so this notice had to
	// learn about it or it would start LYING. ────────────────────────────────
	//
	// The warning above fires when the canvas holds no sgs/nav-drawer block with a
	// matching id. Once the drawer lives in the `sgs_drawer` CPT, that is the
	// NORMAL, CORRECT state of every ordinary page — the panel is site-wide, not in
	// this post — and the notice would tell every operator their burger is broken
	// when it works perfectly.
	//
	// `activeDrawer` is published by PHP onto the existing window.sgsBlocksData
	// channel (class-sgs-blocks.php) and is null when no Active drawer RESOLVES
	// (get_active_id fails closed on trashed/draft/wrong-type), so a broken pointer
	// still produces the genuine warning rather than a false reassurance.
	//
	// Matched on `ref`, not on mere existence: the burger opens a drawer BY ELEMENT
	// ID, so an Active drawer whose own drawerRef differs opens nothing. Claiming
	// otherwise would be the same optimism this notice exists to prevent.
	const activeDrawer =
		( typeof window !== 'undefined' &&
			window.sgsBlocksData &&
			window.sgsBlocksData.activeDrawer ) ||
		null;
	const activeDrawerMatches =
		!! activeDrawer && activeDrawer.ref === effectiveDrawerRef;

	// The site-wide panel answers this burger: say where to edit it, and declare
	// the canvas limitation (wp_footer never fires in the editor, so the panel
	// cannot be previewed here) rather than leaving a non-coder to read its absence
	// as a fault.
	const showActiveDrawerNotice =
		! drawerState.suppress && ! drawerState.matches && activeDrawerMatches;

	const showDrawerNotice =
		! drawerState.suppress && ! drawerState.matches && ! activeDrawerMatches;

	return {
		effectiveDrawerRef,
		drawerState,
		addDrawer,
		activeDrawer,
		showActiveDrawerNotice,
		showDrawerNotice,
	};
}
