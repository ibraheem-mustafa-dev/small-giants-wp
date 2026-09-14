<?php
/**
 * Tests: Form subsystem file and class contracts.
 *
 * Validates the form subsystem at the source level without booting WordPress:
 *   - All form class files are present in includes/forms/.
 *   - All form PHP files pass PHP lint (no syntax errors).
 *   - Each class file declares the expected class name.
 *   - Expected public methods are declared (verified via source text search).
 *   - Security primitives (nonce, sanitisation, honeypot, rate limiting) present.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class FormSubmissionTest
 */
class FormSubmissionTest extends TestCase {

    /**
     * Root path to the forms subsystem.
     */
    private string $forms_dir;

    protected function setUp(): void {
        parent::setUp();
        $this->forms_dir = SGS_BLOCKS_PLUGIN_DIR . '/includes/forms';
    }

    // ── Data providers ────────────────────────────────────────────────────────

    /**
     * Map of class files → expected class name fragment they must declare.
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function form_class_provider(): array {
        return [
            'Form_Processor'  => [ 'class-form-processor.php',  'Form_Processor'  ],
            'Form_REST_API'   => [ 'class-form-rest-api.php',   'Form_REST_API'   ],
            'Form_Admin'      => [ 'class-form-admin.php',      'Form_Admin'      ],
            'Form_Activator'  => [ 'class-form-activator.php',  'Form_Activator'  ],
            'Form_Upload'     => [ 'class-form-upload.php',     'Form_Upload'     ],
            'Form_Privacy'    => [ 'class-form-privacy.php',    'Form_Privacy'    ],
        ];
    }

    /**
     * Method name fragments that must appear in class-form-processor.php.
     *
     * @return array<string, array{0: string}>
     */
    public static function processor_method_provider(): array {
        return [
            'process method'       => [ 'function process'       ],
            'sanitise_fields'      => [ 'function sanitise_fields' ],
            'get_client_ip method' => [ 'function get_client_ip' ],
        ];
    }

    /**
     * Method name fragments that must appear in class-form-rest-api.php (facade).
     *
     * After the R2 facade refactor, the three submission-logic methods
     * (handle_submit, check_rate_limit, validate_fields) live in
     * class-form-rest-submission.php. Only the facade's own orchestration
     * methods stay in class-form-rest-api.php.
     *
     * @return array<string, array{0: string}>
     */
    public static function rest_api_method_provider(): array {
        return [
            'register method'         => [ 'function register'         ],
            'register_routes method'  => [ 'function register_routes'  ],
            'verify_form_nonce'       => [ 'function verify_form_nonce'],
            'require_manage_options'  => [ 'function require_manage_options' ],
        ];
    }

    /**
     * Method name fragments that must appear in class-form-rest-submission.php.
     *
     * @return array<string, array{0: string}>
     */
    public static function rest_submission_method_provider(): array {
        return [
            'handle_submit method' => [ 'function handle_submit'    ],
            'check_rate_limit'     => [ 'function check_rate_limit' ],
            'validate_fields'      => [ 'function validate_fields'  ],
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Run PHP lint on a file.
     *
     * @param string $path Absolute file path.
     * @return string Lint output.
     */
    private function php_lint( string $path ): string {
        return shell_exec( 'php -l ' . escapeshellarg( $path ) . ' 2>&1' ) ?? '';
    }

    /**
     * Read a forms file or skip the test if it is missing.
     *
     * @param string $filename Basename (e.g. 'class-form-processor.php').
     * @return string File content.
     */
    private function read_forms_file( string $filename ): string {
        $path = $this->forms_dir . '/' . $filename;

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "{$filename} not found in includes/forms/." );
        }

        return (string) file_get_contents( $path );
    }

    // ── Directory & file presence ─────────────────────────────────────────────

    public function test_forms_directory_exists(): void {
        $this->assertDirectoryExists(
            $this->forms_dir,
            'includes/forms/ directory must exist.'
        );
    }

