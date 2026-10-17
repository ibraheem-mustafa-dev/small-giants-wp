/**
 * Before/after slider focus fixture. The real block renders the divider (with the visible handle, class
 * `sgs-focus-proxy`) BEFORE the hidden range input (`sgs-focus-source`), inside a root that carries
 * `sgs-focus-scope`; the adjacent-sibling arm cannot match that order, so the scoped arm must paint the ring on the
 * handle. This mimics that DOM order and checks the handle, not the 100% wide hidden input, carries the outline.
 */

const SLIDER_HTML = `
<div class="wp-block-sgs-before-after sgs-focus-scope" style="position:relative;width:400px;height:200px">
	<div class="wp-block-sgs-before-after__stage" style="position:absolute;inset:0">
		<div class="wp-block-sgs-before-after__divider" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">
			<div class="wp-block-sgs-before-after__divider-line" style="position:absolute;left:50%;width:3px;height:100%;background:#fff"></div>
			<div class="wp-block-sgs-before-after__handle sgs-focus-proxy" style="position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%);display:flex"></div>
		</div>
		<label class="sgs-screen-reader-text" for="ba-range">Drag to compare before and after</label>
		<input type="range" id="ba-range" class="wp-block-sgs-before-after__range sgs-focus-source" min="0" max="100" value="50" style="position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0">
	</div>
</div>`;

/** Returns a list of problems; empty when the handle paints the ring while the range holds keyboard focus. */
export async function checkBeforeAfterProxy( page, cssText, mode ) {
	await page.setContent( `<!doctype html><html><head><style>${ cssText }</style></head><body style="margin:20px;background:#444">${ SLIDER_HTML }</body></html>` );
	await page.keyboard.press( 'Tab' );
	await page.waitForTimeout( 400 );
	const got = await page.evaluate( () => {
		const range = document.getElementById( 'ba-range' );
		const handle = document.querySelector( '.wp-block-sgs-before-after__handle' );
		const rs = getComputedStyle( range );
		const hs = getComputedStyle( handle );
		return {
			focused: document.activeElement === range,
			visible: range.matches( ':focus-visible' ),
			rangeStyle: rs.outlineStyle,
			rangeWidth: rs.outlineWidth,
			handleStyle: hs.outlineStyle,
			handleWidth: parseFloat( hs.outlineWidth ),
			handleColour: hs.outlineColor,
		};
	} );
	const problems = [];
	if ( ! got.focused || ! got.visible ) return [ 'before-after: the range did not take :focus-visible from Tab' ];
	if ( 'solid' !== got.handleStyle || ! ( got.handleWidth > 0 ) ) {
		problems.push( `before-after: the handle proxy has no ring while the range is focused (outline ${ got.handleStyle } ${ got.handleWidth }px)` );
	}
	if ( 'none' !== got.rangeStyle && parseFloat( got.rangeWidth ) > 0 ) {
		problems.push( `before-after: the hidden range also paints an outline (${ got.rangeStyle } ${ got.rangeWidth }), two rings` );
	}
	if ( mode.forcedColors && ! /^rgb\(/.test( got.handleColour ) ) problems.push( `before-after: forced-colours ring colour is ${ got.handleColour }` );
	return problems;
}
