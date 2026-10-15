/**
 * Tier G effect: what a horizontal-panel section publishes as it travels (Spec 38A FR-38A-36, FR-38A-38, FR-38A-39).
 *
 * Three outputs, each opt-out through its own parameter, written as custom properties and data attributes only:
 *  - progress: `--sgs-fx-progress` (0 to 1, travel only) on the element and `data-sgs-fx-progress-total` (the panel
 *    count), which `fx-scroll-progress.js`'s pin source reads for its bar and counter;
 *  - active panel: `data-sgs-fx-panel-active="true"` on the panel nearest the element's centre, so any part can
 *    style it (`[data-sgs-fx-panel-active] .year`);
 *  - proximity focus: `--sgs-focus-s` and `--sgs-focus-op` on each panel, between the centre values and the edge
 *    values by distance from the centre, which `assets/css/motion.css`'s scale and opacity channels compose.
 *
 * Panels carry `data-sgs-fx-panel` while the effect runs so the stylesheet can address them on any markup.
 *
 * @package
 */

const PANEL_MARK = 'data-sgs-fx-panel';
const ACTIVE_MARK = 'data-sgs-fx-panel-active';

/**
 * The focus scale and opacity of a panel a given distance from the centre.
 *
 * @param {number} ratio  Distance from the centre in panel-widths (0 centred, 1 one panel-width off).
 * @param {Object} params Parameters from `readParams`: `focusScale`, `edgeScale`, `focusOpacity`, `edgeOpacity`.
 * @return {{scale: number, opacity: number}} The values, at the edge values from one panel-width out.
 */
export function proximityAt( ratio, params ) {
	const t = Math.min( Math.max( ratio, 0 ), 1 );
	return {
		scale: params.focusScale + ( params.edgeScale - params.focusScale ) * t,
		opacity:
			params.focusOpacity +
			( params.edgeOpacity - params.focusOpacity ) * t,
	};
}

/**
 * The index of the centre nearest `centre`.
 *
 * @param {number[]} centres Panel centres in viewport pixels.
 * @param {number}   centre  The element's centre.
 * @return {number} Index, or -1 for no panels.
 */
export function nearestIndex( centres, centre ) {
	let best = -1;
	let bestDistance = Infinity;
	centres.forEach( ( value, index ) => {
		const distance = Math.abs( value - centre );
		if ( distance < bestDistance ) {
			best = index;
			bestDistance = distance;
		}
	} );
	return best;
}

/**
 * Publish the outputs for one element's panels.
 *
 * @param {HTMLElement}   el     The element carrying `data-sgs-fx="horizontal-panel"`.
 * @param {HTMLElement[]} panels Its laid-out panels.
 * @param {Object}        params Parameters from `readParams`.
 * @return {{update: Function, clear: Function}} `update( travelProgress )` writes the outputs for a 0 to 1 travel
 *                                              progress; `clear()` removes everything this wrote.
 */
export function createState( el, panels, params ) {
	panels.forEach( ( panel ) => panel.setAttribute( PANEL_MARK, '' ) );
	if ( params.progress ) {
		el.setAttribute(
			'data-sgs-fx-progress-total',
			String( panels.length )
		);
	}
	let active = null;

	return {
		update( travelProgress ) {
			if ( params.progress ) {
				const value = Math.min( Math.max( travelProgress, 0 ), 1 );
				el.style.setProperty(
					'--sgs-fx-progress',
					String( Math.round( value * 10000 ) / 10000 )
				);
			}
			if ( ! params.active && ! params.focus ) {
				return;
			}
			const host = el.getBoundingClientRect();
			const centre = host.left + host.width / 2;
			const rects = panels.map( ( panel ) =>
				panel.getBoundingClientRect()
			);
			if ( params.active ) {
				const next =
					panels[
						nearestIndex(
							rects.map( ( rect ) => rect.left + rect.width / 2 ),
							centre
						)
					] || null;
				if ( next !== active ) {
					active?.removeAttribute( ACTIVE_MARK );
					next?.setAttribute( ACTIVE_MARK, 'true' );
					active = next;
				}
			}
			if ( params.focus ) {
				panels.forEach( ( panel, index ) => {
					// Layout width: the panel's own scale must not feed back into its distance.
					const width = panel.offsetWidth || rects[ index ].width;
					const offset =
						rects[ index ].left + rects[ index ].width / 2 - centre;
					const { scale, opacity } = proximityAt(
						width > 0 ? Math.abs( offset ) / width : 1,
						params
					);
					panel.style.setProperty(
						'--sgs-focus-s',
						scale.toFixed( 4 )
					);
					panel.style.setProperty(
						'--sgs-focus-op',
						opacity.toFixed( 4 )
					);
				} );
			}
		},
		clear() {
			el.removeAttribute( 'data-sgs-fx-progress-total' );
			el.style.removeProperty( '--sgs-fx-progress' );
			panels.forEach( ( panel ) => {
				panel.removeAttribute( PANEL_MARK );
				panel.removeAttribute( ACTIVE_MARK );
				panel.style.removeProperty( '--sgs-focus-s' );
				panel.style.removeProperty( '--sgs-focus-op' );
			} );
			active = null;
		},
	};
}
