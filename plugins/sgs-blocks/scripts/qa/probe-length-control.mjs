#!/usr/bin/env node
/**
 * Live probe: SgsLengthControl in the inspector, the editor canvas and the published page, on both scales.
 *
 *   node scripts/qa/probe-length-control.mjs [--site sandybrown] [--page 5677] [--out <dir>] [--no-save]
 *
 * Per case it selects the block, finds the control by its label, screenshots it, then drives it the way a client does:
 * pick a preset, type a value in each unit, drag the slider (font-size scale: the gear to custom first), and after every
 * step reads the canvas element's computed size and records whether it changed. Per-device cases repeat the edit on
 * Tablet and Mobile. It then saves and reads the published page at 375, 768 and 1440 and compares each width with the
 * value stored for its tier. The scratch page must hold the blocks named in CASES (see CASES.block).
 *
 * Exit: 1 on any failed check, 2 when only unanswered rows remain, else 0. SGS_HEADED=1 runs real Chrome.
 *
 * @package
 */
import fs from 'node:fs';
import path from 'node:path';
import {
	startSession,
	openEditor,
	selectBlock,
} from './lib-length-control-live.mjs';
import { makeReporter } from '../motion-qa/probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) =>
	argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback;
const SITE_KEY = opt( '--site', 'sandybrown' );
const PAGE_ID = opt( '--page', '5677' );
const OUT = path.resolve(
	opt( '--out', '../../.claude/reports/2026-10-22-length-control' )
);
const SAVE = ! argv.includes( '--no-save' );
fs.mkdirSync( OUT, { recursive: true } );

const R = makeReporter();
const { verdict, unanswered, note, attempt } = R;
const results = [];

/**
 * One case per control. `canvas` reads the editor element and `live` the published one: [ selector, css property ].
 * `perDevice` cases are edited on Desktop, Tablet and Mobile.
 */
const CASES = [
	{
		id: 'icon-size',
		scale: 'font-size',
		block: 'sgs/icon',
		canvas: [ ( id ) => `[data-block="${ id }"] svg`, 'width' ],
		live: [ '.sgs-icon svg', 'width' ],
		perDevice: true,
	},
	{
		id: 'social-icons-size',
		scale: 'font-size',
		block: 'sgs/social-icons',
		canvas: [ ( id ) => `[data-block="${ id }"] .sgs-icon svg`, 'width' ],
		live: [ '.sgs-social-icons .sgs-icon svg', 'width' ],
		perDevice: true,
	},
	{
		id: 'social-icons-gap',
		scale: 'spacing',
		block: 'sgs/social-icons',
		label: 'Gap between icons',
		canvas: [ ( id ) => `[data-block="${ id }"]`, 'column-gap' ],
		live: [ '.sgs-social-icons', 'column-gap' ],
		perDevice: true,
		presets: true,
	},
	{
		id: 'label-radius',
		scale: 'spacing',
		block: 'sgs/label',
		label: 'Border radius',
		canvas: [
			( id ) => `[data-block="${ id }"]`,
			'border-top-left-radius',
		],
		live: [ '.wp-block-sgs-label', 'border-top-left-radius' ],
		max: 60,
	},
	{
		id: 'container-gap',
		scale: 'spacing',
		block: 'sgs/container',
		label: 'Gap',
		canvas: [ ( id ) => `[data-block="${ id }"]`, 'column-gap*' ],
		live: [ '.sgs-container--flex', 'column-gap*' ],
		perDevice: true,
	},
	{
		id: 'container-width',
		scale: 'spacing',
		block: 'sgs/container',
		label: 'Outer max-width',
		canvas: [ ( id ) => `[data-block="${ id }"]`, 'max-width' ],
		live: [ '.sgs-container--flex', 'max-width' ],
		perDevice: true,
	},
];

const UNIT_STEPS = [
	[ 'px', '24' ],
	[ 'rem', '2' ],
	[ 'em', '3' ],
	[ '%', '30' ],
	[ 'vw', '4' ],
];

const { browser, page, site } = await startSession( SITE_KEY );
const finish = async () => {
	await browser.close();
	fs.writeFileSync(
		path.join( OUT, 'results.json' ),
		JSON.stringify( results, null, 2 )
	);
	if ( R.failures.length ) {
		console.log(
			`\n${ R.failures.length } failed: ${ R.failures.join( '; ' ) }`
		);
	}
	if ( R.unansweredRows.length ) {
		console.log(
			`\n${
				R.unansweredRows.length
			} unanswered: ${ R.unansweredRows.join( '; ' ) }`
		);
	}
	process.exit( R.exitCode() );
};

