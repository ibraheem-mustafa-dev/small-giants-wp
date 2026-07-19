/**
 * SGS Nav Drawer — frontend interactivity.
 *
 * The drawer OWNS NO behaviour of its own: open / close / focus-into /
 * focus-trap / body-scroll-lock (incl. iOS) / ESC / body-reparent (D323) /
 * scrollbar-bounce compensation (D340) / `::backdrop` scrim all live in the
 * shared `store('sgs/nav')` (src/shared/nav-interactivity/store.js). The store
 * resolves this drawer by its `id` (= drawerRef) and its `[data-sgs-nav-close]`
 * ×, wiring them imperatively on open (those survive the D323 body-reparent
 * because they are id/attribute-based, not directive-based).
 *
 * Importing the store module REGISTERS it. @wordpress/scripts bundles a copy
 * into this block's view module; the Interactivity runtime dedupes by the
 * `sgs/nav` namespace and merges the identical registration, so importing here
 * (as well as in sgs/nav-menu) is SAFE and guarantees the store exists whenever
 * a drawer is on the page. Do NOT re-implement any of the mechanics above here.
 *
 * @package SGS\Blocks
 */

import '../../shared/nav-interactivity/store';
