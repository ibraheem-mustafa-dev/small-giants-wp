// The applier's element probes: parts of a block the pairing does not reach, read on both sides at 1440 into facts[ key ].probes.
//   sgs/form: every field of every step (the draft's steps are reached through its component's setState, READING-DC-FILES section 1;
//     the live form holds every step in its markup) with its label, and the first field under keyboard focus.
//   sgs/form: also the consent sentence's text (`consent`: the checkbox's label text) and the first floating label under focus (`focusLabel`), where the draft's moves up and shrinks.
//   sgs/form-field-tiles: the first tile at rest, selected (clicked, pointer moved away) with its check mark and label, and hovered;
//     `multi` says whether a second click leaves the first tile chosen, `tplId` and `dc` name the draft's tile element.
export const FIELD_REST_PROPS = [ 'background-color', 'color', 'border-top-color', 'border-top-width', 'border-top-style', 'font-size', 'font-weight' ];
export const FIELD_FOCUS_PROPS = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'outline-color', 'outline-style', 'outline-width' ];
export const LABEL_PROPS = [ 'color', 'font-size', 'font-weight', 'font-family', 'letter-spacing', 'text-transform', 'line-height' ];
export const TILE_PROPS = [ 'background-color', 'color', 'border-top-color', 'border-top-width', 'box-shadow', 'transform', 'translate', 'scale', 'rotate' ];
export const CONSENT_PROPS = [ 'font-size', 'font-weight', 'font-family', 'line-height', 'color' ];
export const CHECK_PROPS = [ 'position', 'display', 'top', 'width', 'height', 'color', 'background-color' ];

const FIELD_SELECTOR = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=file]):not([type=button]), textarea, select';

// In page: the element that paints a field's label text. A label that wraps its field (`<label><span>Name</span><input></label>`)
// carries only inherited styles; its words sit in the first descendant with its own text that does not hold the field.
export function labelTextHolder( label, field ) {
	if ( ! label || ! label.contains( field ) ) {
		return label;
	}
	const ownText = ( el ) => [ ...el.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() );
	if ( ownText( label ) ) {
		return label;
	}
	return [ ...label.querySelectorAll( '*' ) ].find( ( el ) => ! el.contains( field ) && ownText( el ) ) || label;
}
const textHolderSrc = labelTextHolder.toString();

// In page: every field under `root` with its label's styles.
function fieldsOf( [ finder, resolveSrc, restProps, labelProps, selector, textHolderSrc ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! root ) {
		return [];
	}
	const read = ( el, props ) => Object.fromEntries( props.map( ( p ) => [ p, getComputedStyle( el ).getPropertyValue( p ).trim() ] ) );
	// eslint-disable-next-line no-new-func
	const textHolder = new Function( `return (${ textHolderSrc });` )();
	// The field's grid cell (its nearest ancestor that is a grid item) and the grid that places it: the cell's width against the grid's
	// content width and track count say whether the field sits in a column or spans the row. `form` is the form's own grid.
	const layoutOf = ( field ) => {
		let cell = field;
		while ( cell.parentElement && root.contains( cell.parentElement ) && 'grid' !== getComputedStyle( cell.parentElement ).display ) {
			cell = cell.parentElement;
		}
		const grid = cell.parentElement;
		if ( ! grid || 'grid' !== getComputedStyle( grid ).display ) {
			return null;
		}
		const g = getComputedStyle( grid );
		return {
			ref: ( /cr-ref-[\w-]+/.exec( cell.className ) || [ null ] )[ 0 ],
			cellW: cell.getBoundingClientRect().width,
			gridW: grid.clientWidth - parseFloat( g.paddingLeft ) - parseFloat( g.paddingRight ),
			cols: g.gridTemplateColumns.split( /\s+/ ).filter( ( t ) => /^[\d.]+px$/.test( t ) ).length,
			form: grid.matches( '.sgs-form__inner, .sgs-form-step' ),
		};
	};
	return [ ...root.querySelectorAll( selector ) ].map( ( field ) => {
		const label = textHolder( ( field.id && root.querySelector( `label[for="${ CSS.escape( field.id ) }"]` ) ) || field.closest( 'label' ) || field.parentElement?.querySelector( 'label' ), field );
		return { field: read( field, restProps ), label: label ? read( label, labelProps ) : null, type: field.type || field.tagName.toLowerCase(), layout: layoutOf( field ), honeypot: Boolean( field.closest( '.sgs-form__honeypot' ) ) };
	} );
}

