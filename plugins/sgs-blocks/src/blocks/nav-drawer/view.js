/**
 * SGS Nav Drawer — frontend interactivity.
 *
 * The drawer owns no open/close behaviour of its own: open / close / focus-into /
 * focus-trap / body-scroll-lock (incl. iOS) / ESC / body-reparent /
 * scrollbar-bounce compensation / `::backdrop` scrim all live in the
 * shared `store('sgs/nav')` (src/shared/nav-interactivity/store.js). The store
 * resolves this drawer by its `id` (= drawerRef) and its `[data-sgs-nav-close]`
 * ×, wiring them imperatively on open (those survive the body-reparent
 * because they are id/attribute-based, not directive-based).
 *
 * Importing the store module REGISTERS it. @wordpress/scripts bundles a copy
 * into this block's view module; the Interactivity runtime dedupes by the
 * `sgs/nav` namespace and merges the identical registration, so importing here
 * (as well as in sgs/nav-bar-menu) is SAFE and guarantees the store exists whenever
 * a drawer is on the page. Do NOT re-implement any of the mechanics above here.
 *
 * @package
 */

import '../../shared/nav-interactivity/store';
import initGrowFromAnchor from './grow-from-anchor';
import initDrawerMotionState from './drawer-motion-state';

// The one motion the drawer owns itself: `grow-from-anchor` measures its box's
// two heights (the CSS keyframes need real lengths). See grow-from-anchor.js.
initGrowFromAnchor();

// A drawer on the Entrance model (its root carries `data-sgs-motion-state`):
// the store announces each open and close, and the drawer publishes it as the
// `open` motion state (Spec 38A FR-38A-51). See drawer-motion-state.js.
initDrawerMotionState();
