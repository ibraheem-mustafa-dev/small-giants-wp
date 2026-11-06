// The applier's element probes: parts of a block the pairing does not reach, read on both sides at 1440 into facts[ key ].probes.
//   sgs/form: every field of every step (the draft's steps are reached through its component's setState, READING-DC-FILES section 1;
//     the live form holds every step in its markup) with its label, and the first field under keyboard focus.
//   sgs/form-field-tiles: the first tile at rest, selected (clicked, pointer moved away) with its check mark and label, and hovered.
export const FIELD_REST_PROPS = [ 'background-color', 'color', 'border-top-color', 'border-top-width', 'border-top-style', 'font-size', 'font-weight' ];
export const FIELD_FOCUS_PROPS = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'outline-color', 'outline-style', 'outline-width' ];
export const LABEL_PROPS = [ 'color', 'font-size', 'font-weight', 'font-family', 'letter-spacing', 'text-transform', 'line-height' ];
export const TILE_PROPS = [ 'background-color', 'color', 'border-top-color', 'border-top-width', 'box-shadow' ];
export const CHECK_PROPS = [ 'position', 'top', 'width', 'height', 'color', 'background-color' ];

const FIELD_SELECTOR = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=file]):not([type=button]), textarea, select';

// In page: every field under `root` with its label's styles.
function fieldsOf( [ finder, resolveSrc, restProps, labelProps, selector ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! root ) {
		return [];
	}
	const read = ( el, props ) => Object.fromEntries( props.map( ( p ) => [ p, getComputedStyle( el ).getPropertyValue( p ).trim() ] ) );
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
		const label = ( field.id && root.querySelector( `label[for="${ CSS.escape( field.id ) }"]` ) ) || field.closest( 'label' ) || field.parentElement?.querySelector( 'label' );
		return { field: read( field, restProps ), label: label ? read( label, labelProps ) : null, type: field.type || field.tagName.toLowerCase(), layout: layoutOf( field ), honeypot: Boolean( field.closest( '.sgs-form__honeypot' ) ) };
	} );
}

async function focusRead( page, { finder, resolveSrc } ) {
	return page.evaluate( ( [ f, src, props, selector ] ) => {
		// eslint-disable-next-line no-new-func
		const root = new Function( `return (${ src });` )()( f );
		const field = root?.querySelector( selector );
		if ( ! field ) {
			return null;
		}
		field.scrollIntoView( { block: 'center' } );
		field.focus( { focusVisible: true } );
		return new Promise( ( done ) => setTimeout( () => {
			const cs = getComputedStyle( field );
			done( Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) ) );
			field.blur();
		}, 500 ) );
	}, [ finder, resolveSrc, FIELD_FOCUS_PROPS, FIELD_SELECTOR ] );
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
		steps.push( await page.evaluate( fieldsOf, [ finder, resolveSrc, FIELD_REST_PROPS, LABEL_PROPS, FIELD_SELECTOR ] ) );
	}
	key && ( await reach( 0 ) );
	return key ? steps : null;
}

async function formProbe( page, args ) {
	const { finder, resolveSrc, side } = args;
	const first = await page.evaluate( fieldsOf, [ finder, resolveSrc, FIELD_REST_PROPS, LABEL_PROPS, FIELD_SELECTOR ] );
	let fields = first;
	let steps = 1;
	if ( 'draft' === side ) {
		const reached = await stepsRead( page, args );
		if ( reached ) {
			steps = reached.length;
			fields = reached.flat();
		}
	}
	return fields.length ? { fields, steps, focus: await focusRead( page, args ) } : null;
}

function tileFacts( [ finder, resolveSrc, props, checkProps, labelProps ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	const tile = root && ( root.matches( 'button, [role=radio], label' ) ? root : root.querySelector( '.sgs-form-tile, button' ) );
	if ( ! tile ) {
		return null;
	}
	const read = ( el, p ) => Object.fromEntries( p.map( ( x ) => [ x, getComputedStyle( el ).getPropertyValue( x ).trim() ] ) );
	const check = tile.querySelector( '.sgs-form-tile__check' ) || [ ...tile.querySelectorAll( '*' ) ].find( ( e ) => 'absolute' === getComputedStyle( e ).position && parseFloat( getComputedStyle( e ).width ) <= 48 );
	const label = tile.querySelector( '.sgs-form-tile__label' ) || tile.firstElementChild;
	const r = tile.getBoundingClientRect();
	return { tile: read( tile, props ), check: check ? read( check, checkProps ) : null, label: label ? read( label, labelProps ) : null, at: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
}

async function tileProbe( page, { finder, resolveSrc } ) {
	const args = [ finder, resolveSrc, TILE_PROPS, CHECK_PROPS, LABEL_PROPS ];
	await page.evaluate( ( [ f, src ] ) => {
		// eslint-disable-next-line no-new-func
		const root = new Function( `return (${ src });` )()( f );
		( root?.matches( 'button, [role=radio], label' ) ? root : root?.querySelector( '.sgs-form-tile, button' ) )?.scrollIntoView( { block: 'center' } );
	}, [ finder, resolveSrc ] );
	const rest = await page.evaluate( tileFacts, args );
	if ( ! rest ) {
		return null;
	}
	await page.mouse.move( rest.at.x, rest.at.y );
	await page.waitForTimeout( 700 );
	const hover = await page.evaluate( tileFacts, args );
	await page.mouse.click( rest.at.x, rest.at.y );
	await page.mouse.move( 1, 1 );
	await page.waitForTimeout( 700 );
	const selected = await page.evaluate( tileFacts, args );
	return { rest, hover, selected };
}

export async function probeRead( page, { keys, finderOf, resolveSrc, tpls, blocks, side } ) {
	const out = {};
	for ( const key of keys ) {
		const args = { finder: finderOf( key ), resolveSrc, tpl: tpls[ key ], side };
		const facts = 'sgs/form-field-tiles' === blocks[ key ] ? await tileProbe( page, args ) : await formProbe( page, args );
		facts && ( out[ key ] = facts );
	}
	return out;
}
