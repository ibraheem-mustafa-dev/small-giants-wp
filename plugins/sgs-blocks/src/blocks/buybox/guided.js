/**
 * sgs/buybox — guided layout behaviour (Spec 43 FR-43-23).
 *
 * Self-contained ES module (mirrors notify-view.js — plain DOM, no
 * @wordpress/interactivity import), sharing the SAME root element
 * product-card/view.js's `initPillBridge` mounts on
 * (`.sgs-buybox[data-wp-interactive]`) — the ancestor every
 * `sgs:option-selected` and cart-form `submit` propagates through.
 *
 * WHY a capture listener on root, not a typeKey convention:
 * `applyPillSelection()` (product-card/view.js) has NO guard against an
 * unrecognised typeKey — it writes it into `ctx.selectedAxes`
 * unconditionally, fails to resolve a combo, and marks the card
 * `stockText:'Unavailable'`. An answer group's picker uses its REAL WC
 * taxonomy as typeKey (so option-picker's own swatch lookup keeps
 * working), so the only way to keep it out of variation resolution is to
 * stop the event before product-card's bubble listener sees it. A
 * capture:true listener on an ANCESTOR of the dispatch target always runs
 * before a listener on the target itself, regardless of registration
 * order — unlike two listeners on the SAME node (the cart form and its
 * own `data-wp-on--submit`), which fire in registration order regardless
 * of the capture flag. That is why every guard below binds to ROOT.
 *
 * @since 1.19.0 (Spec 43 FR-43-23)
 */

const ROOT_SELECTOR = '.sgs-buybox--guided';
const reducedMotion = () =>
	typeof window.matchMedia === 'function' &&
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

function initGuidedBuyboxes() {
	document.querySelectorAll( ROOT_SELECTOR ).forEach( initGuidedBuybox );
}

