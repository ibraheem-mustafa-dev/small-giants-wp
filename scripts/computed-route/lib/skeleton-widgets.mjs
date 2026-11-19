// The interactive widgets a surface holds, recognised by what the draft's code does (Spec 48 FR-48-6, the standing rules
// `accordion`, `slider` and `tabs`): never by a name, a class or a word in the copy. Read once per surface from the fact
// record (each template element's loop, condition, events and `ref`) and the draft's logic syntax tree
// (lib/skeleton-narrowing.mjs::draftLogicOf), never run:
//   - an accordion is two or more sibling units (copies of one loop template, or siblings each holding a control) where
//     each unit holds one control (an element with a click handler) and a panel that renders only under a condition whose
//     value reads a state key that control's handler toggles (the written value flips on that key's prior value, or the handler
//     both sets and clears it), and the unit's words outside its panel are all its control's. A write whose value is an object
//     with a computed key (a keyed map) lets several open at once; any other write opens one at a time.
//   - a slider is a track (an element bound to a `ref`) holding two or more copies of one loop template, with controls
//     whose click handlers scroll that ref (scrollTo, scrollBy, scrollIntoView, or a scrollLeft write, followed through the
//     component's own methods), or write a state key the track's own style reads; a timer that does the same is autoplay.
//   - tabs are two or more sibling controls each writing one state key to its own value, with panels outside them that
//     render under a condition comparing that key with a value; the panel a control shows is the one whose compared value
//     is the value the control writes.
// The handoff's surfaces.json `kind` (the fact record's surfaces) is a cross-check only: a mechanism and a record that
// agree are noted as agreeing, a mechanism with no record keeps its block with a note, and a record of the kind shown on
// the surface with no matching mechanism is a proposal problem naming the record.
import path from 'path';
import { draftLogicOf, stateReads } from './skeleton-narrowing.mjs';
import { isThisMember, isFn, subtree, resolveName, classMethod, keyName } from './intake-ast.mjs';
import { propRefs, elementsOf, oneString } from './intake-ast-eval.mjs';
import { rootData, holeField } from './fill-list-items.mjs';
import { matchFields, keyRoles } from './fill-list-content.mjs';
import { mountBinding } from './mount-handler.mjs';
import { isRing } from './skeleton-child-slots.mjs';

const MAX_DEPTH = 4;
const SCROLL_CALLS = new Set( [ 'scrollTo', 'scrollBy', 'scrollIntoView' ] );
const SCROLL_PROPS = new Set( [ 'scrollLeft', 'scrollTop' ] );
const bound = ( v ) => /^\{\{\s*([\w$.]+)\s*\}\}$/.exec( String( v ?? '' ).trim() )?.[ 1 ] ?? null;
const literal = ( n ) => ( [ 'StringLiteral', 'NumericLiteral', 'BooleanLiteral' ].includes( n?.type ) ? n.value : undefined );