// In page: the text of the first consent checkbox's label, as the visitor reads it.
function consentFacts( [ finder, resolveSrc, props ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	const box = root?.querySelector( 'input[type=checkbox]' );
	const label = box && ( box.closest( 'label' ) || box.parentElement );
	const text = label && ( label.querySelector( '.sgs-form-field__consent-text' ) || label );
	return text ? Object.fromEntries( props.map( ( p ) => [ p, getComputedStyle( text ).getPropertyValue( p ).trim() ] ) ) : null;
}

async function focusRead( page, { finder, resolveSrc } ) {
	return page.evaluate( ( [ f, src, props, selector, holderSrc ] ) => {
		// eslint-disable-next-line no-new-func
		const root = new Function( `return (${ src });` )()( f );
		// eslint-disable-next-line no-new-func
		const textHolder = new Function( `return (${ holderSrc });` )();
		// A visitor never reaches the honeypot, so the focus look is read on the first real field.
		const field = [ ...( root?.querySelectorAll( selector ) ?? [] ) ].find( ( el ) => ! el.closest( '.sgs-form__honeypot' ) );
		if ( ! field ) {
			return null;
		}
		field.scrollIntoView( { block: 'center' } );
		field.focus( { focusVisible: true } );
		const label = textHolder( ( field.id && root.querySelector( `label[for="${ CSS.escape( field.id ) }"]` ) ) || field.closest( 'label' ) || field.parentElement?.querySelector( 'label' ), field );
		return new Promise( ( done ) => setTimeout( () => {
			const cs = getComputedStyle( field );
			const read = Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
			const ls = label ? getComputedStyle( label ) : null;
			done( { read, label: ls ? { 'font-size': ls.fontSize, color: ls.color } : null } );
			field.blur();
		}, 500 ) );
	}, [ finder, resolveSrc, FIELD_FOCUS_PROPS, FIELD_SELECTOR, textHolderSrc ] );
}

// Draft only: the component's step key and the steps its form shows, read by setting each step.
async function stepsRead( page, { finder, resolveSrc, tpl } ) {
	const name = /^(?:Root>)?(\w+)@/.exec( String( tpl ?? '' ) )?.[ 1 ];
	if ( ! name ) {
		return null;
	}
	const reach = ( n ) => page.evaluate( ( [ comp, step ] ) => {
		const host = document.querySelector( `[data-sc-name="${ CSS.escape( comp ) }"]` );
		const k = host && Object.keys( host ).find( ( x ) => x.startsWith( '__reactFiber$' ) );
		let f = k ? host[ k ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic ) ) {
			f = f.return;
		}
		const logic = f?.stateNode?.logic;
		const key = logic && Object.keys( logic.state ).find( ( x ) => /^step$/i.test( x ) && 'number' === typeof logic.state[ x ] );
		if ( ! key ) {
			return null;
		}
		logic.setState( { [ key ]: step } );
		return new Promise( ( done ) => setTimeout( () => done( key ), 400 ) );
	}, [ name, n ] );
	const steps = [];
	let key = null;
	for ( let n = 0; n < 8; n++ ) {
		key = await reach( n );
		if ( ! key ) {
			break;
		}
		steps.push( await page.evaluate( fieldsOf, [ finder, resolveSrc, FIELD_REST_PROPS, LABEL_PROPS, FIELD_SELECTOR, textHolderSrc ] ) );
	}
	key && ( await reach( 0 ) );
	return key ? steps : null;
}