/** @param {Element} root The `.sgs-buybox--guided` wrapper (== data-wp-interactive element). */
function initGuidedBuybox( root ) {
	if ( root.dataset.sgsGuidedInit === '1' ) {
		return;
	}
	root.dataset.sgsGuidedInit = '1';

	const shell = root.querySelector( '[data-sgs-buybox-guided]' );
	if ( ! shell ) {
		return;
	}

	const groups = Array.from( shell.querySelectorAll( '[data-guided-group]' ) );
	const meterBtns = Array.from( shell.querySelectorAll( '[data-guided-goto]' ) );
	const compact = shell.querySelector( '[data-guided-meter-compact]' );
	const status = shell.querySelector( '[data-guided-status]' );
	const backBtn = shell.querySelector( '[data-guided-back]' );
	const nextBtn = shell.querySelector( '[data-guided-next]' );
	const autoAdvance = shell.dataset.guidedAutoAdvance === '1';
	const total = groups.length;
	if ( ! total ) {
		return;
	}

	// Seeded from SSR "done" defaults (a pre-selected picker or the
	// manifest's defaultAxes — FR-43-23 "a default choice counts as made").
	const state = groups.map( ( group, i ) => {
		const done = group.dataset.guidedHasDefault === '1';
		const valueEl = meterBtns[ i ] && meterBtns[ i ].querySelector( '[data-guided-meter-value]' );
		return { done, label: group.dataset.guidedLabel || '', value: done && valueEl ? valueEl.textContent.trim() : '' };
	} );

	let active = groups.findIndex( ( g ) => ! g.hasAttribute( 'hidden' ) );
	active = active < 0 ? 0 : active;

	function goTo( idx, focusTitle ) {
		if ( idx < 0 || idx >= total ) {
			return;
		}
		// Already showing that group (e.g. the guard's first unfinished group
		// is the visible one): no switch, but still move focus to its title.
		if ( idx !== active ) {
			groups[ active ].setAttribute( 'hidden', '' );
			active = idx;
			groups[ active ].removeAttribute( 'hidden' );
			meterBtns.forEach( ( btn, i ) => btn.setAttribute( 'aria-current', i === active ? 'true' : 'false' ) );
			updateCompact();
			updateNav();
		}
		const title = focusTitle && groups[ active ].querySelector( '.sgs-buybox-guided__group-title' );
		if ( title ) {
			title.focus();
		}
	}

	function setAriaDisabled( el, disabled ) {
		if ( disabled ) {
			el.setAttribute( 'aria-disabled', 'true' );
		} else {
			el.removeAttribute( 'aria-disabled' );
		}
	}

	function updateMeterItem( idx ) {
		const btn = meterBtns[ idx ];
		if ( ! btn ) {
			return;
		}
		const valueEl = btn.querySelector( '[data-guided-meter-value]' );
		if ( valueEl ) {
			valueEl.textContent = state[ idx ].value || groups[ idx ].dataset.guidedLabel || '';
		}
		btn.classList.toggle( 'sgs-buybox-guided__meter-btn--done', state[ idx ].done );
		setAriaDisabled( btn, ! state[ idx ].done );
	}

	function updateCompact() {
		if ( compact ) {
			compact.textContent = ( active + 1 ) + ' of ' + total + ' \u00B7 ' + ( groups[ active ].dataset.guidedLabel || '' );
		}
	}

	function updateNav() {
		if ( backBtn ) {
			backBtn.hidden = active === 0;
		}
		if ( nextBtn ) {
			nextBtn.hidden = active >= total - 1;
			setAriaDisabled( nextBtn, ! state[ active ].done );
		}
	}

	function updateExtraFields() {
		const fields = [];
		groups.forEach( ( group, i ) => {
			if ( group.dataset.guidedAnswer === '1' && state[ i ].done && state[ i ].value ) {
				fields.push( { label: state[ i ].label, value: state[ i ].value } );
			}
		} );
		if ( fields.length ) {
			root.dataset.extraFields = JSON.stringify( fields );
		} else {
			delete root.dataset.extraFields;
		}
	}

	function runGuard( event ) {
		const unfinished = state.map( ( s, i ) => ( s.done ? null : groups[ i ].dataset.guidedLabel || '' ) ).filter( Boolean );
		if ( ! unfinished.length ) {
			return; // Everything chosen — let the add-to-cart / modal-open proceed.
		}
		event.preventDefault();
		if ( typeof event.stopImmediatePropagation === 'function' ) {
			event.stopImmediatePropagation();
		}
		if ( status ) {
			status.textContent = 'Finish choosing: ' + unfinished.join( ', ' );
		}
		const idx = state.findIndex( ( s ) => ! s.done );
		if ( idx >= 0 ) {
			goTo( idx, true );
		}
	}

	updateExtraFields();

	// Capture phase — must run before product-card's bubble listener on this
	// same root (see file docblock for the proof this is genuinely necessary).
	shell.addEventListener( 'sgs:option-selected', ( event ) => {
		const groupEl = event.target.closest && event.target.closest( '[data-guided-group]' );
		if ( ! groupEl || ! shell.contains( groupEl ) ) {
			return;
		}
		const idx = parseInt( groupEl.dataset.guidedGroup, 10 );
		if ( Number.isNaN( idx ) ) {
			return;
		}
		const detail = event.detail || {};
		const isAnswer = groupEl.dataset.guidedAnswer === '1';
		const chosenLabel = resolveChosenLabel( groupEl, detail.selectedKey ) || detail.selectedKey || '';

		state[ idx ] = { done: true, label: groupEl.dataset.guidedLabel || '', value: chosenLabel };
		updateMeterItem( idx );
		updateExtraFields();
		if ( status ) {
			status.textContent = '';
		}
		if ( isAnswer ) {
			event.stopPropagation();
		}
		if ( autoAdvance && idx === active && idx < total - 1 ) {
			window.setTimeout( () => goTo( idx + 1, false ), reducedMotion() ? 0 : 250 );
		} else {
			updateNav();
		}
	}, true );

	meterBtns.forEach( ( btn, i ) => {
		btn.addEventListener( 'click', () => {
			if ( state[ i ].done || i === active ) {
				goTo( i, true );
			}
		} );
	} );
	if ( backBtn ) {
		backBtn.addEventListener( 'click', () => goTo( Math.max( 0, active - 1 ), true ) );
	}
	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			if ( state[ active ].done ) {
				goTo( Math.min( total - 1, active + 1 ), true );
			}
		} );
	}

	// Finish-choosing guard (FR-43-23) — ROOT is an ancestor of both the
	// cart-mode form and the modal-mode open button, so capture here runs
	// before actions.addToCart or the modal's open-anywhere listener.
	root.addEventListener( 'submit', ( event ) => {
		if ( event.target.matches && event.target.matches( '.buybox__cart-form' ) ) {
			runGuard( event );
		}
	}, true );
	root.addEventListener( 'click', ( event ) => {
		if ( event.target.closest && event.target.closest( '[data-sgs-modal-open]' ) ) {
			runGuard( event );
		}
	}, true );
}

/**
 * The chosen term's visible label, read back from the option-picker's own
 * rendered pill (no re-fetch — the manifest/term data already rendered it).
 *
 * @param {Element} groupEl     The `[data-guided-group]` container.
 * @param {string}  selectedKey Term slug from the sgs:option-selected detail.
 * @return {string} Label text, or ''.
 */
function resolveChosenLabel( groupEl, selectedKey ) {
	if ( ! selectedKey ) {
		return '';
	}
	const escaped =
		typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
			? CSS.escape( selectedKey )
			: selectedKey.replace( /["\\]/g, '\\$&' );
	const input = groupEl.querySelector( 'input[value="' + escaped + '"]' );
	const label = input && input.closest( 'label' );
	const textEl = label && label.querySelector( '.sgs-option-picker__pill-label' );
	return textEl ? textEl.textContent.trim() : '';
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initGuidedBuyboxes );
} else {
	initGuidedBuyboxes();
}
