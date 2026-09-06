<?php
/**
 * Plugin Name: Andika Movie Production (Extension)
 * Plugin URI: https://example.com/andika-movie-production
 * Description: Official companion extension for Andika. Screenplay formatting intuition, scene stripboard, cast tracker, props/wardrobe breakdown, and PDF screenplay import.
 * Version: 1.0.0
 * Author: Joel Mwakasege
 * Author URI: https://example.com
 * License: GPL v2 or later
 * Text Domain: andika-movie-production
 * Requires Plugins: andika
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( defined( 'ANDIKA_MOVIE_PRODUCTION_LOADED' ) ) {
    return;
}
define( 'ANDIKA_MOVIE_PRODUCTION_LOADED', true );

if ( ! defined( 'ANDIKA_MP_VERSION' ) ) {
    define( 'ANDIKA_MP_VERSION', '1.0.0' );
}
if ( ! defined( 'ANDIKA_MP_PATH' ) ) {
    define( 'ANDIKA_MP_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'ANDIKA_MP_URL' ) ) {
    define( 'ANDIKA_MP_URL', plugin_dir_url( __FILE__ ) );
}

/**
 * Register extension with Andika Extension Registry
 */
add_filter( 'andika_registered_extensions', function ( $extensions ) {
    $plugin_dir    = defined( 'WP_PLUGIN_DIR' ) ? WP_PLUGIN_DIR : dirname( dirname( __FILE__ ) );
    $standalone_f  = $plugin_dir . '/andika-movie-production/andika-movie-production.php';
    $is_standalone = file_exists( $standalone_f );

    $existing = isset( $extensions['movie-production'] ) ? $extensions['movie-production'] : array();
    $extensions['movie-production'] = array_merge( $existing, array(
        'id'                   => 'movie-production',
        'name'                 => __( 'Movie Production & Script Breakdown', 'andika-movie-production' ),
        'description'          => __( 'Screenplay format intuition, scene stripboard, speaking cast tracker, production breakdown, and PDF screenplay import.', 'andika-movie-production' ),
        'version'              => ANDIKA_MP_VERSION,
        'plugin_file'          => plugin_basename( __FILE__ ),
        'is_standalone'        => $is_standalone,
        'is_bundled'           => ! $is_standalone,
        'can_install_as_plugin'=> ! $is_standalone,
    ) );
    return $extensions;
} );

/**
 * Admin notice when Andika is not active
 */
add_action( 'admin_notices', function () {
    if ( ! function_exists( 'script_writer_is_extension_enabled' ) ) {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p>
                <strong><?php esc_html_e( 'Andika Movie Production', 'andika-movie-production' ); ?></strong> &mdash;
                <?php esc_html_e( 'This is an official companion extension for Andika. Please install and activate the core Andika plugin to enable screenplay features.', 'andika-movie-production' ); ?>
            </p>
        </div>
        <?php
    }
} );

/**
 * Add Plugin Row Meta in wp-admin/plugins.php
 */
add_filter( 'plugin_row_meta', function ( $meta, $file ) {
    if ( $file === plugin_basename( __FILE__ ) ) {
        $meta[] = '<span style="color:#3b82f6; font-weight:600;">' . esc_html__( 'Extension for Andika', 'andika-movie-production' ) . '</span>';
    }
    return $meta;
}, 10, 2 );

/**
 * Add Plugin Action Links in wp-admin/plugins.php
 */
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
    if ( function_exists( 'script_writer_get_app_url' ) ) {
        $andika_url = script_writer_get_app_url();
        $links['open_andika'] = '<a href="' . esc_url( $andika_url ) . '" style="color:#10b981; font-weight:600;">' . esc_html__( 'Open in Andika', 'andika-movie-production' ) . '</a>';
    }
    return $links;
} );

/**
 * Helper to check if Movie Production is enabled in Andika
 */
function andika_mp_is_enabled() {
    if ( function_exists( 'script_writer_is_extension_enabled' ) ) {
        return script_writer_is_extension_enabled( 'movie-production' );
    }
    return false;
}

/**
 * Fast-path inlining of Movie Production CSS into Andika Canvas Head
 */
add_action( 'andika_canvas_head', function () {
    if ( ! andika_mp_is_enabled() ) {
        return;
    }
    $css_file = ANDIKA_MP_PATH . 'assets/production.css';
    if ( file_exists( $css_file ) ) {
        echo '<style id="andika-movie-production-css">' . PHP_EOL;
        readfile( $css_file );
        echo PHP_EOL . '</style>' . PHP_EOL;
    }
} );

/**
 * Fast-path inlining of Movie Production JavaScript into Andika Canvas Footer
 */
add_action( 'andika_canvas_footer', function () {
    if ( ! andika_mp_is_enabled() ) {
        return;
    }
    $js_file = ANDIKA_MP_PATH . 'assets/production.js';
    if ( file_exists( $js_file ) ) {
        echo '<script id="andika-movie-production-js">' . PHP_EOL;
        readfile( $js_file );
        echo PHP_EOL . '</script>' . PHP_EOL;
    }
} );

/**
 * Add production metadata and config to Andika client data
 */
add_filter( 'andika_config_data', function ( $config ) {
    $is_enabled = andika_mp_is_enabled();
    $config['movieProduction'] = array(
        'enabled'       => $is_enabled,
        'version'       => ANDIKA_MP_VERSION,
        'standardLines' => 55, // 55 lines per screenplay page
        'dummyTitle'    => 'Midnight Protocol',
        'dummyScript'   => ( $is_enabled && function_exists( 'script_writer_get_default_dummy_script' ) ) ? script_writer_get_default_dummy_script() : '',
    );
    return $config;
} );

/**
 * Standard WordPress enqueues (fallback for WP Admin / classic page templates)
 */
add_action( 'wp_enqueue_scripts', 'andika_mp_enqueue_assets' );
add_action( 'admin_enqueue_scripts', 'andika_mp_enqueue_assets' );

function andika_mp_enqueue_assets() {
    if ( ! andika_mp_is_enabled() ) {
        return;
    }
    if ( ! empty( $_GET['page'] ) && strpos( $_GET['page'], 'script-writer' ) === 0 ) {
        wp_enqueue_style( 'andika-movie-production', ANDIKA_MP_URL . 'assets/production.css', array(), ANDIKA_MP_VERSION );
        wp_enqueue_script( 'andika-movie-production', ANDIKA_MP_URL . 'assets/production.js', array(), ANDIKA_MP_VERSION, true );
    }
}