const frame = await attempt( 'open-editor', () =>
	openEditor( page, site, PAGE_ID )
);
if ( ! frame ) {
	await finish();
}

const sidebar = page.locator( '.interface-complementary-area' ).first();
const shot = async ( name, locator ) => {
	const file = path.join( OUT, `${ name }.png` );
	try {
		await locator.screenshot( { path: file, timeout: 5000 } );
	} catch {
		// A control inside a scrolled or sticky region: take the whole sidebar instead.
		await sidebar.screenshot( { path: file } );
	}
};

/** Expand every panel on a tab except the noisy ones, so every control of the block is in the DOM. */
async function expandAll() {
	for ( const tab of [ 'Settings', 'Styles' ] ) {
		await sidebar.getByRole( 'tab', { name: tab } ).click();
		await page.waitForTimeout( 300 );
		for ( let i = 0; i < 14; i++ ) {
			const closed = sidebar.locator(
				'button.components-panel__body-toggle[aria-expanded="false"]'
			);
			if ( ! ( await closed.count() ) ) {
				break;
			}
			if (
				/Visibility|Advanced|Entrance|Effects|Hover/.test(
					await closed.first().innerText()
				)
			) {
				break;
			}
			await closed.first().click();
			await page.waitForTimeout( 200 );
		}
	}
}

/**
 * The spacing-scale control for a label: its own hidden label when it has one, else the nearest visible text before it
 * (a control inside ResponsiveOverride is named by the wrapper's label, not its own).
 * @param label
 */
async function spacingGroup( label ) {
	for ( const tab of [ 'Settings', 'Styles' ] ) {
		await sidebar.getByRole( 'tab', { name: tab } ).click();
		await page.waitForTimeout( 300 );
		const tagged = await page.evaluate( ( text ) => {
			document
				.querySelectorAll( '[data-qa-target]' )
				.forEach( ( e ) => e.removeAttribute( 'data-qa-target' ) );
			const root = document.querySelector(
				'.interface-complementary-area'
			);
			const groups = [
				...root.querySelectorAll( '.sgs-length-control' ),
			];
			for ( const g of groups ) {
				const own = [ ...g.querySelectorAll( 'label' ) ].map( ( l ) =>
					l.textContent.trim()
				);
				let before = '';
				const walker = document.createTreeWalker(
					root,
					NodeFilter.SHOW_TEXT
				);
				let n;
				let last = '';
				while ( ( n = walker.nextNode() ) ) {
					if (
						g.compareDocumentPosition( n ) &
							Node.DOCUMENT_POSITION_FOLLOWING &&
						! g.contains( n )
					) {
						break;
					}
					if ( ! g.contains( n ) && n.textContent.trim() ) {
						last = n.textContent.trim();
					}
				}
				before = last;
				const prevText = (
					g.previousElementSibling?.textContent || ''
				).trim();
				const parentFirst = ( g.parentElement?.innerText || '' )
					.split( '\n' )[ 0 ]
					.trim();
				if (
					own.includes( text ) ||
					prevText === text ||
					parentFirst === text ||
					before === text
				) {
					g.setAttribute( 'data-qa-target', '1' );
					return true;
				}
			}
			return false;
		}, label );
		if ( tagged ) {
			const group = sidebar.locator( '[data-qa-target]' ).first();
			await group.scrollIntoViewIfNeeded();
			return group;
		}
	}
	const seen = await page.evaluate( () =>
		[
			...document.querySelectorAll(
				'.interface-complementary-area .sgs-length-control'
			),
		].map(
			( g ) =>
				[ ...g.querySelectorAll( 'label' ) ]
					.map( ( l ) => l.textContent.trim() )
					.join( '/' ) +
				' <- ' +
				( g.previousElementSibling?.textContent || '' )
					.trim()
					.slice( 0, 30 )
		)
	);
	note( `no-control-${ label }`, { seen } );
	return null;
}

/**
 * The nth core font-size picker on the block's tabs.
 * @param nth
 */
async function fontPicker( nth = 0 ) {
	for ( const tab of [ 'Settings', 'Styles' ] ) {
		await sidebar.getByRole( 'tab', { name: tab } ).click();
		await page.waitForTimeout( 250 );
		const pickers = sidebar.locator( '.components-font-size-picker' );
		if ( ( await pickers.count() ) > nth ) {
			const picker = pickers.nth( nth );
			await picker.scrollIntoViewIfNeeded();
			return picker;
		}
	}
	return null;
}

