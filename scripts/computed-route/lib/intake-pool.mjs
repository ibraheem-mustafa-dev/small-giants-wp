// The browser-unit pool of the intake command (Spec 48 FR-48-28, FR-48-17). Each unit (one route read, one census
// width and page, one defect width, one skeleton page) opens its own sandbox, browser context and harness clock, so
// units are independent; mapPool runs them side by side and returns their results by input index, so every caller
// folds them in the same canonical order as a sequential run, never in completion order.
//
// One process-wide semaphore of INTAKE_POOL slots (default 4) bounds every unit of every caller, so stages run side by
// side (lib/intake-run-worker.mjs) cannot multiply the browsers open. A unit that calls mapPool again runs its items
// one after another inside its own slot (a nested call never waits for a second slot, so it cannot deadlock).
// INTAKE_POOL=1 is the reference: every mapPool call is a plain loop in input order, as before the pool existed.
import { AsyncLocalStorage } from 'async_hooks';

const inSlot = new AsyncLocalStorage();
const waiting = [];
let active = 0;

// The pool size from INTAKE_POOL: a positive integer, default 4. Anything else is an error naming the value.
export function poolSize( env = process.env ) {
	const raw = env.INTAKE_POOL;
	if ( undefined === raw || '' === raw ) {
		return 4;
	}
	const n = Number( raw );
	if ( ! Number.isInteger( n ) || n < 1 ) {
		throw new Error( `INTAKE_POOL must be a positive integer, not ${ JSON.stringify( raw ) }` );
	}
	return n;
}

// Waits for a free slot (first come, first served).
async function acquire() {
	if ( active < poolSize() ) {
		active++;
		return;
	}
	await new Promise( ( done ) => waiting.push( done ) );
}

// Hands the slot to the longest waiter, or frees it.
function release() {
	const next = waiting.shift();
	if ( next ) {
		next();
	} else {
		active--;
	}
}

// Runs fn() in one pool slot (or directly when already inside one) and returns its result.
export async function withSlot( fn ) {
	if ( inSlot.getStore() ) {
		return fn();
	}
	await acquire();
	try {
		return await inSlot.run( true, fn );
	} finally {
		release();
	}
}

// fn(item, index) for every item, at most `n` of this call at once and every call together within the pool's slots.
// Resolves to the results in input order; the first rejection (in input order) rejects the call once every started
// unit has ended, so no browser is left running. Sequential (a plain loop) when the pool size or `n` is 1, or inside a
// slot.
export async function mapPool( items, n, fn ) {
	const list = [ ...items ];
	if ( 1 === poolSize() || n <= 1 || inSlot.getStore() ) {
		const out = [];
		for ( const [ i, x ] of list.entries() ) {
			out.push( await fn( x, i ) );
		}
		return out;
	}
	const settled = new Array( list.length );
	let next = 0;
	const lane = async () => {
		while ( next < list.length ) {
			const i = next++;
			settled[ i ] = await withSlot( () => fn( list[ i ], i ) ).then( ( value ) => ( { ok: true, value } ), ( error ) => ( { ok: false, error } ) );
		}
	};
	await Promise.all( Array.from( { length: Math.min( n, list.length ) }, lane ) );
	const bad = settled.find( ( s ) => ! s.ok );
	if ( bad ) {
		throw bad.error;
	}
	return settled.map( ( s ) => s.value );
}