    public function test_field_render_helpers_exists(): void {
        $this->assertFileExists(
            $this->forms_dir . '/field-render-helpers.php',
            'includes/forms/field-render-helpers.php must exist.'
        );
    }

    // ── PHP syntax ────────────────────────────────────────────────────────────

    /**
     * @param string $filename   File basename.
     * @param string $class_name Expected class name (unused here).
     */
    #[DataProvider( 'form_class_provider' )]
    public function test_form_class_file_passes_lint( string $filename, string $class_name ): void {
        $path = $this->forms_dir . '/' . $filename;

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "{$filename} not found." );
        }

        $output = $this->php_lint( $path );

        $this->assertStringContainsString(
            'No syntax errors',
            $output,
            "{$filename} has PHP syntax errors:\n{$output}"
        );
    }

    public function test_field_render_helpers_passes_lint(): void {
        $path   = $this->forms_dir . '/field-render-helpers.php';
        $output = $this->php_lint( $path );

        $this->assertStringContainsString(
            'No syntax errors',
            $output,
            "field-render-helpers.php has PHP syntax errors:\n{$output}"
        );
    }

    // ── Class declarations ─────────────────────────────────────────────────────

    /**
     * @param string $filename   File basename.
     * @param string $class_name Expected class name.
     */
    #[DataProvider( 'form_class_provider' )]
    public function test_form_class_is_declared( string $filename, string $class_name ): void {
        $content = $this->read_forms_file( $filename );

        $this->assertStringContainsString(
            "class {$class_name}",
            $content,
            "{$filename} must declare class {$class_name}."
        );
    }

    // ── Form_Processor method declarations ────────────────────────────────────

    /**
     * @param string $method_fragment Substring that must appear in the source.
     */
    #[DataProvider( 'processor_method_provider' )]
    public function test_form_processor_declares_method( string $method_fragment ): void {
        $content = $this->read_forms_file( 'class-form-processor.php' );

        $this->assertStringContainsString(
            $method_fragment,
            $content,
            "class-form-processor.php must declare '{$method_fragment}'."
        );
    }

    // ── Form_REST_API method declarations (facade) ────────────────────────────

    /**
     * @param string $method_fragment Substring that must appear in the source.
     */
    #[DataProvider( 'rest_api_method_provider' )]
    public function test_form_rest_api_declares_method( string $method_fragment ): void {
        $content = $this->read_forms_file( 'class-form-rest-api.php' );

        $this->assertStringContainsString(
            $method_fragment,
            $content,
            "class-form-rest-api.php must declare '{$method_fragment}'."
        );
    }

    // ── Form_REST_Submission method declarations ──────────────────────────────

    /**
     * Submission-logic methods live in class-form-rest-submission.php after
     * the R2 facade refactor.
     *
     * @param string $method_fragment Substring that must appear in the source.
     */
    #[DataProvider( 'rest_submission_method_provider' )]
    public function test_form_rest_submission_declares_method( string $method_fragment ): void {
        $content = $this->read_forms_file( 'class-form-rest-submission.php' );

        $this->assertStringContainsString(
            $method_fragment,
            $content,
            "class-form-rest-submission.php must declare '{$method_fragment}'."
        );
    }

    // ── Security contracts ────────────────────────────────────────────────────

    /**
     * REST API must reference nonce verification (CSRF protection).
     */
    public function test_rest_api_references_nonce_verification(): void {
        $content = $this->read_forms_file( 'class-form-rest-api.php' );

        $this->assertTrue(
            str_contains( $content, 'wp_verify_nonce' ) || str_contains( $content, 'verify_form_nonce' ),
            'class-form-rest-api.php must reference nonce verification.'
        );
    }

    /**
     * Form processor must use sanitisation functions.
     */
    public function test_form_processor_references_sanitisation(): void {
        $content = $this->read_forms_file( 'class-form-processor.php' );

        $this->assertTrue(
            str_contains( $content, 'sanitise' ) || str_contains( $content, 'sanitize' ),
            'class-form-processor.php must use sanitise/sanitize functions.'
        );
    }

    /**
     * REST API must declare the sgs-forms REST namespace.
     */
    public function test_rest_api_declares_namespace(): void {
        $content = $this->read_forms_file( 'class-form-rest-api.php' );

        $this->assertStringContainsString(
            'sgs-forms',
            $content,
            'class-form-rest-api.php must declare the sgs-forms REST namespace.'
        );
    }

    /**
     * REST API must implement honeypot spam protection.
     */
    public function test_rest_api_implements_honeypot(): void {
        $content = $this->read_forms_file( 'class-form-rest-api.php' );

        $this->assertStringContainsString(
            'honeypot',
            $content,
            'class-form-rest-api.php must implement honeypot spam protection.'
        );
    }

    /**
     * Rate-limiting logic lives in class-form-rest-submission.php after the
     * R2 facade refactor. The facade delegates to it via check_rate_limit().
     */
    public function test_rest_api_implements_rate_limiting(): void {
        $content = $this->read_forms_file( 'class-form-rest-submission.php' );

        $this->assertStringContainsString(
            'check_rate_limit',
            $content,
            'class-form-rest-submission.php must implement rate limiting via check_rate_limit().'
        );
    }

    /**
     * Form activator must create the database table (DB-backed submissions).
     */
    public function test_form_activator_references_database_table(): void {
        $content = $this->read_forms_file( 'class-form-activator.php' );

        $this->assertTrue(
            str_contains( $content, 'sgs_form_submissions' ) || str_contains( $content, 'CREATE TABLE' ),
            'class-form-activator.php must create/reference the form submissions DB table.'
        );
    }

    // ── FR-42-0: fail-closed requireLogin resolution ──────────────────────────

    /**
     * Regression control for the live fail-open defect: an unresolvable form-config
     * transient must never silently coerce to `requireLogin = false`. The old code
     * read `is_array( $form_config ) ? ... : false` — a ternary whose false branch
     * IS the vulnerability. Assert that shape is gone.
     */
    public function test_handle_submit_does_not_default_require_login_to_false(): void {
        $content = $this->read_forms_file( 'class-form-rest-submission.php' );

        $this->assertStringNotContainsString(
            "is_array( \$form_config ) ? (bool) ( \$form_config['requireLogin'] ?? false ) : false",
            $content,
            'class-form-rest-submission.php must not silently default requireLogin to false when the form-config transient is unresolvable (FR-42-0 fail-open regression).'
        );
    }

    /**
     * Positive control: the fix refuses the submission (503) when the config
     * transient does not resolve to an array, before requireLogin/rateLimit are
     * ever read from it.
     */
    public function test_handle_submit_refuses_when_form_config_unresolvable(): void {
        $content = $this->read_forms_file( 'class-form-rest-submission.php' );

        $this->assertStringContainsString(
            'if ( ! is_array( $form_config ) )',
            $content,
            'class-form-rest-submission.php must guard on an unresolvable form-config transient.'
        );

        $this->assertStringContainsString(
            "'status' => 503",
            $content,
            'class-form-rest-submission.php must refuse with a 503 status when form config cannot be resolved (FR-42-0).'
        );

        $this->assertStringContainsString(
            'form_config_unavailable',
            $content,
            "class-form-rest-submission.php must return the 'form_config_unavailable' WP_Error code on unresolved config."
        );
    }

    /**
     * The unresolved-config guard must run before requireLogin/rateLimit are read
     * from $form_config, so neither value is ever computed from a non-array.
     */
    public function test_form_config_guard_precedes_require_login_read(): void {
        $content = $this->read_forms_file( 'class-form-rest-submission.php' );

        $guard_pos          = strpos( $content, 'if ( ! is_array( $form_config ) )' );
        $require_login_pos  = strpos( $content, '$require_login  = (bool)' );

        $this->assertNotFalse( $guard_pos, 'Unresolved-config guard not found.' );
        $this->assertNotFalse( $require_login_pos, 'requireLogin read not found.' );
        $this->assertLessThan(
            $require_login_pos,
            $guard_pos,
            'The unresolved-config guard must run before requireLogin is read from $form_config.'
        );
    }
}