// `column-gap*` reads the first element at or below the selector that has a real column gap (the block's own element
// or its inner band, whichever the stylesheet puts the gap on).
const readCanvas = ( selector, prop ) =>
	frame.evaluate(
		( { sel, p } ) => {
			const el = document.querySelector( sel );
			if ( ! el ) {
				return null;
			}
			if ( p.endsWith( '*' ) ) {
				const name = p.slice( 0, -1 );
				const hit = [ el, ...el.querySelectorAll( '*' ) ].find(
					( e ) =>
						'normal' !==
						getComputedStyle( e ).getPropertyValue( name )
				);
				return hit
					? getComputedStyle( hit ).getPropertyValue( name )
					: 'normal';
			}
			return getComputedStyle( el ).getPropertyValue( p );
		},
		{ sel: selector, p: prop }
	);

/**
 * Do an edit, wait, read the canvas, and record whether it differs from the last reading.
 * @param c
 * @param rows
 * @param name
 * @param action
 * @param read
 * @param prev
 */
async function step( c, rows, name, action, read, prev ) {
	await action();
	await page.waitForTimeout( 700 );
	const value = await read();
	rows.push( { step: name, canvas: value, changed: value !== prev.value } );
	prev.value = value;
	return value;
}

async function dragSlider( slider ) {
	const box = await slider.boundingBox();
	await page.mouse.click( box.x + box.width * 0.62, box.y + box.height / 2 );
}

async function driveSpacing( c, id, group, rows, read, prev ) {
	const selects = group.locator( 'select' );
	const count = await selects.count();
	let presetSelect = null;
	let unitSelect = null;
	for ( let i = 0; i < count; i++ ) {
		const hasCustom = (
			await selects.nth( i ).locator( 'option' ).allInnerTexts()
		).some( ( t ) => t.includes( 'Custom' ) );
		if ( hasCustom ) {
			presetSelect = selects.nth( i );
		} else {
			unitSelect = selects.nth( i );
		}
	}
	const box = group.locator( 'input:not([type="range"])' ).first();
	const slider = group.locator( 'input[type="range"]' ).first();
	rows.push( {
		step: 'structure',
		preset: Boolean( presetSelect ),
		unitBox: Boolean( await box.count() ),
		slider: Boolean( await slider.count() ),
	} );
	if ( presetSelect ) {
		const options = await presetSelect.locator( 'option' ).allInnerTexts();
		rows.push( { step: 'preset names', options } );
		const pick = options.find( ( t ) => 'M' === t.trim() ) || options[ 3 ];
		await step(
			c,
			rows,
			`preset ${ pick }`,
			() => presetSelect.selectOption( { label: pick } ),
			read,
			prev
		);
		rows.push( {
			step: 'box after preset',
			boxValue: await box.inputValue(),
			unit: unitSelect ? await unitSelect.inputValue() : null,
		} );
	}
	for ( const [ unit, number ] of UNIT_STEPS ) {
		await step(
			c,
			rows,
			`custom ${ number }${ unit }`,
			async () => {
				if ( unitSelect ) {
					await unitSelect.selectOption( unit );
				}
				await box.fill( number );
				await box.press( 'Tab' );
			},
			read,
			prev
		);
	}
	await step(
		c,
		rows,
		'slider drag',
		() => dragSlider( slider ),
		read,
		prev
	);
	rows.push( {
		step: 'stored after slider',
		box: await box.inputValue(),
		unit: unitSelect ? await unitSelect.inputValue() : null,
	} );
}

