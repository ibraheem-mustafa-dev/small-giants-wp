<?php
/**
 * The old entrance effect table (Spec 38A §13.1, FR-38A-31): data only, read by `Sgs_Motion_Legacy_Entrance`, which
 * holds the rules that turn one block's old attributes into an `entrance.base` layer.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Legacy_Effects
 */
final class Sgs_Motion_Legacy_Effects {

	/**
	 * Every effect the old list offered, by effect name. `preset` is the `motion_presets` slug (null when none is seeded); `axis`,
	 * `sign` and `fixed` describe the travel (`fixed` is the px the player used when the stored distance was 0, and
	 * `token` whether the travel points at the shared distance token when no distance is stored). The preset values are
	 * compared with `scripts/data/motion-presets.json` by the standalone test.
	 */
	const TABLE = array(
		'fade-up'     => array(
			'preset' => 'entrance-fade-up',
			'from'   => array(
				'opacity'    => 0,
				'translateY' => 'token:entrance.distance',
			),
			'to'     => array(
				'opacity'    => 1,
				'translateY' => 0,
			),
			'travel' => array( 'translateY', 1, 30, true ),
		),
		'fade-down'   => array(
			'preset' => 'entrance-fade-down',
			'from'   => array(
				'opacity'    => 0,
				'translateY' => '-token:entrance.distance',
			),
			'to'     => array(
				'opacity'    => 1,
				'translateY' => 0,
			),
			'travel' => array( 'translateY', -1, 30, true ),
		),
		'fade-in'     => array(
			'preset' => 'entrance-fade-in',
			'from'   => array( 'opacity' => 0 ),
			'to'     => array( 'opacity' => 1 ),
			'travel' => null,
		),
		'fade-left'   => array(
			'preset' => 'entrance-fade-left',
			'from'   => array(
				'opacity'    => 0,
				'translateX' => 'token:entrance.distance',
			),
			'to'     => array(
				'opacity'    => 1,
				'translateX' => 0,
			),
			'travel' => array( 'translateX', 1, 30, true ),
		),
		'fade-right'  => array(
			'preset' => 'entrance-fade-right',
			'from'   => array(
				'opacity'    => 0,
				'translateX' => '-token:entrance.distance',
			),
			'to'     => array(
				'opacity'    => 1,
				'translateX' => 0,
			),
			'travel' => array( 'translateX', -1, 30, true ),
		),
		'slide-up'    => array(
			'preset' => 'entrance-slide-up',
			'from'   => array( 'translateY' => 100 ),
			'to'     => array( 'translateY' => 0 ),
			'travel' => array( 'translateY', 1, 100, false ),
		),
		'slide-down'  => array(
			'preset' => 'entrance-slide-down',
			'from'   => array( 'translateY' => -100 ),
			'to'     => array( 'translateY' => 0 ),
			'travel' => array( 'translateY', -1, 100, false ),
		),
		'slide-left'  => array(
			'preset' => 'entrance-slide-left',
			'from'   => array( 'translateX' => -100 ),
			'to'     => array( 'translateX' => 0 ),
			'travel' => array( 'translateX', -1, 100, false ),
		),
		'slide-right' => array(
			'preset' => 'entrance-slide-right',
			'from'   => array( 'translateX' => 100 ),
			'to'     => array( 'translateX' => 0 ),
			'travel' => array( 'translateX', 1, 100, false ),
		),
		'scale-in'    => array(
			'preset' => 'entrance-scale-in',
			'from'   => array(
				'opacity' => 0,
				'scale'   => 0.9,
			),
			'to'     => array(
				'opacity' => 1,
				'scale'   => 1,
			),
			'travel' => null,
		),
		'scale-out'   => array(
			'preset' => 'entrance-scale-out',
			'from'   => array(
				'opacity' => 0,
				'scale'   => 1.1,
			),
			'to'     => array(
				'opacity' => 1,
				'scale'   => 1,
			),
			'travel' => null,
		),
		'rotate-in'   => array(
			'preset' => 'entrance-rotate-in',
			'from'   => array(
				'opacity' => 0,
				'rotate'  => -10,
			),
			'to'     => array(
				'opacity' => 1,
				'rotate'  => 0,
			),
			'travel' => null,
		),
		'flip-in'     => array(
			'preset'      => null,
			'from'        => array(
				'opacity' => 0,
				'rotateX' => 30,
			),
			'to'          => array(
				'opacity' => 1,
				'rotateX' => 0,
			),
			'perspective' => 600,
			'travel'      => null,
		),
		'blur-in'     => array(
			'preset' => 'entrance-blur-in',
			'from'   => array(
				'opacity' => 0,
				'blur'    => 8,
			),
			'to'     => array(
				'opacity' => 1,
				'blur'    => 0,
			),
			'travel' => null,
		),
		'bounce-in'   => array(
			'preset' => 'entrance-bounce-in',
			'from'   => array(
				'opacity' => 0,
				'scale'   => 0.3,
			),
			'to'     => array(
				'opacity' => 1,
				'scale'   => 1,
			),
			'easing' => 'token:easing.spring-bouncy',
			'travel' => null,
		),
		'reveal-up'   => array(
			'preset' => 'entrance-reveal-up',
			'from'   => array( 'clip' => 100 ),
			'to'     => array( 'clip' => 0 ),
			'travel' => null,
		),
	);
}
