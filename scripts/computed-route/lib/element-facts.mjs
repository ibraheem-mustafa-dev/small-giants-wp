// The one reader of an inventory element's facts for every skeleton rule (Spec 48 §3.4, R-47-4). Each fact comes from
// where it truly lives, never from the inventory's `snippet` (kept only for the review page) or the raw `style` attribute
// (kept only as Fill's fingerprint):
//   - attributes and every event binding (any event name, in full) from the fact record's `template.attrs` and
//     `template.events` (lib/fact-record.mjs), through lib/skeleton-record.mjs::recordView; an element with no record entry
//     has its rendered attributes and no bindings;
//   - declared styles from the record (`template.style.static`, longhands);
//   - resolved values per width from the inventory's browser read (lib/skeleton-inventory.mjs `resolved`): the result of a
//     clamp(), var() or calc() and the inherited text properties, beside the box, position and visibility it measures;
//   - the element's own text as the runtime rendered it (its line breaks kept, whether it opens before the children) from
//     the same read; its placeholders from the record's holes.
// What a handler does is read from the logic's syntax tree by lib/skeleton-handler-opens.mjs and its siblings, fed the
// handler name this reader gives. A rule judges a value at every width the element renders (`acrossWidths`) unless the rule
// itself names a width range; a verdict that holds at some widths only goes to the review marked width-dependent.
import { recordView } from './skeleton-record.mjs';

const readers = new WeakMap();
const EMPTY = recordView( null );

// The handler a binding's expression names (`toggleMobile`, `item.open`), or '' for an inline expression.
const nameOf = ( expr ) => ( /^[\w$]+(?:\.[\w$]+)*$/.test( String( expr ?? '' ).trim() ) ? String( expr ).trim() : '' );
// The event an `on<Event>` binding listens for, lower case (`onPointerDown` is `pointerdown`).
const eventOf = ( name ) => String( name ).replace( /^on/, '' ).toLowerCase();
// A computed length in px, or null (`auto`, `normal`, a keyword).
export const pxOf = ( v ) => {
	const n = /^(-?[\d.]+)px$/.exec( String( v ?? '' ).trim() );
	return n ? Number( n[ 1 ] ) : null;
};

// The widths a test holds at among `widths`: { holds, fails, every (it holds at every one, and there is one), some (it holds
// at some, not all) }.
export function acrossWidths( widths, test ) {
	const holds = widths.filter( ( w ) => test( w ) );
	const fails = widths.filter( ( w ) => ! holds.includes( w ) );
	return { holds, fails, every: holds.length > 0 && ! fails.length, some: holds.length > 0 && fails.length > 0 };
}

// The reader over one record view (lib/skeleton-record.mjs::recordView; an empty view when the client has no record). One
// reader per view, so every module reading the same view reads the same facts.
export function elementFacts( view = EMPTY ) {
	if ( readers.has( view ) ) {
		return readers.get( view );
	}
	const entry = ( e ) => view.entry( e )?.template ?? null;
	// An attribute as the draft writes it: the rendered value the inventory kept, else the record's template text in full (a
	// binding as written, `{{ item.href }}`). A DOM property the runtime camel-cases (`autoComplete`) matches its HTML name.
	const attr = ( e, name ) => {
		if ( null != e?.attrs?.[ name ] ) {
			return String( e.attrs[ name ] );
		}
		const attrs = entry( e )?.attrs ?? {};
		const hit = Object.keys( attrs ).find( ( k ) => k === name ) ?? Object.keys( attrs ).find( ( k ) => k.toLowerCase() === String( name ).toLowerCase() );
		return undefined === hit ? null : String( attrs[ hit ] );
	};
	// Every event binding of the element: [ { name ('onClick'), event ('click'), expr, handler (the handler name, '' for an
	// inline expression) } ].
	const events = ( e ) => ( entry( e )?.events ?? [] ).map( ( v ) => ( { name: v.name, event: eventOf( v.name ), expr: v.expr ?? '', handler: nameOf( v.expr ) } ) );
	// The handler of one event (click by default), '' when the element binds none.
	const handler = ( e, event = 'click' ) => events( e ).find( ( v ) => v.event === event )?.handler ?? '';
	// The widths the element renders at, ascending.
	const widths = ( e ) => Object.keys( e?.visible || {} ).filter( ( w ) => true === e.visible[ w ] ).map( Number ).sort( ( a, b ) => a - b );
	// A resolved value at one width (the browser's computed value), or null when the read holds none.
	const resolved = ( e, prop, w ) => e?.resolved?.[ w ]?.[ prop ] ?? null;
	// A resolved length at one width in px, or null.
	const lengthAt = ( e, prop, w ) => pxOf( resolved( e, prop, w ) );
	// The rendered box at one width ({ x, y, w, h }), or null.
	const boxAt = ( e, w ) => e?.box?.[ w ] ?? null;
	// The record's text holes of the element.
	const textHoles = ( e ) => ( entry( e )?.holes ?? [] ).filter( ( h ) => 'text' === h.where );
	// Whether the element's whole content is one script value (`{{ arrowIcon }}`): one text hole and no words of its own.
	const textBinding = ( e ) => {
		const t = entry( e );
		const holes = textHoles( e );
		return !! t && 1 === holes.length && ! holes.reduce( ( s, h ) => s.split( `{{ ${ h.expr } }}` ).join( '' ), String( t.words ?? '' ) ).trim();
	};
	// The draft's own placeholders on the element (its attribute and text holes, `{{ phone }}`), not its children's.
	const placeholders = ( e ) => ( entry( e )?.holes ?? [] ).filter( ( h ) => 'text' === h.where || String( h.where ).startsWith( 'attr:' ) ).map( ( h ) => `{{ ${ String( h.expr ).trim() } }}` );
	return Object.freeze( readers.set( view, {
		view, attr, events, handler, declared: ( e ) => view.declared( e ), widths, resolved, lengthAt, boxAt, textBinding, placeholders,
		// The element's text as rendered, each line break as <br> (only an element whose text holds one carries `textBreaks`).
		textWithBreaks: ( e ) => String( e?.textBreaks ?? e?.allText ?? e?.words ?? '' ).replace( /\s+/g, ' ' ).trim(),
		// Whether the element's own words open its content, before its first child element (an element read before the
		// inventory recorded it opens with its words).
		textLeads: ( e ) => false !== e?.textLeads,
	} ).get( view ) );
}