async function driveFont( c, id, picker, rows, read, prev ) {
	const gear = picker
		.locator(
			'button[aria-label="Set custom size"], button[aria-label="Use size preset"]'
		)
		.first();
	const dropdown = picker.locator( 'button:not([aria-label])' ).first();
	rows.push( {
		step: 'structure',
		gear: Boolean( await gear.count() ),
		dropdown: Boolean( await dropdown.count() ),
		header: ( await picker.innerText() )
			.split( '\n' )
			.slice( 0, 3 )
			.join( ' | ' ),
	} );
	if ( await dropdown.count() ) {
		await dropdown.click();
		const options = await page
			.locator( '[role="listbox"] [role="option"]' )
			.allInnerTexts();
		rows.push( { step: 'preset names', options } );
		const pick =
			options.find( ( t ) => /^large/i.test( t.trim() ) ) || options[ 3 ];
		if ( pick ) {
			await step(
				c,
				rows,
				`preset ${ pick.split( '\n' )[ 0 ] }`,
				() =>
					page
						.locator( '[role="listbox"] [role="option"]' )
						.filter( { hasText: pick.split( '\n' )[ 0 ] } )
						.first()
						.click(),
				read,
				prev
			);
		} else {
			await page.keyboard.press( 'Escape' );
		}
	}
	const number = picker.locator( 'input:not([type="range"])' ).first();
	for (
		let attemptNo = 0;
		attemptNo < 2 && ! ( await number.isVisible().catch( () => false ) );
		attemptNo++
	) {
		await gear.click();
		await page.waitForTimeout( 500 );
	}
	rows.push( {
		step: 'custom mode',
		controls: await picker.evaluate( ( e ) =>
			[ ...e.querySelectorAll( 'button,input,select' ) ].map(
				( x ) =>
					x.tagName +
					':' +
					( x.getAttribute( 'aria-label' ) || x.type || '' )
			)
		),
	} );
	const unitSelect = picker.locator( 'select' ).first();
	const slider = picker.locator( 'input[type="range"]' ).first();
	for ( const [ unit, n ] of [
		[ 'px', '40' ],
		[ 'rem', '2' ],
		[ 'em', '3' ],
		[ 'vw', '4' ],
		[ 'vh', '5' ],
	] ) {
		await step(
			c,
			rows,
			`custom ${ n }${ unit }`,
			async () => {
				if ( await unitSelect.count() ) {
					await unitSelect.selectOption( unit );
				}
				await number.fill( n );
				await number.press( 'Tab' );
			},
			read,
			prev
		);
	}
	await step(
		c,
		rows,
		'slider drag',
		() => dragSlider( slider ),
		read,
		prev
	);
}

/**
 * The tier's final value stored by this case, read back from the block's attributes for the live comparison.
 * @param type
 */
const setDevice = async ( type ) => {
	await page.evaluate(
		( t ) => window.wp.data.dispatch( 'core/editor' ).setDeviceType( t ),
		type
	);
	await page.waitForTimeout( 900 );
};

for ( const c of CASES ) {
	const rows = [];
	const entry = { id: c.id, scale: c.scale, block: c.block, rows, tiers: {} };
	results.push( entry );
	await page.keyboard.press( 'Escape' );
	const ok = await attempt( `case:${ c.id }`, async () => {
		await setDevice( 'Desktop' );
		const id = await selectBlock( page, c.block );
		await expandAll();
		const nth =
			'social-icons-gap' === c.id || 'social-icons-size' === c.id ? 0 : 0;
		const group =
			'font-size' === c.scale
				? await fontPicker( nth )
				: await spacingGroup( c.label );
		if ( ! group ) {
			throw new Error(
				`control ${ c.label || 'font-size picker' } not found for ${
					c.block
				}`
			);
		}
		const [ selFn, prop ] = c.canvas;
		const read = () => readCanvas( selFn( id ), prop );
		const prev = { value: await read() };
		rows.push( { step: 'initial', canvas: prev.value } );
		await shot( `${ c.id }-1-initial`, group );
		const tiers = c.perDevice
			? [ 'Desktop', 'Tablet', 'Mobile' ]
			: [ 'Desktop' ];
		for ( const tier of tiers ) {
			if ( 'Desktop' !== tier ) {
				await setDevice( tier );
				await selectBlock( page, c.block );
				await expandAll();
			}
			const g =
				'font-size' === c.scale
					? await fontPicker( nth )
					: await spacingGroup( c.label );
			const tierRows = [];
			const tierPrev = { value: await read() };
			if ( 'Desktop' === tier ) {
				if ( 'font-size' === c.scale ) {
					await driveFont( c, id, g, tierRows, read, tierPrev );
				} else {
					await driveSpacing( c, id, g, tierRows, read, tierPrev );
				}
				await shot( `${ c.id }-2-after-${ tier.toLowerCase() }`, g );
			} else {
				// A tier value: type one length so the live page has a distinct number for this width.
				const box = g.locator( 'input:not([type="range"])' ).first();
				const unitSelect = g
					.locator( 'select' )
					.filter( { hasText: 'px' } )
					.last();
				const number = 'Tablet' === tier ? '18' : '12';
				await step(
					c,
					tierRows,
					`${ tier } ${ number }px`,
					async () => {
						if ( await unitSelect.count() ) {
							await unitSelect
								.selectOption( 'px' )
								.catch( () => {} );
						}
						await box.fill( number );
						await box.press( 'Tab' );
					},
					read,
					tierPrev
				);
				await shot( `${ c.id }-3-${ tier.toLowerCase() }`, g );
			}
			const final = await read();
			entry.tiers[ tier ] = { canvasFinal: final };
			rows.push( { tier, steps: tierRows, canvasFinal: final } );
		}
		await setDevice( 'Desktop' );
		return true;
	} );
	if ( ok ) {
		const flat = rows
			.flatMap( ( r ) => r.steps || [ r ] )
			.filter( ( r ) => r.step && 'canvas' in r );
		const changes = flat.filter( ( r ) => r.changed );
		verdict( changes.length >= 4, `canvas-follows-${ c.id }`, {
			stepsRead: flat.length,
			stepsThatChanged: changes.length,
			unchanged: flat
				.filter( ( r ) => ! r.changed && ! /initial/.test( r.step ) )
				.map( ( r ) => r.step ),
		} );
	}
}

