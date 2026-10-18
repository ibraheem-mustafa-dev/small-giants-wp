/**
 * The per-page Tier G motion cost hook (Spec 38 §7 build task 19, D446, D448).
 *
 * @package
 */

import apiFetch from '@wordpress/api-fetch';
import { useSelect } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';

/**
 * The per-page Tier G motion cost, surfaced from a MEASURING SCRIPT owned by
 * a different track (Spec 38 §7 build task 19 / D446 / Bean's D448 ruling —
 * GSAP keeps its budget exemption, but per-page cost becomes VISIBLE).
 *
 * ⚠ THE INTERFACE THIS HOOK ASSUMES — written here because the measuring
 * script + admin panel had not landed at the time this was built, and this
 * file owns ONLY the editor-side surfacing (per the D446 task split):
 *
 *   GET /wp-json/sgs/v1/motion-budget?post_id=<id>
 *   → 200 { totalKb: number, budgetKb: number, overBudget: boolean,
 *           effects: [ { effect: string, kb: number } ] }
 *   → 404 (or any error) — read as "no data yet", never surfaced as an
 *     error to the client; the panel simply shows nothing extra.
 *
 * This hook deliberately COMPUTES NOTHING ITSELF. Spec 38 §4.4's own budget
 * table is explicit that its per-effect KB figures are "ESTIMATES … verified
 * + recorded at Wave A build" — reproducing a second estimate here would
 * give the operator two numbers that can silently disagree, which is worse
 * than showing nothing. If the endpoint is missing, this returns `null` and
 * the caller renders no cost information at all rather than a guess.
 *
 * `useSelect`/`useState`/`useEffect` are called UNCONDITIONALLY every time
 * this hook runs (Rules of Hooks) — `enabled` only gates whether the EFFECT
 * BODY performs a fetch, not whether the hook itself is called. This is what
 * lets a caller invoke it from every block instance without one duplicate
 * network request per non-selected/non-qualifying block on the page.
 *
 * @param {boolean} enabled Whether to actually fetch (caller's block both
 *                          qualifies for fx AND is currently selected).
 * @return {Object|null} `{ totalKb, budgetKb, overBudget, effects }`, or
 *                        `null` while loading / when unavailable.
 */
export function useMotionBudget( enabled ) {
	const postId = useSelect(
		( select ) => select( 'core/editor' )?.getCurrentPostId?.(),
		[]
	);
	const [ budget, setBudget ] = useState( null );

	useEffect( () => {
		if ( ! enabled || ! postId ) {
			return;
		}
		let cancelled = false;
		apiFetch( { path: `/sgs/v1/motion-budget?post_id=${ postId }` } )
			.then( ( data ) => {
				if ( ! cancelled ) {
					setBudget(
						data && 'number' === typeof data.totalKb ? data : null
					);
				}
			} )
			.catch( () => {
				// Endpoint not built yet, or genuinely nothing to measure —
				// both read the same way: no cost information to show.
				if ( ! cancelled ) {
					setBudget( null );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ enabled, postId ] );

	return budget;
}