async function formProbe( page, args ) {
	const { finder, resolveSrc, side } = args;
	const first = await page.evaluate( fieldsOf, [ finder, resolveSrc, FIELD_REST_PROPS, LABEL_PROPS, FIELD_SELECTOR, textHolderSrc ] );
	let fields = first;
	let steps = 1;
	if ( 'draft' === side ) {
		const reached = await stepsRead( page, args );
		if ( reached ) {
			steps = reached.length;
			fields = reached.flat();
		}
	}
	if ( ! fields.length ) {
		return null;
	}
	const focused = await focusRead( page, args );
	return { fields, steps, focus: focused?.read ?? null, focusLabel: focused?.label ?? null, consent: await page.evaluate( consentFacts, [ finder, resolveSrc, CONSENT_PROPS ] ) };
}

function tileFacts( [ finder, resolveSrc, props, checkProps, labelProps ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	const tile = root && ( root.matches( 'button, [role=radio], label' ) ? root : root.querySelector( '.sgs-form-tile, button' ) );
	if ( ! tile ) {
		return null;
	}
	const read = ( el, p ) => Object.fromEntries( p.map( ( x ) => [ x, getComputedStyle( el ).getPropertyValue( x ).trim() ] ) );
	// Where a visitor sees the tick: a corner badge (absolute) or in line with the text. A block's inline tick is positioned (relative, to
	// hold its drawn mark) where a draft's is static, so `position` itself says nothing about the placement.
	const placementOf = ( el ) => ( 'none' === getComputedStyle( el ).display ? null : 'absolute' === getComputedStyle( el ).position ? 'corner' : 'inline-start' );
	// How the element stands as a visitor sees it: the translate, rotate and scale properties and the transform composed into one
	// matrix (CSS applies them in that order), to two decimals. The framework's hover motion moves an element through translate and
	// scale where a draft's rule uses transform, so the transform property alone says nothing about whether the element moved.
	const poseOf = ( el ) => {
		const cs = getComputedStyle( el );
		const m = new DOMMatrix();
		const nums = ( v ) => String( v ).split( /\s+/ ).map( parseFloat );
		if ( 'none' !== cs.translate ) {
			const [ x, y = 0 ] = nums( cs.translate );
			m.translateSelf( x, y );
		}
		if ( 'none' !== cs.rotate ) {
			m.rotateSelf( 0, 0, nums( cs.rotate ).pop() );
		}
		if ( 'none' !== cs.scale ) {
			const [ x, y = x ] = nums( cs.scale );
			m.scaleSelf( x, y );
		}
		'none' !== cs.transform && m.multiplySelf( new DOMMatrix( cs.transform ) );
		const r = ( n ) => ( Math.round( n * 100 ) / 100 ) + 0;
		return `matrix(${ [ m.a, m.b, m.c, m.d, m.e, m.f ].map( r ).join( ', ' ) })`;
	};
	// The tick: the block's own badge, else a small absolute badge, else an inline svg (a draft's tick before the label).
	const check = tile.querySelector( '.sgs-form-tile__check' ) || [ ...tile.querySelectorAll( '*' ) ].find( ( e ) => 'absolute' === getComputedStyle( e ).position && parseFloat( getComputedStyle( e ).width ) <= 48 ) || tile.querySelector( 'svg' );
	const label = tile.querySelector( '.sgs-form-tile__label' ) || tile.firstElementChild;
	const r = tile.getBoundingClientRect();
	const host = tile.closest( '[data-sc-name]' );
	return { tile: { ...read( tile, props ), pose: poseOf( tile ) }, check: check ? { ...read( check, checkProps ), placement: placementOf( check ) } : null, label: label ? read( label, labelProps ) : null, at: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, hovered: tile.matches( ':hover' ), tplId: tile.getAttribute( 'data-dc-tpl' ), dc: host?.getAttribute( 'data-sc-name' ) ?? null };
}

// Puts the pointer on the element `pick` names (smooth scrolling can carry the page on after it lands, so the box is re-read until
// it holds still and the landing confirmed by :hover) and returns where it stands.
async function aimAt( page, { finder, resolveSrc, second = false } ) {
	const where = () => page.evaluate( ( [ f, src, next ] ) => {
		// eslint-disable-next-line no-new-func
		const root = new Function( `return (${ src });` )()( f );
		const first = root && ( root.matches( 'button, [role=radio], label' ) ? root : root.querySelector( '.sgs-form-tile, button' ) );
		const group = [ ...( first?.parentElement?.children ?? [] ) ].filter( ( e ) => e.tagName === first.tagName );
		const el = next ? group[ group.indexOf( first ) + 1 ] : first;
		if ( ! el ) {
			return null;
		}
		el.scrollIntoView( { block: 'center' } );
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, [ finder, resolveSrc, second ] );
	let at = await where();
	for ( let i = 0; at && i < 8; i++ ) {
		await page.waitForTimeout( 300 );
		const now = await where();
		const still = now && Math.abs( now.x - at.x ) < 0.5 && Math.abs( now.y - at.y ) < 0.5;
		at = now;
		if ( still ) {
			break;
		}
	}
	return at;
}

// Whether a second click leaves the first tile chosen (several answers) or moves the choice (one): the first tile's ground after
// the second tile is clicked, against its chosen ground. Null where the field has one tile or the chosen ground is not read.
async function multiRead( page, { finder, resolveSrc, selected } ) {
	const chosen = selected?.tile?.[ 'background-color' ];
	const at = chosen ? await aimAt( page, { finder, resolveSrc, second: true } ) : null;
	if ( ! at ) {
		return null;
	}
	await page.mouse.click( at.x, at.y );
	await page.mouse.move( 1, 1 );
	await page.waitForTimeout( 700 );
	await aimAt( page, { finder, resolveSrc } );
	await page.mouse.move( 1, 1 );
	await page.waitForTimeout( 400 );
	const after = await page.evaluate( tileFacts, [ finder, resolveSrc, [ 'background-color' ], [], [] ] );
	return after?.tile?.[ 'background-color' ] === chosen;
}

async function tileProbe( page, { finder, resolveSrc } ) {
	const args = [ finder, resolveSrc, TILE_PROPS, CHECK_PROPS, LABEL_PROPS ];
	const at = await aimAt( page, { finder, resolveSrc } );
	if ( ! at || ! ( await page.evaluate( tileFacts, args ) ) ) {
		return null;
	}
	const rest = await page.evaluate( tileFacts, args );
	let hover = null;
	for ( let i = 0; i < 3 && ! hover?.hovered; i++ ) {
		await page.mouse.move( at.x, at.y );
		await page.waitForTimeout( 700 );
		hover = await page.evaluate( tileFacts, args );
	}
	await page.mouse.click( at.x, at.y );
	await page.mouse.move( 1, 1 );
	await page.waitForTimeout( 700 );
	const selected = await page.evaluate( tileFacts, args );
	return { rest, hover: hover?.hovered ? hover : null, selected, multi: await multiRead( page, { finder, resolveSrc, selected } ) };
}

// sgs/form-field-consent: the painted size of its tick box (the checkbox itself, as the draft and the block both draw it).
async function consentBoxProbe( page, { finder, resolveSrc } ) {
	return page.evaluate( ( [ f, src ] ) => {
		// eslint-disable-next-line no-new-func
		const root = new Function( `return (${ src });` )()( f );
		const box = root && ( root.matches( 'input[type=checkbox]' ) ? root : root.querySelector( 'input[type=checkbox]' ) );
		const r = box?.getBoundingClientRect();
		const px = ( n ) => `${ Math.round( n * 100 ) / 100 }px`;
		return r && r.width > 0 ? { box: { width: px( r.width ), height: px( r.height ) } } : null;
	}, [ finder, resolveSrc ] );
}

export async function probeRead( page, { keys, finderOf, resolveSrc, tpls, blocks, side } ) {
	const out = {};
	const probeOf = { 'sgs/form-field-tiles': tileProbe, 'sgs/form-field-consent': consentBoxProbe };
	for ( const key of keys ) {
		const args = { finder: finderOf( key ), resolveSrc, tpl: tpls[ key ], side };
		const facts = await ( probeOf[ blocks[ key ] ] ?? formProbe )( page, args );
		facts && ( out[ key ] = facts );
	}
	return out;
}