// The logic readings of one component's draft: `d` as lib/skeleton-narrowing.mjs::draftLogicOf returns it.
export function logicReadings( d ) {
	// The first property named `name` inside `node`: an object method itself, else the property's value.
	const propIn = ( node, name ) => {
		const p = node && subtree( d.idx, node ).find( ( n ) => ( 'ObjectProperty' === n.type || 'ObjectMethod' === n.type ) && ! n.computed && keyName( n ) === name );
		if ( ! p ) {
			return null;
		}
		return 'ObjectMethod' === p.type ? p : p.value;
	};
	// The logic node a template binding names (`f.toggle` for a loop variable `f`, `prev`, `rd.down`): the renderVals value
	// of the loop's list or of the head, then each later part as a property inside it.
	const valueOf = ( t, expr ) => {
		const parts = String( expr ?? '' ).split( '.' );
		const loop = ( t?.membership?.scFor || [] ).find( ( f ) => f.as === parts[ 0 ] );
		let n = d.values.get( loop ? bound( loop.list ) : parts[ 0 ] ) ?? null;
		for ( const p of parts.slice( 1 ) ) {
			n = n && propIn( n, p );
		}
		return n;
	};
	// The function a node is: itself, a local function a name declares, or the component method `this.name` is.
	const fnOf = ( n ) => {
		if ( ! n ) {
			return null;
		}
		if ( isFn( n ) ) {
			return n;
		}
		if ( 'Identifier' === n.type ) {
			const r = resolveName( d.idx, n );
			return 'var' === r?.kind && isFn( r.init ) ? r.init : null;
		}
		if ( isThisMember( n ) ) {
			const m = classMethod( d.idx, n.property.name );
			if ( ! m ) {
				return null;
			}
			return 'ClassMethod' === m.type ? m : m.value;
		}
		return null;
	};
	// The functions a function reaches: itself and the component methods it calls (`this.step( 1 )`), a few levels deep.
	const reach = ( fn ) => {
		const out = [];
		const visit = ( f, depth ) => {
			if ( ! f || out.includes( f ) || depth > MAX_DEPTH ) {
				return;
			}
			out.push( f );
			subtree( d.idx, f ).filter( ( n ) => 'CallExpression' === n.type && isThisMember( n.callee ) && 'setState' !== n.callee.property.name ).forEach( ( n ) => visit( fnOf( n.callee ), depth + 1 ) );
		};
		visit( fn, 0 );
		return out;
	};
	// The state writes a function makes (its own and its methods'): [{ key, value, keyed }], `keyed` when the value is an
	// object holding a computed key (a map of open items).
	const writesOf = ( fn ) => reach( fn ).flatMap( ( f ) => subtree( d.idx, f ) )
		.filter( ( n ) => 'CallExpression' === n.type && isThisMember( n.callee, 'setState' ) )
		.flatMap( ( n ) => {
			const arg = n.arguments[ 0 ];
			let obj = null;
			if ( 'ObjectExpression' === arg?.type ) {
				obj = arg;
			} else if ( isFn( arg ) && 'ObjectExpression' === arg.body?.type ) {
				obj = arg.body;
			}
			return ( obj?.properties || [] ).filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed && keyName( p ) ).map( ( p ) => ( { key: keyName( p ), value: p.value, keyed: 'ObjectExpression' === p.value?.type && p.value.properties.some( ( q ) => q.computed ) } ) );
		} );
	// The state keys an expression reads, following the local names it uses to their declarations.
	const readsOf = ( node, seen = new Set() ) => {
		const out = new Set( node ? stateReads( d, node ) : [] );
		for ( const n of node ? subtree( d.idx, node ) : [] ) {
			if ( 'Identifier' !== n.type || seen.has( n.name ) ) {
				continue;
			}
			const r = resolveName( d.idx, n );
			if ( 'var' === r?.kind && r.init && seen.size < MAX_DEPTH * 4 ) {
				readsOf( r.init, new Set( [ ...seen, n.name ] ) ).forEach( ( k ) => out.add( k ) );
			}
		}
		return out;
	};
	// The refs a function scrolls: the `this.<ref>` names it passes or reads itself (else those its methods read), when it
	// or a method it reaches scrolls an element. `refs` are the component's ref names.
	const scrolledRefs = ( fn, refs ) => {
		const fns = reach( fn );
		const scrolls = fns.some( ( f ) => subtree( d.idx, f ).some( ( n ) => ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && SCROLL_CALLS.has( n.callee.property?.name ) )
			|| ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && SCROLL_PROPS.has( n.left.property?.name ) ) ) );
		if ( ! scrolls ) {
			return new Set();
		}
		const named = ( list ) => new Set( list.flatMap( ( f ) => subtree( d.idx, f ) ).filter( ( n ) => isThisMember( n ) && refs.has( n.property.name ) ).map( ( n ) => n.property.name ) );
		const own = named( [ fn ] );
		return own.size ? own : named( fns );
	};
	// The timers the component starts: [{ fn, delay }] for each setInterval whose first argument is a function.
	const timers = () => d.idx.all.filter( ( n ) => 'CallExpression' === n.type && ( 'setInterval' === n.callee.name || 'setInterval' === n.callee.property?.name ) )
		.map( ( n ) => ( { fn: fnOf( n.arguments[ 0 ] ), delay: literal( n.arguments[ 1 ] ) } ) ).filter( ( t ) => t.fn );
	// Each item of a renderVals list, read from the logic (every item, shown or not): [ref] in list order.
	const listElements = ( listKey ) => {
		const list = propRefs( d.idx, rootData( d.idx ), listKey )[ 0 ];
		return list ? elementsOf( d.idx, list ) : [];
	};
	// One field of one list item as a static string, or null.
	const itemField = ( item, field ) => propRefs( d.idx, [ item ], field ).map( ( r ) => oneString( d.idx, r.node, r.env ) ).find( ( v ) => null !== v ) ?? null;
	// The value a condition compares a state key with (`S.tab === 'a'`), when it is one literal.
	const comparedValue = ( node, key ) => {
		for ( const n of node ? subtree( d.idx, node ) : [] ) {
			if ( 'BinaryExpression' === n.type && /^[!=]==?$/.test( n.operator ) ) {
				let side = null;
				if ( readsOf( n.left ).has( key ) ) {
					side = n.right;
				} else if ( readsOf( n.right ).has( key ) ) {
					side = n.left;
				}
				if ( side && undefined !== literal( side ) ) {
					return literal( side );
				}
			}
		}
		const id = 'Identifier' === node?.type ? resolveName( d.idx, node ) : null;
		return 'var' === id?.kind && id.init ? comparedValue( id.init, key ) : undefined;
	};
	// Whether `writes` (a handler's writesOf) toggle `key`: a value (or, in a keyed map, an item's value) that flips on the key's own
	// prior value (`! S.open[ i ]`, `open ? -1 : i` with `open` reading the key), or two writes of the key, one clearing it (null,
	// false, -1, undefined or '') and one not. An add that only grows the key (a basket count) never toggles.
	const reads = ( n, key ) => readsOf( n ).has( key ) || subtree( d.idx, n ).some( ( x ) => 'MemberExpression' === x.type && ! x.computed && key === x.property?.name );
	const flips = ( v, key ) => ( 'UnaryExpression' === v?.type && '!' === v.operator && reads( v.argument, key ) ) || ( 'ConditionalExpression' === v?.type && reads( v.test, key ) );
	const clears = ( v ) => [ 'NullLiteral' ].includes( v?.type ) || ( 'Identifier' === v?.type && 'undefined' === v.name ) || ( 'UnaryExpression' === v?.type && '-' === v.operator && 1 === literal( v.argument ) ) || false === literal( v ) || '' === literal( v );
	const toggles = ( writes, key ) => {
		const mine = writes.filter( ( w ) => w.key === key );
		const values = mine.flatMap( ( w ) => ( w.keyed ? w.value.properties.filter( ( q ) => q.computed ).map( ( q ) => q.value ) : [ w.value ] ) );
		return values.some( ( v ) => flips( v, key ) ) || ( values.some( clears ) && values.some( ( v ) => ! clears( v ) ) );
	};
	return { d, valueOf, fnOf, reach, writesOf, readsOf, scrolledRefs, timers, listElements, itemField, comparedValue, toggles };
}

