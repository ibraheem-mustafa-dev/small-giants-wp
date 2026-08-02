/**
 * sgs/physics-canvas — the per-body fall/bounce physics helper.
 *
 * Split out of `fx-physics-canvas.js` purely to keep that file under the
 * project's 250-line JS limit; both are one effect, one review unit.
 *
 * @package
 */

import { InertiaPlugin } from 'gsap/InertiaPlugin';

/**
 * Minimum speed (px/s) below which a settling body is considered at rest —
 * stops the bounce/re-launch loop, rather than chasing sub-pixel jitter
 * forever with a live `onUpdate` still attached.
 */
const REST_SPEED = 12;

/**
 * Launch (or re-launch, after a bounce) a Physics2D fall from the body's
 * CURRENT position with a given velocity/angle, self-tracking its own
 * frame-to-frame displacement to detect arena-edge collisions.
 *
 * ⚠ Deliberately does NOT read `InertiaPlugin.getVelocity()` while this tween
 * is running. That API tracks a target's OWN transform history — valid at
 * the instant Draggable hands off a genuine pointer release (see `settle()`
 * below), but there is no public GSAP API to WRITE a velocity back into it,
 * so it cannot represent "reflect off a wall". This function tracks its own
 * `(x, y, t)` samples across `onUpdate` ticks instead — self-contained, and
 * correct by construction rather than by an unverified private API.
 *
 * Draggable populates `.minX/.maxX/.minY/.maxY` on the instance once bounds
 * are applied (`bounds: arena`) — the same edges the pointer drag itself is
 * constrained to, so a thrown body settles inside exactly the region it can
 * be dragged within.
 *
 * @param {Object}      gsapInstance Shared, registered gsap instance.
 * @param {HTMLElement} body         The falling body.
 * @param {Object}      draggable    Its Draggable instance (for bounds).
 * @param {number}      gravity      Downward accel, px/s².
 * @param {number}      bounce       Restitution 0-1.
 * @param {number}      speed        Launch speed, px/s.
 * @param {number}      angle        Launch angle, degrees.
 * @return {void}
 */
export function launchPhysics(
	gsapInstance,
	body,
	draggable,
	gravity,
	bounce,
	speed,
	angle
) {
	if ( speed < REST_SPEED && speed !== 0 ) {
		// Too slow to be worth animating further — leave it where it is.
		return;
	}

	let prevX = gsapInstance.getProperty( body, 'x' );
	let prevY = gsapInstance.getProperty( body, 'y' );
	let prevTime = performance.now();
	let relaunched = false;

	gsapInstance.killTweensOf( body );
	gsapInstance.to( body, {
		duration: 4,
		ease: 'none',
		physics2D: { velocity: speed, angle, gravity },
		onUpdate() {
			if ( relaunched ) {
				return;
			}

			const x = gsapInstance.getProperty( body, 'x' );
			const y = gsapInstance.getProperty( body, 'y' );
			const now = performance.now();
			const dt = Math.max( ( now - prevTime ) / 1000, 1 / 120 );

			let vx = ( x - prevX ) / dt;
			let vy = ( y - prevY ) / dt;
			let nextX = x;
			let nextY = y;
			let bounced = false;

			if ( x < draggable.minX ) {
				nextX = draggable.minX;
				vx = -vx * bounce;
				bounced = true;
			} else if ( x > draggable.maxX ) {
				nextX = draggable.maxX;
				vx = -vx * bounce;
				bounced = true;
			}

			if ( y < draggable.minY ) {
				nextY = draggable.minY;
				vy = -vy * bounce;
				bounced = true;
			} else if ( y > draggable.maxY ) {
				nextY = draggable.maxY;
				vy = -vy * bounce;
				bounced = true;
			}

			if ( bounced ) {
				relaunched = true;
				gsapInstance.set( body, { x: nextX, y: nextY } );
				launchPhysics(
					gsapInstance,
					body,
					draggable,
					gravity,
					bounce,
					Math.hypot( vx, vy ),
					( Math.atan2( vy, vx ) * 180 ) / Math.PI
				);
				return;
			}

			prevX = x;
			prevY = y;
			prevTime = now;
		},
	} );
}

/**
 * Release-to-settle: reads the release velocity Draggable/Inertia tracked
 * during the gesture (valid HERE — this is the genuine pointer-release
 * instant the API is designed for) and hands off to `launchPhysics()`.
 *
 * @param {Object}      gsapInstance Shared, registered gsap instance.
 * @param {HTMLElement} body         The released body.
 * @param {Object}      draggable    Its Draggable instance.
 * @param {number}      gravity      Downward accel, px/s².
 * @param {number}      bounce       Restitution 0-1.
 * @return {void}
 */
export function settle( gsapInstance, body, draggable, gravity, bounce ) {
	const vx = InertiaPlugin.getVelocity( body, 'x' );
	const vy = InertiaPlugin.getVelocity( body, 'y' );
	const speed = Math.hypot( vx, vy );
	const angle = ( Math.atan2( vy, vx ) * 180 ) / Math.PI;

	launchPhysics(
		gsapInstance,
		body,
		draggable,
		gravity,
		bounce,
		speed,
		angle
	);
}
