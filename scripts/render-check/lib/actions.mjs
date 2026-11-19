// The steps a state takes after its page loads, to reach a look the page does not show at rest.
//   { "open": "<dialog selector>" }  click the visible control whose aria-controls names the first matching dialog, then
//                                    wait until that dialog is open (a menu, a basket drawer, any modal)
//   { "click": "<selector>", "ifPresent": true }  click the first visible match; with ifPresent, no visible match
//                                    means the page has no such part at this width (absent), not a failure
//   { "waitFor": "<selector>" }      wait until a match is visible
//   { "scroll": <px> | "middle" | "end" }
//   { "wait": <ms> }
// Returns { fails, absent }: absent names the part a step needed and the page does not show at this width; the states
// that need it are then "not on this page" at that width on both sides, never compared and never unreached.

async function openDialog( page, sel ) {
	const id = await page.evaluate( ( s ) => {
		for ( const d of document.querySelectorAll( s ) ) {
			if ( ! d.id ) {
				continue;
			}
			const control = [ ...document.querySelectorAll( `[aria-controls="${ CSS.escape( d.id ) }"]` ) ].find( ( c ) => {
				const r = c.getBoundingClientRect();
				return r.width > 0 && r.height > 0 && getComputedStyle( c ).visibility !== 'hidden';
			} );
			if ( control ) {
				control.setAttribute( 'data-rc-opener', '1' );
				return d.id;
			}
		}
		return null;
	}, sel );
	if ( ! id ) {
		return 'absent: no visible control opens ' + sel;
	}
	await page.locator( '[data-rc-opener]' ).first().click( { timeout: 6000 } );
	await page.waitForFunction( ( i ) => {
		const d = document.getElementById( i );
		return d && ( d.open || d.getAttribute( 'aria-hidden' ) === 'false' || d.classList.contains( 'is-open' ) );
	}, id, { timeout: 10000 } );
	await page.evaluate( () => document.querySelector( '[data-rc-opener]' )?.removeAttribute( 'data-rc-opener' ) );
	await page.waitForTimeout( 600 );
	return null;
}

export async function runActions( page, actions ) {
	const fails = [];
	for ( const a of actions || [] ) {
		try {
			if ( a.open ) {
				const absent = await openDialog( page, a.open );
				if ( absent ) {
					return { fails, absent };
				}
			}
			if ( a.click ) {
				const target = page.locator( a.click + ':visible' ).first();
				if ( a.ifPresent && ! ( await target.count() ) ) {
					return { fails, absent: 'absent: nothing visible matches ' + a.click };
				}
				await target.click( { timeout: 6000 } );
			}
			if ( a.waitFor ) {
				await page.waitForSelector( a.waitFor, { state: 'visible', timeout: 10000 } );
			}
			if ( a.scroll !== undefined ) {
				await page.evaluate( ( y ) => {
					const h = document.documentElement.scrollHeight - innerHeight;
					scrollTo( { top: y === 'end' ? h : y === 'middle' ? Math.round( h / 2 ) : y, behavior: 'instant' } );
				}, a.scroll );
				await page.waitForTimeout( 700 );
			}
			if ( a.wait ) {
				await page.waitForTimeout( a.wait );
			}
		} catch ( e ) {
			fails.push( 'action ' + JSON.stringify( a ) + ' failed: ' + String( e ).split( '\n' )[ 0 ].slice( 0, 140 ) );
		}
	}
	return { fails, absent: null };
}