// o: { m (lib/skeleton-model.mjs), view (lib/skeleton-record.mjs::recordView), facts, R (decisions rules), surface,
// declared (an element's declared style), topBlock (the block an element's plain scoring proposes), narrows (whether a
// control's choice narrows a rendered list, rule optionSetFilter) }. Returns { of( e ) -> { rule, model, ... } | null,
// accordions, sliders, tabs, problems, notes, closedPanel, itemWords, toggleIcon }.
export function widgetModel( { m, view, facts, R, surface = {}, declared = () => ( {} ), topBlock = () => null, narrows = () => false } ) {
	const out = { accordions: [], sliders: [], tabs: [], problems: [], notes: [] };
	const at = new Map();
	const none = { ...out, of: () => null, closedPanel: () => ( { inner: [], handover: [] } ), itemWords: () => ( { attributes: {}, handover: [] } ), toggleIcon: () => ( { attributes: {}, notes: [] } ) };
	if ( ! ( R.accordion || R.slider || R.tabs ) || ! facts.repo || ! facts.client || ! view.sources ) {
		return none;
	}
	const folder = path.join( facts.repo, 'sites', facts.client, 'handoff' );
	const logics = new Map();
	const logic = ( component ) => {
		if ( ! logics.has( component ) ) {
			const d = component ? draftLogicOf( { folder, record: { sources: view.sources }, component } ) : null;
			logics.set( component, d ? logicReadings( d ) : null );
		}
		return logics.get( component );
	};
	const tplOf = ( e ) => view.entry( e )?.template ?? null;
	const tkOf = ( e ) => tplOf( e )?.key ?? null;
	const desc = ( e ) => m.blockKids( e ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	const within = ( e, a ) => {
		for ( let x = e; x; x = m.byKey[ x.parentKey ] ) {
			if ( x === a ) {
				return true;
			}
		}
		return false;
	};
	const inNav = ( e ) => {
		for ( let x = m.byKey[ e.parentKey ]; x; x = m.byKey[ x.parentKey ] ) {
			if ( 'nav' === view.realTag( x ) ) {
				return true;
			}
		}
		return false;
	};
	const clickOf = ( e ) => ( tplOf( e )?.events || [] ).find( ( ev ) => /^onClick$/i.test( ev.name ) )?.expr ?? null;
	const isControl = ( e ) => !! clickOf( e );
	const loopOf = ( e ) => tplOf( e )?.membership?.scFor?.at( -1 ) ?? null;
	// The mount host a control sits in (the element the runtime stamps for a dc-import), or null.
	const mountOf = ( e ) => {
		for ( let x = m.byKey[ e.parentKey ]; x; x = m.byKey[ x.parentKey ] ) {
			if ( 'dc-import' === x.srcTag ) {
				return x;
			}
		}
		return null;
	};
	// A control's click handler in the logic `L` of the unit holding it. A control inside a mounted component whose handler
	// is a prop the mount passes (lib/mount-handler.mjs) is read through the mount's binding in L, as a control drawn where
	// it stands is.
	const handlerOf = ( L, c ) => {
		const t = tplOf( c );
		const host = mountOf( c );
		const mount = host ? tplOf( host ) : null;
		if ( t && mount && mount.component !== t.component ) {
			const binding = mountBinding( { control: t, mount, own: logic( t.component ) } );
			if ( binding ) {
				return L.fnOf( L.valueOf( mount, binding ) );
			}
		}
		return L.fnOf( L.valueOf( t, clickOf( c ) ) );
	};
	// Runs of sibling elements that are copies of one loop template (two or more).
	const loopRuns = ( p ) => {
		const by = new Map();
		m.blockKids( p ).filter( ( k ) => loopOf( k ) ).forEach( ( k ) => by.set( tkOf( k ), [ ...( by.get( tkOf( k ) ) || [] ), k ] ) );
		return [ ...by.values() ].filter( ( r ) => r.length >= 2 );
	};
	const templates = ( component ) => Object.values( view.elements || {} ).map( ( x ) => x.template ).filter( ( t ) => t.component === component );
	const recordsOf = ( kind ) => Object.values( view.surfaces || {} ).filter( ( s ) => s.kind === kind );
	const shownHere = ( s ) => ( s.roots || [] ).some( ( k ) => m.els.some( ( e ) => tkOf( e ) === k ) );
	const recordFor = ( kind, keys ) => recordsOf( kind ).find( ( s ) => ( s.roots || [] ).some( ( k ) => keys.has( k ) ) ) ?? null;
	const textBlock = facts.replacedBy?.[ facts.tagMap.p?.core_block_slug ] ?? facts.tagMap.p?.core_block_slug ?? null;
	const textAttr = ( block ) => ( block ? facts.firstAttrByRole( block, 'text-content' ) : null );
	const letters = ( s ) => /[\p{L}\p{N}]/u.test( s );
	const sizePx = ( e ) => {
		const n = /^(-?[\d.]+)(px|rem|em)$/.exec( String( declared( e )[ 'font-size' ] ?? '' ).trim() );
		if ( ! n ) {
			return null;
		}
		return Number( n[ 1 ] ) * ( 'px' === n[ 2 ] ? 1 : 16 );
	};
	// The words a control shows: each element's own words that hold a letter or a digit, unless hidden from assistive technology.
	const controlTexts = ( c ) => [ c, ...desc( c ) ].filter( ( k ) => letters( m.words( k ) ) && 'true' !== String( view.attr( k, 'aria-hidden' ) ?? '' ) );
	// A control's title (its largest declared text, else its last) and its other texts, the first of them its category.
	const wordParts = ( c ) => {
		const texts = controlTexts( c );
		if ( ! texts.length ) {
			return { title: null, rest: [] };
		}
		const sizes = texts.map( sizePx );
		const ti = sizes.every( ( s ) => null != s ) ? sizes.lastIndexOf( Math.max( ...sizes ) ) : texts.length - 1;
		return { title: texts[ ti ], rest: texts.filter( ( x, i ) => i !== ti ) };
	};
	// Whether an element sits in a link, up to (not including) `stop`.
	const inLink = ( k, stop ) => {
		for ( let y = k; y && y !== stop; y = m.byKey[ y.parentKey ] ) {
			if ( 'a' === view.realTag( y ) ) {
				return true;
			}
		}
		return false;
	};

	// ---- accordions ----
	if ( R.accordion ) {
		const item = facts.composition[ R.accordion.block ]?.accepts?.[ 0 ] ?? null;
		const unitOf = ( u, L ) => {
			const controls = desc( u ).filter( isControl );
			if ( 1 !== controls.length ) {
				return null;
			}
			const [ control ] = controls;
			const ct = tplOf( control );
			const writes = L.writesOf( handlerOf( L, control ) );
			const keys = new Set( writes.map( ( w ) => w.key ) );
			const ut = tplOf( u );
			// A static unit with no record entry has no template to find its panels in.
			if ( ! ut ) {
				return null;
			}
			const reading = ( t ) => ( t.membership?.scIf || [] ).filter( ( c ) => t.parent === c.key ).flatMap( ( c ) => [ ...L.readsOf( L.valueOf( t, bound( c.value ) ) ) ] ).filter( ( k ) => keys.has( k ) );
			// The panel templates: inside the unit's template and outside the control's, directly under a condition that reads
			// a key the control writes.
			const panels = templates( ut.component ).filter( ( t ) => ( t.parentChain || [] ).includes( ut.key ) && t.key !== ct.key && ! ( t.parentChain || [] ).includes( ct.key ) && reading( t ).length );
			if ( ! panels.length ) {
				return null;
			}
			const panelKeys = new Set( panels.map( ( t ) => t.key ) );
			const rendered = desc( u ).filter( ( k ) => panelKeys.has( tkOf( k ) ) );
			// A panel that holds only links is a navigation disclosure, which a navigation block draws.
			const linksOnly = rendered.length > 0 && rendered.every( ( p ) => {
				const worded = [ p, ...desc( p ) ].filter( ( k ) => m.words( k ) );
				return worded.length > 0 && worded.every( ( k ) => inLink( k, m.byKey[ p.parentKey ] ) );
			} );
			const key = reading( panels[ 0 ] )[ 0 ];
			// A disclosure's control toggles the very key its panel reads; a control that only sets it (an add to basket whose
			// "In basket" note reads the basket) opens nothing.
			if ( ! L.toggles( writes, key ) ) {
				return null;
			}
			// A question-and-answer row's words outside its panel are its control's (the question): a unit with other words of its
			// own (a product card's name and price beside its button) is a card, never an accordion item.
			const inPanel = ( k ) => {
				for ( let x = k; x && x !== u; x = m.byKey[ x.parentKey ] ) {
					if ( panelKeys.has( tkOf( x ) ) ) {
						return true;
					}
				}
				return false;
			};
			if ( desc( u ).some( ( k ) => k !== control && ! within( k, control ) && ! inPanel( k ) && letters( m.words( k ) ) && 'true' !== String( view.attr( k, 'aria-hidden' ) ?? '' ) ) ) {
				return null;
			}
			// The control's title and category elements are the unit's title and category parts (lib/skeleton-child-slots.mjs::unitSlots).
			const words = wordParts( control );
			return { el: u, control, panels, rendered, key, keyed: writes.some( ( w ) => w.key === key && w.keyed ), linksOnly, title: words.title, category: words.rest[ 0 ] ?? null };
		};
		for ( const p of m.els.filter( ( e ) => ! m.isPart( e ) && m.blockKids( e ).length >= 2 ) ) {
			const comp = tplOf( p )?.component;
			const L = comp ? logic( comp ) : null;
			if ( ! L || inNav( p ) ) {
				continue;
			}
			const runs = loopRuns( p );
			// Static siblings each holding one control count as one run too.
			const statics = m.blockKids( p ).filter( ( k ) => ! loopOf( k ) && 1 === desc( k ).filter( isControl ).length );
			statics.length >= 2 && runs.push( statics );
			for ( const run of runs ) {
				if ( run.some( ( u ) => at.has( u.key ) ) ) {
					continue;
				}
				const units = run.map( ( u ) => unitOf( u, L ) );
				if ( units.some( ( u ) => ! u ) || new Set( units.map( ( u ) => u.key ) ).size !== 1 ) {
					continue;
				}
				if ( units.some( ( u ) => u.linksOnly ) ) {
					out.notes.push( `${ p.key }: ${ units.length } disclosure units whose panels hold only links are a navigation disclosure, not an accordion` );
					continue;
				}
				const rec = recordFor( R.accordion.recordKind, new Set( run.map( tkOf ) ) );
				const multiple = units.some( ( u ) => u.keyed );
				const open = units.map( ( u, i ) => ( u.rendered.length ? i : -1 ) ).filter( ( i ) => i >= 0 );
				const whole = m.blockKids( p ).length === run.length;
				const model = { kind: 'accordion', host: whole ? p : null, parent: p, units, key: units[ 0 ].key, multiple, open, record: rec?.id ?? null, item };
				out.accordions.push( model );
				whole && at.set( p.key, { rule: 'accordion', model } );
				units.forEach( ( u, i ) => {
					at.set( u.el.key, { rule: 'accordionItem', model, index: i } );
					at.set( u.control.key, { rule: 'accordionControl', model, into: u.el.key } );
				} );
			}
		}
	}

	// ---- sliders ----
	if ( R.slider ) {
		const refOf = ( L, t ) => {
			const v = L.d.values.get( bound( t.attrs.ref ) );
			return isThisMember( v ) ? v.property.name : bound( t.attrs.ref );
		};
		for ( const track of m.els.filter( ( e ) => ! m.isPart( e ) && bound( tplOf( e )?.attrs?.ref ) && ! at.has( e.key ) ) ) {
			const t = tplOf( track );
			const L = logic( t.component );
			const slides = L && ! inNav( track ) ? loopRuns( track ).find( ( r ) => r.length === m.blockKids( track ).length ) : null;
			if ( ! slides ) {
				continue;
			}
			const refs = new Set( templates( t.component ).filter( ( x ) => bound( x.attrs?.ref ) ).map( ( x ) => refOf( L, x ) ) );
			const own = refOf( L, t );
			// The state keys the track's own style reads (a transform bound to an index).
			const styleKeys = new Set( ( t.holes || [] ).filter( ( h ) => /^style:/.test( h.where ) ).flatMap( ( h ) => [ ...L.readsOf( L.valueOf( t, h.path ) ) ] ) );
			const drives = ( fn ) => L.scrolledRefs( fn, refs ).has( own ) || L.writesOf( fn ).some( ( w ) => styleKeys.has( w.key ) );
			const controls = m.els.filter( ( c ) => c !== track && ! within( c, track ) && tplOf( c )?.component === t.component && isControl( c ) && drives( handlerOf( L, c ) ) );
			if ( ! controls.length ) {
				continue;
			}
			const timer = L.timers().find( ( x ) => drives( x.fn ) ) ?? null;
			const events = new Set( ( t.events || [] ).map( ( ev ) => ev.name.toLowerCase() ) );
			const drag = [ 'pointer', 'mouse', 'touch' ].some( ( k ) => events.has( `on${ k }down` ) || events.has( `on${ k }start` ) ) && [ 'pointer', 'mouse', 'touch' ].some( ( k ) => events.has( `on${ k }move` ) );
			const dots = controls.filter( ( c ) => loopOf( c ) );
			const arrows = controls.filter( ( c ) => ! loopOf( c ) );
			// The slides' item fields (the loop variable's paths their elements print), matched to each listed block's child
			// settings by name and role (lib/fill-list-content.mjs::matchFields): a block fits when its listed roles are taken.
			const loop = loopOf( slides[ 0 ] );
			const fields = [ ...new Map( templates( t.component ).filter( ( x ) => ( x.membership?.scFor || [] ).some( ( f ) => f.key === loop.key ) )
				.flatMap( ( x ) => ( x.holes || [] ).map( ( h ) => holeField( h, x.realTag || x.tag ) ).filter( ( f ) => f && f.head === loop.as ) ).map( ( f ) => [ f.name, { name: f.name, image: f.image } ] ) ).values() ];
			const childKeys = ( child ) => facts.q( "SELECT attr_name, attr_type, role FROM block_attributes WHERE block_slug = ? AND role IN ( 'text-content', 'content', 'image-object' ) AND ( css_property IS NULL OR css_property = '' ) ORDER BY rowid", child ).map( ( r ) => ( { key: r.attr_name, type: r.attr_type, role: r.role } ) );
			const fit = ( R.slider.blocks || [] ).find( ( b ) => {
				const child = facts.composition[ b.block ]?.accepts?.[ 0 ];
				const keys = child ? childKeys( child ) : [];
				const { map } = matchFields( fields, keys );
				const taken = Object.values( map ).map( ( k ) => keys.find( ( x ) => x.key === k ) ).filter( Boolean );
				return child && ( b.roles || [] ).every( ( role ) => taken.some( ( k ) => keyRoles( k )[ 0 ] === role ) );
			} ) ?? null;
			// The controls and the wrappers that hold nothing but controls go into the slider, which draws its own arrows and dots.
			const controlsOnly = ( x ) => controls.includes( x ) || ( ! m.words( x ) && m.blockKids( x ).length > 0 && m.blockKids( x ).every( controlsOnly ) );
			const parts = new Set( controls.map( ( c ) => {
				let top = c;
				for ( let up = m.byKey[ c.parentKey ]; up && ! within( track, up ) && controlsOnly( up ); up = m.byKey[ up.parentKey ] ) {
					top = up;
				}
				return top;
			} ) );
			const S = R.slider.settings || {};
			const model = { kind: 'slider', track, slides, controls, parts: [ ...parts ], arrows: arrows.length, dots: dots.length, timer, drag, fields: fields.map( ( f ) => f.name ), block: fit?.block ?? null };
			if ( fit ) {
				const has = ( a ) => a && facts.attr( fit.block, a );
				const speed = timer && Number.isFinite( timer.delay ) ? timer.delay : undefined;
				model.attributes = Object.fromEntries( [ [ S.arrows, arrows.length > 0 ], [ S.dots, dots.length > 0 ], [ S.autoplay, !! timer ], [ S.speed, speed ] ].filter( ( [ a, val ] ) => has( a ) && undefined !== val ) );
				at.set( track.key, { rule: 'slider', model } );
				model.parts.forEach( ( x ) => at.set( x.key, { rule: 'sliderControl', model, into: track.key } ) );
			} else {
				const held = [ ...new Set( ( R.slider.otherCapabilities || [] ).flatMap( ( c ) => facts.blocksWithCap( c ) ) ) ];
				model.missing = `a slider of ${ slides.length } slides (item fields ${ model.fields.join( ', ' ) || 'none' }) that no listed slider block takes (${ ( R.slider.blocks || [] ).map( ( b ) => `${ b.block } needs ${ ( b.roles || [] ).join( ' and ' ) }` ).join( '; ' ) }); the blocks with capability ${ ( R.slider.otherCapabilities || [] ).join( ' or ' ) } (${ held.join( ', ' ) || 'none' }) hold no such slides, so the slides keep their proposal`;
				out.problems.push( `${ track.key }: ${ model.missing }` );
			}
			out.sliders.push( model );
		}
	}

	// ---- tabs ----
	if ( R.tabs && ! ( R.tabs.refuseSurfaceKinds || [] ).includes( surface.kind ) ) {
		for ( const p of m.els.filter( ( e ) => ! m.isPart( e ) && ! inNav( e ) && ! at.has( e.key ) ) ) {
			const controls = m.blockKids( p );
			const comp = tplOf( p )?.component;
			const L = comp && controls.length >= 2 && controls.every( isControl ) && ! controls.some( ( c ) => at.has( c.key ) ) ? logic( comp ) : null;
			// A link with a real address navigates (route navigation), never a tab.
			if ( ! L || controls.some( ( c ) => 'a' === view.realTag( c ) && c.attrs?.href && '#' !== c.attrs.href ) ) {
				continue;
			}
			const writes = controls.map( ( c ) => L.writesOf( handlerOf( L, c ) ) );
			const shared = [ ...new Set( writes[ 0 ].map( ( w ) => w.key ) ) ].filter( ( k ) => writes.every( ( ws ) => ws.some( ( w ) => w.key === k && ! L.readsOf( w.value ).has( k ) ) ) );
			// A choice that narrows a rendered list is a filter (rule optionSetFilter), never tabs.
			const key = narrows( controls[ 0 ] ) ? null : shared[ 0 ];
			if ( ! key ) {
				continue;
			}
			const valueOf = ( c, i ) => {
				const lit = literal( writes[ i ].find( ( x ) => x.key === key ).value );
				if ( undefined !== lit ) {
					return lit;
				}
				return loopOf( c ) ? i : undefined;
			};
			const pt = tplOf( p );
			const panels = templates( comp ).filter( ( t ) => ! ( t.parentChain || [] ).includes( pt.key ) && t.key !== pt.key )
				.map( ( t ) => ( { t, c: ( t.membership?.scIf || [] ).find( ( c ) => t.parent === c.key && L.readsOf( L.valueOf( t, bound( c.value ) ) ).has( key ) ) } ) ).filter( ( x ) => x.c )
				.map( ( x ) => ( { ...x, value: L.comparedValue( L.valueOf( x.t, bound( x.c.value ) ), key ) } ) );
			const rendered = panels.map( ( x ) => ( { ...x, el: m.els.find( ( e ) => tkOf( e ) === x.t.key && ! m.isPart( e ) ) } ) ).filter( ( x ) => x.el );
			const tabs = controls.map( ( c, i ) => ( { control: c, value: valueOf( c, i ), label: m.words( c ) || controlTexts( c ).map( m.words ).join( ' ' ) } ) );
			if ( 1 !== rendered.length || tabs.some( ( x ) => undefined === x.value ) || ! tabs.some( ( x ) => x.value === rendered[ 0 ].value ) ) {
				continue;
			}
			// The tabs block is the nearest element holding both the controls and the shown panel, holding nothing else.
			let host = m.byKey[ p.parentKey ];
			while ( host && ! within( rendered[ 0 ].el, host ) ) {
				host = m.byKey[ host.parentKey ];
			}
			const kids = host ? m.blockKids( host ) : [];
			const panelTop = kids.find( ( k ) => within( rendered[ 0 ].el, k ) );
			const listTop = kids.find( ( k ) => within( p, k ) );
			if ( ! host || ! panelTop || ! listTop || kids.some( ( k ) => k !== listTop && k !== panelTop ) || at.has( host.key ) ) {
				continue;
			}
			const shown = tabs.findIndex( ( x ) => x.value === rendered[ 0 ].value );
			const model = { kind: 'tabs', host, list: p, panel: panelTop, tabs, shown, key };
			out.tabs.push( model );
			at.set( host.key, { rule: 'tabs', model } );
			at.set( listTop.key, { rule: 'tabsList', model, into: host.key } );
			at.set( panelTop.key, { rule: 'tab', model, index: shown } );
		}
	}

	// A handoff record of the accordion kind shown on this surface that no accordion took is a proposal problem.
	if ( R.accordion ) {
		const taken = new Set( out.accordions.map( ( a ) => a.record ).filter( Boolean ) );
		recordsOf( R.accordion.recordKind ).filter( ( s ) => shownHere( s ) && ! taken.has( s.id ) )
			.forEach( ( s ) => out.problems.push( `handoff record ${ s.id } ("${ s.name }", kind ${ s.kind }) names ${ ( s.roots || [] ).join( ', ' ) } on this surface and no accordion mechanism was found there (a control whose handler writes a state key its unit's panel condition reads): it stays as proposed` ) );
	}

	// The content an accordion item's panel holds when the draft shows it closed at rest: each panel element printing one
	// field of the loop item, its value read from the logic's data for that item, in the block the shown item's same panel
	// element proposes (reading that element's look). { inner: [node], handover: [entry] }.
	const closedPanel = ( model, index, finder ) => {
		const u = model.units[ index ];
		const L = logic( tplOf( u.el ).component );
		const loop = loopOf( u.el );
		const listKey = loop ? bound( loop.list ) : null;
		const item = listKey ? L.listElements( listKey )[ index ] : null;
		const shownUnit = model.units.find( ( x ) => x.rendered.length );
		const inner = [];
		const handover = [];
		for ( const t of u.panels ) {
			const texts = ( t.holes || [] ).map( ( h ) => holeField( h, t.realTag || t.tag ) ).filter( ( f ) => f?.text && f.head === loop?.as );
			if ( 1 !== texts.length ) {
				continue;
			}
			const value = item ? L.itemField( item, texts[ 0 ].name ) : null;
			const shownEl = shownUnit?.rendered.find( ( r ) => tkOf( r ) === t.key ) ?? null;
			const block = ( shownEl && topBlock( shownEl ) ) || textBlock;
			const attr = textAttr( block );
			if ( null === value || ! attr ) {
				handover.push( { owner: 'content-page', kind: 'text', detail: `the panel of item ${ index + 1 } ("${ m.words( u.control ) || controlTexts( u.control ).map( m.words ).join( ' ' ) }") is not readable from the draft's data (field ${ texts[ 0 ].name }): write it in the item` } );
				continue;
			}
			const ref = shownEl ? finder( shownEl ) : null;
			inner.push( { name: block, attributes: { [ attr ]: value }, ...( ref ? { draftRef: ref } : {} ), innerBlocks: [] } );
		}
		return { inner, handover };
	};

	// The title and category an item's control shows: the largest declared text is the title, another single text the
	// category, which the item also shows over its title (categoryShown); any further text is a handover. The setting
	// names are the decisions entry's (rules.accordion.settings).
	const itemWords = ( u ) => {
		const S = R.accordion?.settings || {};
		const { title, rest } = wordParts( u.control );
		if ( ! title || ! S.title ) {
			return { attributes: {}, handover: [] };
		}
		const attributes = { [ S.title ]: m.words( title ) };
		if ( rest.length && S.category ) {
			attributes[ S.category ] = m.words( rest[ 0 ] );
			S.categoryShown && ( attributes[ S.categoryShown ] = true );
		}
		return { attributes, handover: rest.slice( S.category ? 1 : 0 ).map( ( x ) => ( { owner: 'content-page', kind: 'text', detail: `the item's control also shows "${ m.words( x ) }", which the item has no setting for` } ) ) };
	};

	// The accordion's toggle icon from what its units' controls draw (rules.accordion.toggle): the glyph typed in a closed
	// unit's icon ring is the open icon, by the entry's glyph list; in the open unit's ring, a different glyph is the close
	// icon, and the same glyph turned further (its declared rotate) is the close icon of the shape the turn ends on (turns). A
	// glyph or turn the lists do not name, or no ring, writes nothing and is said. Returns { attributes, notes }.
	const toggleIcon = ( model ) => {
		const T = R.accordion?.toggle;
		const none = { attributes: {}, notes: [] };
		if ( ! T?.glyphs || ! T.settings ) {
			return none;
		}
		const ringOf = ( u ) => ( u ? [ u.control, ...desc( u.control ) ].find( isRing ) ?? null : null );
		const glyphOf = ( r ) => String( r?.words ?? '' ).trim();
		const turnOf = ( r ) => {
			const d = declared( r );
			const t = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec( String( d.transform ?? '' ) ) ?? /^(-?[\d.]+)deg$/.exec( String( d.rotate ?? '' ).trim() );
			return t ? Number( t[ 1 ] ) : 0;
		};
		const shut = ringOf( model.units.find( ( u, i ) => ! model.open.includes( i ) ) );
		const shown = ringOf( model.units.find( ( u, i ) => model.open.includes( i ) ) );
		const icon = shut ? T.glyphs[ glyphOf( shut ) ] : null;
		if ( ! icon ) {
			return { attributes: {}, notes: [ shut ? `the closed unit's icon ring draws "${ glyphOf( shut ) }", which rules.accordion.toggle.glyphs names no icon for: the accordion keeps its toggle icon` : 'no closed unit draws an icon ring: the accordion keeps its toggle icon' ] };
		}
		const attributes = { [ T.settings.open ]: icon };
		const notes = [];
		if ( ! shown ) {
			notes.push( 'the draft shows no open unit, so what the toggle becomes when open is not read: the close icon stays' );
		} else if ( glyphOf( shown ) !== glyphOf( shut ) ) {
			const close = T.glyphs[ glyphOf( shown ) ];
			close ? ( attributes[ T.settings.close ] = close ) : notes.push( `the open unit's icon ring draws "${ glyphOf( shown ) }", which rules.accordion.toggle.glyphs names no icon for: the close icon stays` );
		} else {
			const turn = ( ( ( turnOf( shown ) - turnOf( shut ) ) % 360 ) + 360 ) % 360;
			// The same glyph unturned stays the same icon when open; turned, the close icon is the shape the turn ends on
			// (rules.accordion.toggle.turns: a plus turned 45 degrees is a cross). The turn itself is a style value, never a skeleton's:
			// the clone cross-fades the two icons, and the draft's turning transition is the motion route's.
			const as = 0 === turn ? icon : ( T.turns || [] ).find( ( t ) => t.icon === icon && ( t.by || [] ).includes( turn ) )?.is;
			as ? ( attributes[ T.settings.close ] = as ) : notes.push( `the open unit's icon ring turns "${ glyphOf( shut ) }" by ${ turn } degrees, which rules.accordion.toggle.turns names no icon for: the close icon stays` );
			turn > 0 && as && notes.push( `the close icon is ${ as }, the shape the draft's ${ turn }-degree turn ends on; the clone cross-fades the two icons` );
		}
		return { attributes, notes };
	};

	return { ...out, of: ( e ) => at.get( e.key ) ?? null, closedPanel, itemWords, toggleIcon };
}