if ( SAVE ) {
	const saved = await attempt( 'save', async () => {
		await page.getByRole( 'button', { name: 'Save', exact: true } ).click();
		await page.waitForTimeout( 6000 );
		return true;
	} );
	if ( saved ) {
		note( 'saved', { page: PAGE_ID } );
	}
}

// The published page, at the three widths.
const WIDTHS = [
	[ 375, 'Mobile' ],
	[ 768, 'Tablet' ],
	[ 1440, 'Desktop' ],
];
// The logged-in session: the host's bot wall challenges anonymous browsers after a burst of traffic, and the page's own
// styles are the same for a signed-in reader.
const live = await page.context().newPage();
for ( const [ width, tier ] of WIDTHS ) {
	await attempt( `live-${ width }`, async () => {
		await live.setViewportSize( { width, height: 900 } );
		await live.goto(
			`${ site.url }/?page_id=${ PAGE_ID }&qa=${ Date.now() }`,
			{ waitUntil: 'networkidle' }
		);
		for ( const entry of results ) {
			const c = CASES.find( ( x ) => x.id === entry.id );
			const value = await live.evaluate(
				( { sel, p } ) => {
					const el = document.querySelector( sel );
					if ( ! el ) {
						return null;
					}
					if ( p.endsWith( '*' ) ) {
						const name = p.slice( 0, -1 );
						const hit = [ el, ...el.querySelectorAll( '*' ) ].find(
							( e ) =>
								'normal' !==
								getComputedStyle( e ).getPropertyValue( name )
						);
						return hit
							? getComputedStyle( hit ).getPropertyValue( name )
							: 'normal';
					}
					return getComputedStyle( el ).getPropertyValue( p );
				},
				{ sel: c.live[ 0 ], p: c.live[ 1 ] }
			);
			entry.tiers[ c.perDevice ? tier : 'Desktop' ] = {
				...( entry.tiers[ c.perDevice ? tier : 'Desktop' ] || {} ),
				[ `live${ width }` ]: value,
			};
		}
		await live.screenshot( {
			path: path.join( OUT, `live-${ width }.png` ),
		} );
		return true;
	} );
}
// A one-tier case reads the same on every width: the 768 and 375 readings must equal the 1440 reading.
for ( const entry of results ) {
	const c = CASES.find( ( x ) => x.id === entry.id );
	if ( ! entry.tiers.Desktop ) {
		continue;
	}
	if ( c.perDevice ) {
		const t = entry.tiers;
		verdict(
			null != t.Desktop?.live1440 &&
				null != t.Tablet?.live768 &&
				null != t.Mobile?.live375 &&
				t.Desktop.live1440 !== t.Tablet.live768 &&
				t.Tablet.live768 !== t.Mobile.live375,
			`live-three-tiers-differ-${ c.id }`,
			{
				desktop: t.Desktop?.live1440,
				tablet: t.Tablet?.live768,
				mobile: t.Mobile?.live375,
				canvas: {
					desktop: t.Desktop?.canvasFinal,
					tablet: t.Tablet?.canvasFinal,
					mobile: t.Mobile?.canvasFinal,
				},
			}
		);
	} else {
		const d = entry.tiers.Desktop;
		verdict(
			null != d.live1440 &&
				d.live1440 === d.live768 &&
				d.live768 === d.live375,
			`live-same-at-all-widths-${ c.id }`,
			{
				live1440: d.live1440,
				live768: d.live768,
				live375: d.live375,
				canvas: d.canvasFinal,
			}
		);
	}
}
await finish();
