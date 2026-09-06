<?php
/**
 * Plugin Name: Andika
 * Plugin URI: https://github.com/joel-mwakasege/andika
 * Description: A distraction-free writing studio for scripts, screenplays, and documents with typography, distraction-free canvas, community sharing, PDF import/export, and modular extension engine. "Andika" is the Swahili word for "write".
 * Version: 1.0.0
 * Author: Joel Mwakasege
 * Author URI: https://github.com/joel-mwakasege
 * License: GPL v2 or later
 * Text Domain: andika
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// =============================================================================
// 1. HIGH-PERFORMANCE BOOTSTRAPPING & LOCAL DEV OPTIMIZATIONS
// =============================================================================

// Prevent WordPress from hanging on loopback cron requests in local Docker
if ( ! defined( 'DISABLE_WP_CRON' ) ) {
    define( 'DISABLE_WP_CRON', true );
}

// Eliminate slow external HTTP calls that cause 3-10 second timeouts in Docker containers
add_filter( 'pre_site_transient_update_core', '__return_null' );
add_filter( 'pre_site_transient_update_plugins', '__return_null' );
add_filter( 'pre_site_transient_update_themes', '__return_null' );
add_filter( 'pre_site_transient_update_translations', '__return_null' );

add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
    // Short-circuit all external wordpress.org checks in local development
    if ( strpos( $url, 'api.wordpress.org' ) !== false || strpos( $url, 'wordpress.org' ) !== false ) {
        return new WP_Error( 'http_request_blocked', 'Blocked in local dev for instant performance.' );
    }
    return $pre;
}, 10, 3 );

add_filter( 'http_request_timeout', function () {
    return 5;
} );

// =============================================================================
// 2. ULTRA-FAST STANDALONE CANVAS BOOTSTRAP & NON-ADMIN SHIELDING
// =============================================================================

/**
 * Dynamic Space & Platform Settings Helpers
 */
function script_writer_get_space_name() {
    $name = get_option( 'script_writer_space_name', '' );
    return ! empty( $name ) ? $name : __( 'Andika', 'starter-plugin' );
}

function script_writer_get_space_about() {
    $about = get_option( 'script_writer_space_about', '' );
    return ! empty( $about ) ? $about : __( 'Writing Studio & Community', 'starter-plugin' );
}

function script_writer_get_space_slug() {
    $slug = get_option( 'script_writer_space_slug', '' );
    $slug = sanitize_title_with_dashes( $slug );
    return ! empty( $slug ) ? $slug : 'andika';
}

function script_writer_get_space_description() {
    $desc = get_option( 'script_writer_space_description', '' );
    return ! empty( $desc ) ? $desc : __( 'Write freely as a person. Create together in community.', 'starter-plugin' );
}

function script_writer_get_login_label() {
    $label = get_option( 'script_writer_login_label', '' );
    return ! empty( $label ) ? $label : script_writer_get_space_name();
}

function script_writer_get_login_about() {
    $about = get_option( 'script_writer_login_about', '' );
    if ( ! empty( $about ) ) {
        return $about;
    }
    return script_writer_get_space_description();
}

/**
 * Return clean standalone URL for the application based on dynamic slug
 */
function script_writer_get_app_url( $args = array() ) {
    $slug = script_writer_get_space_slug();
    $url  = home_url( '/?' . $slug . '=1' );
    if ( ! empty( $args ) ) {
        $url = add_query_arg( $args, $url );
    }
    return $url;
}

/**
 * Extension Management & Modular Expansion Helpers
 */
function script_writer_get_enabled_extensions() {
    $defaults = array(
        'movie-production' => true,
    );
    $enabled = get_option( 'script_writer_enabled_extensions', $defaults );
    if ( ! is_array( $enabled ) ) {
        $enabled = $defaults;
    }
    if ( empty( $enabled['movie-production'] ) ) {
        $enabled['movie-production'] = true;
        update_option( 'script_writer_enabled_extensions', $enabled );
    }
    return $enabled;
}

function script_writer_is_extension_enabled( $extension_id ) {
    $enabled = script_writer_get_enabled_extensions();
    return ! empty( $enabled[ $extension_id ] );
}

function script_writer_bootstrap_companion_extensions() {
    static $bootstrapped = false;
    if ( $bootstrapped ) return;
    $bootstrapped = true;

    $plugin_dir    = defined( 'WP_PLUGIN_DIR' ) ? WP_PLUGIN_DIR : dirname( dirname( __FILE__ ) );
    $mp_standalone = $plugin_dir . '/andika-movie-production/andika-movie-production.php';
    $mp_bundled    = plugin_dir_path( __FILE__ ) . 'extensions/andika-movie-production/andika-movie-production.php';

    if ( file_exists( $mp_standalone ) ) {
        if ( ! function_exists( 'is_plugin_active' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        require_once $mp_standalone;
    } elseif ( file_exists( $mp_bundled ) ) {
        require_once $mp_bundled;
    }
}
add_action( 'plugins_loaded', 'script_writer_bootstrap_companion_extensions', 5 );
add_action( 'init', 'script_writer_bootstrap_companion_extensions', 1 );

function script_writer_get_available_companion_extensions() {
    $plugin_dir    = defined( 'WP_PLUGIN_DIR' ) ? WP_PLUGIN_DIR : dirname( dirname( __FILE__ ) );
    $available     = array();

    // Discover Movie Production companion extension
    $mp_standalone = $plugin_dir . '/andika-movie-production/andika-movie-production.php';
    $mp_bundled    = plugin_dir_path( __FILE__ ) . 'extensions/andika-movie-production/andika-movie-production.php';

    $is_standalone_installed = file_exists( $mp_standalone );
    $is_bundled_available    = file_exists( $mp_bundled );

    if ( $is_standalone_installed || $is_bundled_available ) {
        $available['movie-production'] = array(
            'id'                   => 'movie-production',
            'name'                 => __( 'Movie Production & Script Breakdown', 'starter-plugin' ),
            'description'          => __( 'Screenplay format intuition, scene stripboard, speaking cast tracker, production breakdown, and PDF screenplay import.', 'starter-plugin' ),
            'version'              => defined( 'ANDIKA_MP_VERSION' ) ? ANDIKA_MP_VERSION : '1.0.0',
            'file'                 => $is_standalone_installed ? $mp_standalone : $mp_bundled,
            'is_standalone'        => $is_standalone_installed,
            'is_bundled'           => ! $is_standalone_installed && $is_bundled_available,
            'can_install_as_plugin'=> ( ! $is_standalone_installed && $is_bundled_available ),
        );
    }

    return apply_filters( 'andika_registered_extensions', $available );
}

/**
 * Return rich ~500-word dummy screenplay with full production elements
 */
function script_writer_get_default_dummy_script() {
    return "EXT. RAIN-SLICKED ALLEY - NIGHT\n\n"
        . "Heavy rain hammers the asphalt. Neon reflections shimmer in oily puddles. Steam rises from an iron storm grate.\n\n"
        . "A black sedan idles at the curb, wipers slapping in erratic rhythm. Sirens wail faintly in the distance.\n\n"
        . "DETECTIVE MARCUS VANCE (40s, drenched trench coat, weary eyes) steps out of the shadows. He checks an antique brass pocket watch, then turns his collar up against the biting cold wind.\n\n"
        . "MARCUS\n"
        . "(into collar mic)\n"
        . "I'm at the drop point. Chen, talk to me. Do you have eyes on the perimeter?\n\n"
        . "OFFICER CHEN (O.S.)\n"
        . "(through earpiece, static-laced)\n"
        . "Negative, Detective. Thermal sensors are blind through this downpour. You're flying solo tonight.\n\n"
        . "Marcus clicks off the comm. He pulls a heavy steel revolver from beneath his wet jacket, checks the cylinder, and snaps it shut with a sharp metallic click.\n\n"
        . "Footsteps splash in the alley behind him. Marcus whips around, revolver raised.\n\n"
        . "ELENA ROSTOVA (30s, sharp leather jacket, bruised knuckles) emerges from a fire escape alcove, clutching a scuffed aluminum briefcase tightly against her chest.\n\n"
        . "MARCUS\n"
        . "(lowering gun slightly)\n"
        . "You took your sweet time, Rostova. I was about to call the county coroner.\n\n"
        . "ELENA\n"
        . "Traffic was murder. And your former friends at Precinct Five tried to box my car in near the harbor bridge.\n\n"
        . "MARCUS\n"
        . "They aren't my friends anymore. You have the drive?\n\n"
        . "Elena unlatches the aluminum briefcase with trembling fingers. Inside rests an illuminated, military-grade encrypted flash drive glowing faint crimson in the dark.\n\n"
        . "ELENA\n"
        . "(voice trembling)\n"
        . "Everything is on here. The shipping manifest, offshore accounts, and the names of every compromised field agent. If they find me with this, I'm a ghost.\n\n"
        . "MARCUS\n"
        . "(stern)\n"
        . "Not while I'm breathing. Hand it over.\n\n"
        . "A sudden blinding beam of headlights washes over them. Tires screech violently against the wet pavement.\n\n"
        . "INT. ABANDONED DOCK WAREHOUSE - CONTINUOUS\n\n"
        . "Marcus shoves Elena through a rusted iron doorway just as automatic gunfire erupts outside, shattering brick and industrial glass.\n\n"
        . "They crash hard onto the damp concrete floor. The cavernous room smells of stagnant salt water and diesel fuel. High above, rain patters rhythmically against the corrugated metal roof.\n\n"
        . "ELENA\n"
        . "(gasping for air)\n"
        . "Who the hell are they?!\n\n"
        . "MARCUS\n"
        . "(reloading revolver)\n"
        . "The cleanup crew. Stay down and keep that briefcase shut.\n\n"
        . "Elena cowers behind an overturned forklift. Marcus peers cautiously around a massive steel pillar.\n\n"
        . "Shadows move silently along the high catwalk. A crimson laser sight dances across Marcus's chest.\n\n"
        . "MARCUS\n"
        . "(to himself)\n"
        . "Chen wasn't blind. Chen sold us out.\n\n"
        . "EXT. HARBOR DOCKS - MOMENTS LATER\n\n"
        . "Marcus kicks open the rear heavy fire door into the open air. The dark harbor waters churn violently below the wooden pier.\n\n"
        . "A black patrol car speeds along the dock edge, siren pulsing once, headlights cutting through the thick sea mist. The vehicle skids sideways, blocking their escape path.\n\n"
        . "OFFICER CHEN steps out of the cruiser, holding a sleek 9mm pistol pointed squarely at Marcus. Rain streams down Chen's visor.\n\n"
        . "CHEN\n"
        . "Hand over the briefcase, Marcus. It doesn't have to end in the water. We can both walk away rich tonight.\n\n"
        . "MARCUS\n"
        . "(cold grin)\n"
        . "You always were terrible at math, Chen.\n\n"
        . "Marcus triggers a tactical flash grenade from his coat pocket. A blinding white flash illuminates the docks followed by a deafening concussion.";
}

/**
 * Get or create persistent sample screenplay post so it never disappears on + New writing
 */
function script_writer_get_or_create_sample_script( $user_id = 0 ) {
    $args = array(
        'post_type'      => 'script',
        'post_status'    => array( 'publish', 'draft' ),
        'posts_per_page' => 1,
        'meta_query'     => array(
            array(
                'key'   => '_script_writer_is_sample',
                'value' => 'midnight-protocol',
            ),
        ),
    );
    if ( $user_id > 0 ) {
        $args['author'] = $user_id;
    }
    $posts = get_posts( $args );
    if ( ! empty( $posts ) ) {
        return $posts[0]->ID;
    }

    $sample_content = script_writer_get_default_dummy_script();
    $block_markup   = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $sample_content ) . '} -->'
                    . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                    . esc_html( $sample_content )
                    . '</pre></div><!-- /wp:script-writer/editor -->';

    $author_id = $user_id > 0 ? $user_id : ( is_user_logged_in() ? get_current_user_id() : 1 );
    $new_id    = wp_insert_post( array(
        'post_title'   => 'Midnight Protocol',
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $author_id,
    ) );

    if ( ! is_wp_error( $new_id ) ) {
        update_post_meta( $new_id, '_script_writer_raw_content', $sample_content );
        update_post_meta( $new_id, '_script_writer_visibility', 'private' );
        update_post_meta( $new_id, '_script_writer_is_sample', 'midnight-protocol' );
        return $new_id;
    }

    return 0;
}

// Enable open registration for the writer community
add_filter( 'pre_option_users_can_register', '__return_true' );

// Completely suppress the WordPress Admin Bar for non-administrators
add_action( 'after_setup_theme', function () {
    if ( ! current_user_can( 'manage_options' ) ) {
        show_admin_bar( false );
    }
} );
add_filter( 'show_admin_bar', function ( $show ) {
    return current_user_can( 'manage_options' ) ? $show : false;
} );

// Register front-end standalone route dynamically based on configured slug
add_action( 'init', function () {
    $slug = script_writer_get_space_slug();
    add_rewrite_rule( '^' . preg_quote( $slug, '/' ) . '/?$', 'index.php?andika_app=1', 'top' );
    if ( $slug !== 'andika' ) {
        add_rewrite_rule( '^andika/?$', 'index.php?andika_app=1', 'top' );
    }
    add_rewrite_rule( '^dashboard/?$', 'index.php?andika_app=1&view=dashboard', 'top' );
    add_rewrite_tag( '%andika_app%', '([^&]+)' );
    add_rewrite_tag( '%view%', '([^&]+)' );
} );

// Front-end Standalone Canvas & Root Entry Handling
add_action( 'template_redirect', function () {
    $slug = script_writer_get_space_slug();

    // 1. Standalone writing studio canvas matching:
    // - Dynamic custom slug (?storyforge=1 or /storyforge/)
    // - Default plugin slug (?andika=1 or /andika/)
    // - Explicit views (?view=dashboard, ?view=editor, ?view=auth, /dashboard/)
    // - Direct query parameters (?dashboard=1, ?script_id=123)
    // - Front page / site root (/) for all users
    if (
        get_query_var( 'andika_app' ) ||
        isset( $_GET[ $slug ] ) ||
        isset( $_GET['andika'] ) ||
        isset( $_GET['view'] ) ||
        isset( $_GET['dashboard'] ) ||
        isset( $_GET['script_id'] ) ||
        is_front_page() ||
        is_home()
    ) {
        script_writer_render_fast_standalone_canvas();
        exit;
    }
} );

// Admin Bootstrap & Non-Admin Enclosure
add_action( 'admin_init', function () {
    // 1. Fast Standalone Canvas for the Andika screen (zero wp-admin chrome)
    if ( isset( $_GET['page'] ) && ( $_GET['page'] === 'script-writer' || strpos( $_GET['page'], 'script-writer' ) === 0 ) ) {
        script_writer_render_fast_standalone_canvas();
        exit;
    }

    // 2. If user is logged in but NOT an administrator, strictly block all wp-admin access
    if ( is_user_logged_in() && ! current_user_can( 'manage_options' ) && ! wp_doing_ajax() ) {
        wp_safe_redirect( script_writer_get_app_url( array( 'view' => 'dashboard' ) ) );
        exit;
    }
} );

// Send users directly to the Writing Space Dashboard after any login
add_filter( 'login_redirect', function ( $redirect_to, $request, $user ) {
    if ( is_a( $user, 'WP_User' ) ) {
        // If an admin explicitly requested wp-admin during login, honor that
        if ( in_array( 'administrator', (array) $user->roles, true ) && ! empty( $request ) && strpos( $request, 'wp-admin' ) !== false ) {
            return $redirect_to;
        }
        return script_writer_get_app_url( array( 'view' => 'dashboard' ) );
    }
    return $redirect_to;
}, 10, 3 );

// =============================================================================
// 3. REGISTER CUSTOM POST TYPE: WRITINGS
// =============================================================================

add_action( 'init', function () {
    $labels = array(
        'name'               => _x( 'Writings', 'post type general name', 'starter-plugin' ),
        'singular_name'      => _x( 'Writing', 'post type singular name', 'starter-plugin' ),
        'menu_name'          => script_writer_get_space_name(),
        'name_admin_bar'     => _x( 'Writing', 'add new on admin bar', 'starter-plugin' ),
        'add_new'            => _x( 'Add New', 'writing', 'starter-plugin' ),
        'add_new_item'       => __( 'Add New Writing', 'starter-plugin' ),
        'new_item'           => __( 'New Writing', 'starter-plugin' ),
        'edit_item'          => __( 'Edit Writing', 'starter-plugin' ),
        'view_item'          => __( 'View Writing', 'starter-plugin' ),
        'all_items'          => __( 'All Writings', 'starter-plugin' ),
        'search_items'       => __( 'Search Writings', 'starter-plugin' ),
        'not_found'          => __( 'No writings found.', 'starter-plugin' ),
        'not_found_in_trash' => __( 'No writings found in Trash.', 'starter-plugin' ),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => false,
        'query_var'          => true,
        'rewrite'            => array( 'slug' => 'scripts' ),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => 4,
        'show_in_rest'       => true,
        'supports'           => array( 'title', 'editor', 'custom-fields', 'revisions' ),
        'template'           => array(
            array( 'script-writer/editor' ),
        ),
        'template_lock'      => false,
    );

    register_post_type( 'script', $args );
} );

// =============================================================================
// 4. REGISTER GUTENBERG & FSE BLOCK: script-writer/editor
// =============================================================================

add_action( 'init', function () {
    $plugin_dir = plugin_dir_path( __FILE__ );
    $plugin_url = plugin_dir_url( __FILE__ );

    wp_register_script(
        'script-writer-block-editor',
        $plugin_url . 'block.js',
        array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
        '1.0.0',
        true
    );

    wp_register_style(
        'script-writer-block-editor-style',
        $plugin_url . 'editor.css',
        array(),
        '1.0.0'
    );

    wp_register_style(
        'script-writer-block-style',
        $plugin_url . 'style.css',
        array(),
        '1.0.0'
    );

    register_block_type( $plugin_dir . 'block.json', array(
        'editor_script' => 'script-writer-block-editor',
        'editor_style'  => 'script-writer-block-editor-style',
        'style'         => 'script-writer-block-style',
    ) );
} );

// =============================================================================
// 5. REGISTER ADMIN MENU
// =============================================================================

add_action( 'admin_menu', function () {
    add_menu_page(
        script_writer_get_space_name(),
        script_writer_get_space_name(),
        'read',
        'script-writer',
        'script_writer_render_screen',
        'dashicons-editor-code',
        3
    );

    add_submenu_page(
        'script-writer',
        __( 'Write', 'starter-plugin' ),
        __( 'Write', 'starter-plugin' ),
        'read',
        'script-writer',
        'script_writer_render_screen'
    );

    add_submenu_page(
        'script-writer',
        __( 'All Writings Dashboard', 'starter-plugin' ),
        __( 'All Writings Dashboard', 'starter-plugin' ),
        'read',
        'script-writer&view=dashboard',
        'script_writer_render_screen'
    );

    add_submenu_page(
        'script-writer',
        __( 'All Writings', 'starter-plugin' ),
        __( 'All Writings', 'starter-plugin' ),
        'edit_posts',
        'edit.php?post_type=script'
    );
} );

// =============================================================================
// 6. HIGH-PERFORMANCE DATA RETRIEVAL HELPER (Personal Workspace & Community)
// =============================================================================

function script_writer_get_library_data( $user_id = 0 ) {
    if ( ! $user_id && is_user_logged_in() ) {
        $user_id = get_current_user_id();
    }

    // 1. Personal writings for the current user
    $my_scripts   = array();
    $total_words  = 0;
    $total_lines  = 0;

    if ( $user_id > 0 ) {
        if ( script_writer_is_extension_enabled( 'movie-production' ) ) {
            script_writer_get_or_create_sample_script( $user_id );
        }
        $my_posts = get_posts( array(
            'post_type'              => 'script',
            'post_status'            => array( 'publish', 'draft' ),
            'author'                 => $user_id,
            'posts_per_page'         => 100,
            'orderby'                => 'modified',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
            'update_post_meta_cache' => true,
        ) );

        foreach ( $my_posts as $p ) {
            $raw = get_post_meta( $p->ID, '_script_writer_raw_content', true );
            if ( empty( $raw ) ) {
                $raw = strip_tags( $p->post_content );
            }

            $clean_text = trim( $raw );
            $word_count = ( '' !== $clean_text ) ? str_word_count( $clean_text ) : 0;
            $line_count = ( '' !== $clean_text ) ? substr_count( $clean_text, "\n" ) + 1 : 0;

            $excerpt = mb_substr( $clean_text, 0, 150 );
            if ( mb_strlen( $clean_text ) > 150 ) {
                $excerpt .= '...';
            }

            $visibility = get_post_meta( $p->ID, '_script_writer_visibility', true );
            if ( empty( $visibility ) ) {
                $visibility = 'private';
            }

            $total_words += $word_count;
            $total_lines += $line_count;

            $my_scripts[] = array(
                'id'          => $p->ID,
                'title'       => ! empty( $p->post_title ) ? $p->post_title : __( 'Untitled', 'starter-plugin' ),
                'content'     => $raw,
                'excerpt'     => $excerpt,
                'word_count'  => $word_count,
                'line_count'  => $line_count,
                'visibility'  => $visibility,
                'is_author'   => true,
                'author_id'   => $user_id,
                'author_name' => __( 'You', 'starter-plugin' ),
                'modified'    => human_time_diff( get_post_modified_time( 'U', false, $p ), current_time( 'timestamp' ) ) . ' ago',
                'date'        => get_the_modified_date( 'M j, Y', $p ),
                'timestamp'   => (int) get_post_modified_time( 'U', false, $p ),
            );
        }
    } elseif ( script_writer_is_extension_enabled( 'movie-production' ) ) {
        $dummy = script_writer_get_default_dummy_script();
        $clean_text = trim( $dummy );
        $word_count = str_word_count( $clean_text );
        $line_count = substr_count( $clean_text, "\n" ) + 1;
        $total_words += $word_count;
        $total_lines += $line_count;
        $my_scripts[] = array(
            'id'          => 'sample-midnight-protocol',
            'title'       => 'Midnight Protocol',
            'content'     => $dummy,
            'excerpt'     => mb_substr( $clean_text, 0, 150 ) . '...',
            'word_count'  => $word_count,
            'line_count'  => $line_count,
            'visibility'  => 'private',
            'is_author'   => true,
            'author_id'   => 0,
            'author_name' => __( 'Sample Screenplay', 'starter-plugin' ),
            'modified'    => __( 'Sample', 'starter-plugin' ),
            'date'        => __( 'Sample Screenplay', 'starter-plugin' ),
            'timestamp'   => time(),
        );
    }

    // 2. Community writings shared with the writing community
    $comm_posts = get_posts( array(
        'post_type'              => 'script',
        'post_status'            => 'publish',
        'posts_per_page'         => 100,
        'orderby'                => 'modified',
        'order'                  => 'DESC',
        'no_found_rows'          => true,
        'meta_query'             => array(
            array(
                'key'   => '_script_writer_visibility',
                'value' => 'community',
            ),
        ),
        'update_post_term_cache' => false,
        'update_post_meta_cache' => true,
    ) );

    $community_scripts = array();
    foreach ( $comm_posts as $p ) {
        $raw = get_post_meta( $p->ID, '_script_writer_raw_content', true );
        if ( empty( $raw ) ) {
            $raw = strip_tags( $p->post_content );
        }

        $clean_text = trim( $raw );
        $word_count = ( '' !== $clean_text ) ? str_word_count( $clean_text ) : 0;
        $line_count = ( '' !== $clean_text ) ? substr_count( $clean_text, "\n" ) + 1 : 0;

        $excerpt = mb_substr( $clean_text, 0, 150 );
        if ( mb_strlen( $clean_text ) > 150 ) {
            $excerpt .= '...';
        }

        $author_user = get_userdata( $p->post_author );
        $author_name = $author_user ? $author_user->display_name : __( 'Community Writer', 'starter-plugin' );

        $community_scripts[] = array(
            'id'          => $p->ID,
            'title'       => ! empty( $p->post_title ) ? $p->post_title : __( 'Untitled', 'starter-plugin' ),
            'content'     => $raw,
            'excerpt'     => $excerpt,
            'word_count'  => $word_count,
            'line_count'  => $line_count,
            'visibility'  => 'community',
            'is_author'   => ( $user_id > 0 && (int) $p->post_author === (int) $user_id ),
            'author_id'   => (int) $p->post_author,
            'author_name' => $author_name,
            'modified'    => human_time_diff( get_post_modified_time( 'U', false, $p ), current_time( 'timestamp' ) ) . ' ago',
            'date'        => get_the_modified_date( 'M j, Y', $p ),
            'timestamp'   => (int) get_post_modified_time( 'U', false, $p ),
        );
    }

    $active_id = ( $user_id > 0 ) ? get_user_meta( $user_id, 'script_writer_active_script_id', true ) : 0;

    // User profile data
    $user_obj = ( $user_id > 0 ) ? get_userdata( $user_id ) : wp_get_current_user();
    $user_data = array(
        'id'         => $user_id,
        'name'       => ( $user_obj && $user_obj->exists() ) ? $user_obj->display_name : '',
        'username'   => ( $user_obj && $user_obj->exists() ) ? $user_obj->user_login : '',
        'email'      => ( $user_obj && $user_obj->exists() ) ? $user_obj->user_email : '',
        'isAdmin'    => current_user_can( 'manage_options' ),
        'role'       => current_user_can( 'manage_options' ) ? 'Admin' : 'Writer',
        'space_name' => ( $user_id > 0 ) ? (string) get_user_meta( $user_id, '_andika_space_name', true ) : '',
        'bio'        => ( $user_id > 0 ) ? (string) get_user_meta( $user_id, 'description', true ) : '',
    );

    $user_counts  = count_users();
    $member_count = isset( $user_counts['total_users'] ) ? $user_counts['total_users'] : 1;

    return array(
        'scripts'           => $my_scripts, // Backwards compatibility for existing dropdown
        'my_scripts'        => $my_scripts,
        'community_scripts' => $community_scripts,
        'stats'             => array(
            'total_scripts'     => count( $my_scripts ),
            'total_words'       => number_format( $total_words ),
            'total_lines'       => number_format( $total_lines ),
            'active_script_id'  => absint( $active_id ),
            'community_scripts' => count( $community_scripts ),
            'community_members' => $member_count,
        ),
        'user'              => $user_data,
    );
}

// =============================================================================
// 7. STANDALONE FAST CANVAS OUTPUT (Zero admin chrome, inlined assets, instant boot)
// =============================================================================

function script_writer_render_fast_standalone_canvas() {
    $is_logged_in       = is_user_logged_in();
    $user_id            = $is_logged_in ? get_current_user_id() : 0;
    $current_script_id  = isset( $_GET['script_id'] ) ? absint( $_GET['script_id'] ) : 0;
    $current_title      = __( 'Untitled', 'starter-plugin' );
    $saved_content      = '';
    $current_visibility = 'private';

    // Route user:
    // Default to editor view so users immediately experience the canvas
    if ( isset( $_GET['view'] ) ) {
        $initial_view = in_array( $_GET['view'], array( 'editor', 'dashboard', 'auth' ), true ) ? $_GET['view'] : 'editor';
    } else {
        $initial_view = 'editor';
    }

    $is_prod_enabled = script_writer_is_extension_enabled( 'movie-production' );

    if ( $current_script_id > 0 ) {
        $post = get_post( $current_script_id );
        if ( $post && $post->post_type === 'script' ) {
            $current_title = ! empty( $post->post_title ) ? $post->post_title : $current_title;
            $saved_content = get_post_meta( $current_script_id, '_script_writer_raw_content', true );
            if ( empty( $saved_content ) ) {
                $saved_content = strip_tags( $post->post_content );
            }
            $current_visibility = get_post_meta( $current_script_id, '_script_writer_visibility', true );
            if ( empty( $current_visibility ) ) {
                $current_visibility = 'private';
            }
        }
    } elseif ( $is_prod_enabled ) {
        // SECOND REQUIREMENT: Load 500-word dummy screenplay ONLY and ONLY IF production extension is enabled!
        $sample_id = $is_logged_in ? script_writer_get_or_create_sample_script( $user_id ) : 0;
        if ( $sample_id > 0 ) {
            $current_script_id  = $sample_id;
            $saved_content      = get_post_meta( $sample_id, '_script_writer_raw_content', true );
            if ( empty( $saved_content ) ) {
                $saved_content = script_writer_get_default_dummy_script();
            }
            $post = get_post( $sample_id );
            $current_title      = ( $post && ! empty( $post->post_title ) ) ? $post->post_title : 'Midnight Protocol';
        } else {
            $saved_content      = script_writer_get_default_dummy_script();
            $current_title      = 'Midnight Protocol';
            $current_script_id  = 0;
        }
        $current_visibility = 'private';
    } elseif ( $is_logged_in ) {
        // Production extension NOT enabled. Load user's standard active script or draft (never the dummy script).
        $last_id = get_user_meta( $user_id, 'script_writer_active_script_id', true );
        if ( $last_id && get_post_type( $last_id ) === 'script' ) {
            $post = get_post( $last_id );
            if ( $post ) {
                $current_script_id = $last_id;
                $current_title     = ! empty( $post->post_title ) ? $post->post_title : $current_title;
                $saved_content     = get_post_meta( $last_id, '_script_writer_raw_content', true );
                if ( empty( $saved_content ) ) {
                    $saved_content = strip_tags( $post->post_content );
                }
                $current_visibility = get_post_meta( $last_id, '_script_writer_visibility', true );
                if ( empty( $current_visibility ) ) {
                    $current_visibility = 'private';
                }
            }
        }

        if ( empty( $saved_content ) ) {
            $saved_content = get_user_meta( $user_id, 'script_writer_active_draft', true );
            if ( empty( $saved_content ) ) {
                $saved_content = get_option( 'script_writer_active_draft', '' );
            }
        }
    }

    // Pre-hydrate dashboard data so switching between editor and dashboard is 0ms
    $dashboard_data = script_writer_get_library_data( $user_id );

    $config_data = array(
        'ajaxUrl'             => admin_url( 'admin-ajax.php' ),
        'nonce'               => wp_create_nonce( 'script_writer_nonce' ),
        'authNonce'           => wp_create_nonce( 'script_writer_auth_nonce' ),
        'scriptId'            => $current_script_id,
        'title'               => $current_title,
        'visibility'          => $current_visibility,
        'adminScriptUrl'      => admin_url( 'admin.php?page=script-writer' ),
        'appUrl'              => script_writer_get_app_url(),
        'initialView'         => $initial_view,
        'isLoggedIn'          => $is_logged_in,
        'isAdmin'             => current_user_can( 'manage_options' ),
        'isProductionEnabled' => $is_prod_enabled,
        'currentUser'        => $dashboard_data['user'],
        'spaceName'          => script_writer_get_space_name(),
        'spaceAbout'         => script_writer_get_space_about(),
        'spaceSlug'          => script_writer_get_space_slug(),
        'spaceDescription'   => script_writer_get_space_description(),
        'loginLabel'         => script_writer_get_login_label(),
        'loginAbout'         => script_writer_get_login_about(),
        'homeUrl'            => home_url(),
        'permalinkStructure' => (bool) get_option( 'permalink_structure' ),
        'enabledExtensions'  => script_writer_get_enabled_extensions(),
        'registeredExtensions' => array_values( script_writer_get_available_companion_extensions() ),
    );
    script_writer_bootstrap_companion_extensions();
    $config_data = apply_filters( 'andika_config_data', $config_data );

    // Read inlined assets to eliminate all extra HTTP request round trips
    $css_file = plugin_dir_path( __FILE__ ) . 'assets/writer.css';
    $js_file  = plugin_dir_path( __FILE__ ) . 'assets/writer.js';
    $css      = file_exists( $css_file ) ? file_get_contents( $css_file ) : '';
    $js       = file_exists( $js_file ) ? file_get_contents( $js_file ) : '';

    header( 'Content-Type: text/html; charset=UTF-8' );
    header( 'X-Robots-Tag: noindex, nofollow' );
    header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0' );
    header( 'Pragma: no-cache' );
    header( 'Expires: 0' );
    ?>
<!DOCTYPE html>
<html lang="<?php echo esc_attr( get_locale() ); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html( $current_title ); ?> — <?php echo esc_html( script_writer_get_space_name() ); ?></title>
    <style>
        <?php echo $css; ?>
    </style>
    <script>
        window.scriptWriterData = <?php echo wp_json_encode( $config_data ); ?>;
        window.scriptWriterInitialData = <?php echo wp_json_encode( $dashboard_data ); ?>;
    </script>
    <?php
    // Hook for extensions to inject head assets (styles/scripts)
    do_action( 'andika_canvas_head' );
    ?>
</head>
<body>
    <?php script_writer_render_screen_html( $current_title, $saved_content, $current_script_id, $initial_view, $is_logged_in, $dashboard_data['user'], $current_visibility ); ?>
    <script>
        <?php echo $js; ?>
    </script>
    <?php
    // Hook for extensions to inject footer assets and initialization
    do_action( 'andika_canvas_footer' );
    ?>
</body>
</html>
    <?php
}

// Fallback render callback for standard admin hook
function script_writer_render_screen() {
    script_writer_render_fast_standalone_canvas();
}

// =============================================================================
// 8. SCREEN HTML MARKUP (Canvas + Integrated Dashboard)
// =============================================================================

function script_writer_render_screen_html( $current_title, $saved_content, $current_script_id, $initial_view = 'dashboard', $is_logged_in = false, $user_data = array(), $current_visibility = 'private' ) {
    $user_name    = ! empty( $user_data['name'] ) ? $user_data['name'] : ( ! empty( $user_data['username'] ) ? $user_data['username'] : __( 'Writer', 'starter-plugin' ) );
    $user_role    = ! empty( $user_data['role'] ) ? $user_data['role'] : __( 'Writer', 'starter-plugin' );
    $user_initial = ! empty( $user_name ) ? strtoupper( mb_substr( $user_name, 0, 1 ) ) : 'W';
    ?>
    <div id="script-writer-screen">
        <!-- VIEW 1: Fullscreen 1440px Centered Writing Canvas -->
        <div id="script-writer-editor-view" class="<?php echo ( $initial_view === 'editor' ) ? 'sw-view-active' : 'sw-view-hidden'; ?>">
            <!-- Floating Top Bar with Navigation, Title, Tools & Actions -->
            <div id="script-writer-toolbar-wrap">
                <div id="script-writer-toolbar">
                    <!-- Group 1: Navigation & Title -->
                    <div class="sw-tool-group sw-nav-group">
                        <button type="button" class="sw-btn sw-btn-nav" id="script-writer-dashboard-btn" title="Open Dashboard">Dashboard</button>
                        <span class="sw-divider"></span>
                        <div class="sw-dropdown-anchor">
                            <button type="button" class="sw-btn" id="script-writer-scripts-btn" title="Writings">Writings ▾</button>
                            <div id="script-writer-dropdown">
                                <div class="sw-dropdown-header">My Writings</div>
                                <div id="script-writer-dropdown-list">
                                    <div class="sw-dropdown-loading">Loading...</div>
                                </div>
                                <div class="sw-dropdown-divider"></div>
                                <button type="button" class="sw-dropdown-item sw-dropdown-footer-btn" id="sw-dropdown-new-btn">+ New</button>
                                <button type="button" class="sw-dropdown-item sw-dropdown-footer-btn" id="sw-dropdown-import-btn">Import PDF / Script...</button>
                                <button type="button" class="sw-dropdown-item sw-dropdown-footer-btn" id="sw-dropdown-open-dash">All Writings Dashboard →</button>
                            </div>
                        </div>
                        <span class="sw-divider"></span>
                        <input type="text" id="script-writer-title" value="<?php echo esc_attr( $current_title ); ?>" placeholder="Untitled" title="Writing Title" />
                    </div>

                    <!-- Group 2: Formatting Tools -->
                    <div class="sw-tool-group sw-format-group" role="toolbar" aria-label="Writing & Formatting Tools">
                        <button type="button" class="sw-btn" data-action="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
                        <button type="button" class="sw-btn" data-action="italic" title="Italic (Ctrl+I)"><em>I</em></button>
                        <span class="sw-divider"></span>
                        <button type="button" class="sw-btn" data-action="heading" title="Heading (H#)">H#</button>
                        <button type="button" class="sw-btn" data-action="uppercase" title="Toggle UPPERCASE (Ctrl+U)">AA</button>
                        <span class="sw-divider"></span>
                        <button type="button" class="sw-btn" data-action="code" title="Code / Monospace (Ctrl+K)">&lt;/&gt;</button>
                        <button type="button" class="sw-btn" data-action="quote" title="Dialogue / Quote">&ldquo;</button>
                        <button type="button" class="sw-btn" data-action="bullet" title="Bullet List">&bull;</button>
                        <button type="button" class="sw-btn" data-action="comment" title="Toggle Comment (Ctrl+/)">//</button>
                        <span class="sw-divider"></span>
                        <button type="button" class="sw-btn" data-action="indent" title="Indent 4 Spaces (Tab)">Indent</button>
                        <button type="button" class="sw-btn" data-action="outdent" title="Outdent (Shift+Tab)">Outdent</button>
                    </div>

                    <!-- Group 3: Save, Export, Import, + New & Status -->
                    <div class="sw-tool-group sw-action-group">
                        <button type="button" class="sw-btn sw-btn-save" id="script-writer-save-btn" data-action="save" title="Save Writing (Ctrl+S)">Save</button>
                        <button type="button" class="sw-btn sw-btn-export" id="script-writer-export-btn" title="Export Writing">Export</button>
                        <button type="button" class="sw-btn sw-btn-import" id="script-writer-import-btn" title="Import PDF Script or Document">Import</button>
                        <button type="button" class="sw-btn sw-btn-new" id="script-writer-new-btn" title="Create New Writing">+ New</button>
                        <span class="sw-divider"></span>
                        <span id="script-writer-status" class="sw-status" aria-live="polite">saved</span>
                    </div>
                </div>
            </div>

            <input type="file" id="script-writer-import-file" accept=".pdf,.txt,.fountain" style="display:none;" />

            <!-- Centered 1440px Writing Canvas Container -->
            <div id="script-writer-canvas-wrap">
                <div id="script-writer-drop-overlay" class="sw-drop-overlay" style="display:none;">
                    <div class="sw-drop-card">
                        <span class="sw-drop-badge">PDF IMPORT</span>
                        <div class="sw-drop-title">Drop PDF to Import Script</div>
                        <div class="sw-drop-desc">Screenplays are automatically parsed &amp; categorized</div>
                    </div>
                </div>
                <textarea id="script-writer-textarea" data-script-id="<?php echo esc_attr( $current_script_id ); ?>" data-visibility="<?php echo esc_attr( $current_visibility ); ?>" placeholder="" autofocus spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" aria-label="Writing Canvas"><?php echo esc_textarea( $saved_content ); ?></textarea>
            </div>

            <!-- Floating Right-Click Quick Tools Context Menu (alongside blinking cursor) -->
            <div id="script-writer-context-menu" class="sw-context-menu" style="display:none;" role="menu" aria-label="Quick Writing Tools">
                <div class="sw-context-group">
                    <button type="button" class="sw-ctx-btn" data-action="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
                    <button type="button" class="sw-ctx-btn" data-action="italic" title="Italic (Ctrl+I)"><em>I</em></button>
                    <span class="sw-ctx-divider"></span>
                    <button type="button" class="sw-ctx-btn" data-action="heading" title="Heading / Slugline (H#)">H#</button>
                    <button type="button" class="sw-ctx-btn" data-action="uppercase" title="Toggle UPPERCASE (Ctrl+U)">AA</button>
                    <span class="sw-ctx-divider"></span>
                    <button type="button" class="sw-ctx-btn" data-action="code" title="Code / Monospace (Ctrl+K)">&lt;/&gt;</button>
                    <button type="button" class="sw-ctx-btn" data-action="quote" title="Dialogue / Quote">&ldquo;</button>
                    <button type="button" class="sw-ctx-btn" data-action="bullet" title="Bullet List">&bull;</button>
                    <button type="button" class="sw-ctx-btn" data-action="comment" title="Comment (Ctrl+/)">//</button>
                    <span class="sw-ctx-divider"></span>
                    <button type="button" class="sw-ctx-btn" data-action="indent" title="Indent 4 Spaces (Tab)">Indent</button>
                    <button type="button" class="sw-ctx-btn" data-action="outdent" title="Outdent (Shift+Tab)">Outdent</button>
                    <span class="sw-ctx-divider"></span>
                    <button type="button" class="sw-ctx-btn" data-action="copy" title="Copy (Ctrl+C)">Copy</button>
                    <button type="button" class="sw-ctx-btn sw-ctx-btn-save" data-action="save" title="Save Writing (Ctrl+S)">Save</button>
                </div>
            </div>
        </div>

        <!-- VIEW 2: Dedicated All Writings Dashboard (Personal + Community) -->
        <div id="script-writer-dashboard-view" class="<?php echo ( $initial_view === 'dashboard' ) ? 'sw-view-active' : 'sw-view-hidden'; ?>">
            <div id="sw-dashboard-container">
                <!-- Dashboard Top Navigation Bar -->
                <header id="sw-dashboard-header">
                    <div class="sw-dash-brand">
                        <span class="sw-dash-logo"><?php echo esc_html( script_writer_get_space_name() ); ?></span>
                        <span class="sw-dash-tag"><?php echo esc_html( script_writer_get_space_about() ); ?></span>
                    </div>
                    <div class="sw-dash-nav-actions">
                        <button type="button" class="sw-btn sw-btn-primary" id="sw-dash-new-script-btn">+ New</button>
                        <button type="button" class="sw-btn" id="sw-dash-import-btn" title="Import PDF Script or Document">Import</button>
                        <button type="button" class="sw-btn" id="sw-dash-back-editor-btn">Return to Editor</button>
                        <div class="sw-dash-ext-actions" id="sw-dash-ext-actions"></div>

                        <!-- Gear Menu Anchor (Houses User Info, Settings, WP Admin, Log Out) -->
                        <div class="sw-gear-anchor" id="sw-gear-anchor">
                            <button type="button" class="sw-btn sw-btn-gear" id="sw-dash-gear-btn" title="<?php esc_attr_e( 'Settings &amp; Options', 'starter-plugin' ); ?>" aria-label="Settings and options" aria-haspopup="true" aria-expanded="false">
                                <svg class="sw-gear-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            <div class="sw-gear-menu" id="sw-dash-gear-menu" role="menu" aria-label="Settings and options">
                                <?php if ( $is_logged_in ) : ?>
                                <div class="sw-gear-user-header" id="sw-dash-user-pill" role="button" tabindex="0" title="<?php esc_attr_e( 'Account &amp; Space Settings', 'starter-plugin' ); ?>">
                                    <span class="sw-user-avatar"><?php echo esc_html( $user_initial ); ?></span>
                                    <div class="sw-user-info">
                                        <span class="sw-user-name"><?php echo esc_html( $user_name ); ?></span>
                                        <span class="sw-user-role"><?php echo esc_html( $user_role ); ?></span>
                                    </div>
                                </div>
                                <div class="sw-gear-divider"></div>
                                <button type="button" class="sw-gear-item" id="sw-dash-settings-btn" role="menuitem">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    <span>Profile</span>
                                </button>
                                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                                <button type="button" class="sw-gear-item" id="sw-dash-space-settings-btn" role="menuitem">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    <span>Settings</span>
                                </button>
                                <a href="<?php echo esc_url( admin_url() ); ?>" class="sw-gear-item sw-dash-wp-link" role="menuitem" title="Return to classic WordPress Admin (Admin Only)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    <span>WP Admin ↗</span>
                                </a>
                                <?php endif; ?>
                                <div class="sw-gear-divider"></div>
                                <button type="button" class="sw-gear-item sw-gear-item-danger" id="sw-dash-logout-btn" role="menuitem" title="<?php echo esc_attr( sprintf( __( 'Sign out of %s', 'starter-plugin' ), script_writer_get_space_name() ) ); ?>">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    <span>Log Out</span>
                                </button>
                                <?php else : ?>
                                <a href="<?php echo esc_url( script_writer_get_app_url() . '&view=auth' ); ?>" class="sw-gear-item" role="menuitem">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                                    <span>User Login / Register</span>
                                </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Dashboard Summary Cards -->
                <section id="sw-dashboard-stats-row">
                    <div class="sw-stat-card">
                        <div class="sw-stat-label">My Writings</div>
                        <div class="sw-stat-value" id="sw-stat-total-scripts">0</div>
                    </div>
                    <div class="sw-stat-card">
                        <div class="sw-stat-label">Total Words Written</div>
                        <div class="sw-stat-value" id="sw-stat-total-words">0</div>
                    </div>
                    <div class="sw-stat-card">
                        <div class="sw-stat-label">Total Lines</div>
                        <div class="sw-stat-value" id="sw-stat-total-lines">0</div>
                    </div>
                    <div class="sw-stat-card sw-stat-community-card" style="display:none !important;">
                        <div class="sw-stat-label">Community Library</div>
                        <div class="sw-stat-value" id="sw-stat-comm-scripts">0</div>
                        <div class="sw-stat-sub" id="sw-stat-comm-members">Writers community</div>
                    </div>
                    <div class="sw-stat-card sw-stat-active-script" id="sw-stat-active-card">
                        <div class="sw-stat-label">Continue Writing</div>
                        <div class="sw-stat-value sw-stat-active-title" id="sw-stat-active-title"><?php echo esc_html( $current_title ); ?></div>
                        <button type="button" class="sw-stat-active-link" id="sw-stat-active-link">Continue where you left off →</button>
                    </div>
                </section>

                <!-- Dashboard Workspace Tabs: Personal vs Community Library (Hidden to prevent distraction) -->
                <section class="sw-dashboard-tabs-wrap" style="display:none !important;">
                    <div class="sw-dash-tabs" role="tablist">
                        <button type="button" class="sw-dash-tab active" id="sw-tab-my" data-tab="my" role="tab" aria-selected="true">
                            My Workspace <span class="sw-tab-badge" id="sw-tab-my-count">0</span>
                        </button>
                        <button type="button" class="sw-dash-tab" id="sw-tab-community" data-tab="community" role="tab" aria-selected="false">
                            Community Library <span class="sw-tab-badge" id="sw-tab-community-count">0</span>
                        </button>
                    </div>
                    <p class="sw-dash-tab-hint" id="sw-dash-tab-hint"><?php esc_html_e( 'Your private workspace writings. Only you can access and edit these.', 'starter-plugin' ); ?></p>
                </section>

                <!-- Management Controls: Search & Sort Filter -->
                <section id="sw-dashboard-controls">
                    <div class="sw-search-wrap">
                        <svg class="sw-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="sw-dash-search" placeholder="Search writings by title or snippet..." />
                    </div>
                    <div class="sw-filter-actions">
                        <select id="sw-dash-sort">
                            <option value="modified-desc">Recently Modified</option>
                            <option value="title-asc">Title (A-Z)</option>
                            <option value="words-desc">Longest (Words)</option>
                        </select>
                    </div>
                </section>

                <!-- Writings Grid / List -->
                <main id="sw-dashboard-scripts-grid">
                    <div class="sw-dash-loading">Loading writings...</div>
                </main>
            </div>
        </div>

        <!-- VIEW 3 / MODAL: Andika Export & Manuscript Preview Modal -->
        <div id="script-writer-export-modal" class="sw-modal-overlay" style="display:none;" aria-hidden="true" role="dialog" aria-label="Export Writing">
            <div class="sw-modal-backdrop" id="sw-export-backdrop"></div>
            <div class="sw-export-dialog">
                <!-- Modal Header -->
                <div class="sw-export-header">
                    <div class="sw-export-header-title">
                        <h3>Export Writing</h3>
                        <span class="sw-export-badge" id="sw-export-script-title"><?php echo esc_html( $current_title ); ?></span>
                    </div>
                    <button type="button" class="sw-modal-close-btn" id="sw-export-close-btn" title="Close (Esc)">&times;</button>
                </div>

                <!-- Modal Body: Controls Sidebar + Live Manuscript Sheet Preview -->
                <div class="sw-export-body">
                    <!-- Left Sidebar: Style Picker & Settings -->
                    <aside class="sw-export-sidebar">
                        <div class="sw-export-field-group">
                            <label class="sw-export-label">Export Style</label>
                            <div class="sw-style-picker" id="sw-style-picker" role="radiogroup" aria-label="Export Style">
                                <button type="button" class="sw-style-card active" data-style="filmscript" role="radio" aria-checked="true">
                                    <span class="sw-style-radio"></span>
                                    <span class="sw-style-info">
                                        <span class="sw-style-title">Filmscript Manuscript</span>
                                        <span class="sw-style-sub">12pt Courier · Filmscript standard</span>
                                    </span>
                                </button>
                                <button type="button" class="sw-style-card" data-style="modern" role="radio" aria-checked="false">
                                    <span class="sw-style-radio"></span>
                                    <span class="sw-style-info">
                                        <span class="sw-style-title">Modern Clean</span>
                                        <span class="sw-style-sub">JetBrains Mono · Crisp screenplay</span>
                                    </span>
                                </button>
                                <button type="button" class="sw-style-card" data-style="stageplay" role="radio" aria-checked="false">
                                    <span class="sw-style-radio"></span>
                                    <span class="sw-style-info">
                                        <span class="sw-style-title">Stage Play / Reader</span>
                                        <span class="sw-style-sub">Georgia Serif · Reader manuscript</span>
                                    </span>
                                </button>
                            </div>
                            <select id="sw-export-style" class="sw-export-select" style="display:none;">
                                <option value="filmscript" selected>Filmscript Manuscript (12pt Courier)</option>
                                <option value="modern">Modern Clean Screenplay</option>
                                <option value="stageplay">Stage Play / Reader's Manuscript</option>
                            </select>
                            <p class="sw-export-help" id="sw-export-help">Submission-ready industry standard with authentic Courier 12pt layout, margins, and sluglines.</p>
                        </div>

                        <div class="sw-export-field-group">
                            <label class="sw-export-label" for="sw-export-pagesize">Page Size</label>
                            <select id="sw-export-pagesize" class="sw-export-select">
                                <option value="letter" selected>US Letter (8.5″ × 11″)</option>
                                <option value="a4">A4 (210mm × 297mm)</option>
                            </select>
                        </div>

                        <div class="sw-export-field-group">
                            <label class="sw-export-label">Manuscript Options</label>
                            <label class="sw-export-checkbox-label">
                                <input type="checkbox" id="sw-export-opt-titlepage" checked />
                                <span>Include Title / Cover Page</span>
                            </label>
                            <label class="sw-export-checkbox-label">
                                <input type="checkbox" id="sw-export-opt-pagenumbers" checked />
                                <span>Page Numbers (Top Right)</span>
                            </label>
                            <label class="sw-export-checkbox-label">
                                <input type="checkbox" id="sw-export-opt-boldslugs" checked />
                                <span>Bold Scene Headings</span>
                            </label>
                            <label class="sw-export-checkbox-label">
                                <input type="checkbox" id="sw-export-opt-hidenotes" checked />
                                <span>Exclude Notes &amp; Comments (//)</span>
                            </label>
                        </div>

                        <div class="sw-export-actions-wrap">
                            <button type="button" class="sw-export-primary-btn" id="sw-export-pdf-btn">
                                <span>Export PDF / Print</span>
                            </button>
                            <div class="sw-export-subactions">
                                <button type="button" class="sw-export-sec-btn" id="sw-export-html-btn" title="Download standalone HTML manuscript">Download HTML</button>
                                <button type="button" class="sw-export-sec-btn" id="sw-export-fountain-btn" title="Download industry-standard .fountain file">Fountain (.fountain)</button>
                                <button type="button" class="sw-export-sec-btn" id="sw-export-txt-btn" title="Download formatted plain text">Text (.txt)</button>
                            </div>
                        </div>
                    </aside>

                    <!-- Right Column: Live Sheet Preview -->
                    <main class="sw-export-preview-container">
                        <div class="sw-preview-toolbar">
                            <span class="sw-preview-label">Live Manuscript Preview</span>
                            <span class="sw-preview-meta" id="sw-preview-page-count">1 page</span>
                        </div>
                        <div class="sw-preview-viewport" id="sw-preview-viewport">
                            <div class="sw-paper-sheet" id="sw-paper-sheet">
                                <!-- Rendered Screenplay Output Generated Here -->
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>

        <!-- VIEW 3b / MODAL: Account & Space Settings Modal -->
        <div id="script-writer-settings-modal" class="sw-modal-overlay" style="display:none;" aria-hidden="true" role="dialog" aria-label="Account and Space Settings">
            <div class="sw-modal-backdrop" id="sw-settings-backdrop"></div>
            <div class="sw-settings-dialog">
                <!-- Modal Header -->
                <div class="sw-settings-header">
                    <div class="sw-settings-header-title">
                        <h3 id="sw-settings-modal-title"><?php esc_html_e( 'Profile &amp; Settings', 'starter-plugin' ); ?></h3>
                        <p class="sw-settings-sub" id="sw-settings-header-sub"><?php esc_html_e( 'Manage your author profile, login credentials, and workspace details.', 'starter-plugin' ); ?></p>
                    </div>
                    <button type="button" class="sw-modal-close-btn" id="sw-settings-close-btn" title="<?php esc_attr_e( 'Close (Esc)', 'starter-plugin' ); ?>">&times;</button>
                </div>

                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                <!-- Admin Tabs Switcher: Profile vs Settings -->
                <div class="sw-settings-nav-tabs" role="tablist">
                    <button type="button" class="sw-settings-tab-btn active" id="sw-tab-user-settings" data-panel="author" role="tab" aria-selected="true"><?php esc_html_e( 'Profile', 'starter-plugin' ); ?></button>
                    <button type="button" class="sw-settings-tab-btn" id="sw-tab-admin-settings" data-panel="space" role="tab" aria-selected="false"><?php esc_html_e( 'Settings', 'starter-plugin' ); ?></button>
                    <button type="button" class="sw-settings-tab-btn" id="sw-tab-extensions-settings" data-panel="extensions" role="tab" aria-selected="false"><?php esc_html_e( 'Extensions', 'starter-plugin' ); ?></button>
                </div>
                <?php endif; ?>

                <!-- Alert Message -->
                <div id="sw-settings-alert" class="sw-settings-alert" style="display:none;" role="alert"></div>

                <!-- Form 1: Author Profile Settings -->
                <form id="sw-settings-form" class="sw-settings-form" autocomplete="on">
                    <div class="sw-settings-body">
                        <!-- Section 1: Profile & Identity (WordPress Core User Management) -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Profile &amp; Author Identity', 'starter-plugin' ); ?></h4>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-setting-name"><?php esc_html_e( 'Display Name / Author Name', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-setting-name" class="sw-auth-input" value="<?php echo esc_attr( $user_name ); ?>" required />
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-setting-email"><?php esc_html_e( 'Email Address', 'starter-plugin' ); ?></label>
                                    <input type="email" id="sw-setting-email" class="sw-auth-input" value="<?php echo esc_attr( isset( $dashboard_data['user']['email'] ) ? $dashboard_data['user']['email'] : '' ); ?>" required />
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-setting-username"><?php esc_html_e( 'Username', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-setting-username" class="sw-auth-input sw-input-readonly" value="<?php echo esc_attr( isset( $dashboard_data['user']['username'] ) ? $dashboard_data['user']['username'] : '' ); ?>" readonly />
                                    <span class="sw-field-hint"><?php esc_html_e( 'WordPress username cannot be changed.', 'starter-plugin' ); ?></span>
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Space / Workspace Details -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Workspace Details', 'starter-plugin' ); ?></h4>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-setting-space-name"><?php esc_html_e( 'Workspace / Studio Name', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-setting-space-name" class="sw-auth-input" placeholder="<?php esc_attr_e( 'e.g. My Writing Studio', 'starter-plugin' ); ?>" value="<?php echo esc_attr( get_user_meta( get_current_user_id(), '_andika_space_name', true ) ); ?>" />
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-setting-bio"><?php esc_html_e( 'Writer Bio / Tagline', 'starter-plugin' ); ?></label>
                                    <textarea id="sw-setting-bio" class="sw-auth-input sw-setting-textarea" rows="2" placeholder="<?php esc_attr_e( 'A brief note about your writing or focus...', 'starter-plugin' ); ?>"><?php echo esc_textarea( get_user_meta( get_current_user_id(), 'description', true ) ); ?></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Change Password (WordPress Core Password Management) -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Change Password', 'starter-plugin' ); ?></h4>
                            <p class="sw-field-hint"><?php esc_html_e( 'Leave password fields blank if you do not wish to change your password.', 'starter-plugin' ); ?></p>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-setting-cur-pass"><?php esc_html_e( 'Current Password', 'starter-plugin' ); ?></label>
                                    <input type="password" id="sw-setting-cur-pass" class="sw-auth-input" placeholder="<?php esc_attr_e( 'Required only if changing password', 'starter-plugin' ); ?>" autocomplete="current-password" />
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-setting-new-pass"><?php esc_html_e( 'New Password', 'starter-plugin' ); ?></label>
                                    <input type="password" id="sw-setting-new-pass" class="sw-auth-input" placeholder="<?php esc_attr_e( 'Minimum 6 characters', 'starter-plugin' ); ?>" autocomplete="new-password" />
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-setting-confirm-pass"><?php esc_html_e( 'Confirm New Password', 'starter-plugin' ); ?></label>
                                    <input type="password" id="sw-setting-confirm-pass" class="sw-auth-input" placeholder="<?php esc_attr_e( 'Confirm new password', 'starter-plugin' ); ?>" autocomplete="new-password" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="sw-settings-footer">
                        <button type="button" class="sw-btn" id="sw-settings-cancel-btn"><?php esc_html_e( 'Cancel', 'starter-plugin' ); ?></button>
                        <button type="submit" class="sw-btn sw-btn-primary" id="sw-settings-save-btn"><?php esc_html_e( 'Save Changes', 'starter-plugin' ); ?></button>
                    </div>
                </form>

                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                <!-- Form 2: Admin Space & Platform Settings (Name, About, Slug/Permalink) -->
                <form id="sw-admin-space-form" class="sw-settings-form" style="display:none;" autocomplete="on">
                    <div class="sw-settings-body">
                        <!-- Section 1: Global Space Brand -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Global Space Branding', 'starter-plugin' ); ?></h4>
                            <p class="sw-field-hint"><?php esc_html_e( 'Customize the public name and tagline of this writing space. It does not have to be Andika - name it whatever suits your creative studio or community.', 'starter-plugin' ); ?></p>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-admin-space-name"><?php esc_html_e( 'Space Name', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-admin-space-name" class="sw-auth-input" value="<?php echo esc_attr( script_writer_get_space_name() ); ?>" placeholder="Andika" required />
                                    <span class="sw-field-hint"><?php esc_html_e( 'Appears in top navbar, browser titles, and writer screens.', 'starter-plugin' ); ?></span>
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-admin-space-about"><?php esc_html_e( 'Space Tagline / About', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-admin-space-about" class="sw-auth-input" value="<?php echo esc_attr( script_writer_get_space_about() ); ?>" placeholder="<?php esc_attr_e( 'Writing Studio & Community', 'starter-plugin' ); ?>" required />
                                    <span class="sw-field-hint"><?php esc_html_e( 'Displayed in the top navigation bar next to your space logo.', 'starter-plugin' ); ?></span>
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Dynamic Permalink Route -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Dynamic Permalink &amp; URL Route', 'starter-plugin' ); ?></h4>
                            <p class="sw-field-hint"><?php esc_html_e( 'Set the URL slug for this writing studio. Changing this updates your permalink dynamically.', 'starter-plugin' ); ?></p>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-admin-space-slug"><?php esc_html_e( 'URL Permalink Slug', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-admin-space-slug" class="sw-auth-input" value="<?php echo esc_attr( script_writer_get_space_slug() ); ?>" placeholder="andika" required />
                                    <div class="sw-slug-preview-box">
                                        <span class="sw-slug-preview-label"><?php esc_html_e( 'Live URL Preview:', 'starter-plugin' ); ?></span>
                                        <code class="sw-slug-preview-code" id="sw-slug-preview-code"><?php echo esc_html( script_writer_get_app_url() ); ?></code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Login Screen Branding & About -->
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Login Screen Branding &amp; About', 'starter-plugin' ); ?></h4>
                            <p class="sw-field-hint"><?php esc_html_e( 'Customize the title label and about/welcome text displayed on the writer sign-in and account creation screen.', 'starter-plugin' ); ?></p>
                            <div class="sw-settings-grid">
                                <div class="sw-auth-field">
                                    <label for="sw-admin-login-label"><?php esc_html_e( 'Login Screen Label', 'starter-plugin' ); ?></label>
                                    <input type="text" id="sw-admin-login-label" class="sw-auth-input" value="<?php echo esc_attr( script_writer_get_login_label() ); ?>" placeholder="<?php echo esc_attr( script_writer_get_space_name() ); ?>" />
                                    <span class="sw-field-hint"><?php esc_html_e( 'Main title displayed above the login card (defaults to Space Name).', 'starter-plugin' ); ?></span>
                                </div>
                                <div class="sw-auth-field">
                                    <label for="sw-admin-login-about"><?php esc_html_e( 'Login Screen About / Tagline', 'starter-plugin' ); ?></label>
                                    <textarea id="sw-admin-login-about" class="sw-auth-input sw-setting-textarea" rows="2" placeholder="<?php esc_attr_e( 'Write freely as a person. Create together in community.', 'starter-plugin' ); ?>"><?php echo esc_textarea( script_writer_get_login_about() ); ?></textarea>
                                    <span class="sw-field-hint"><?php esc_html_e( 'Welcome statement displayed beneath the login header.', 'starter-plugin' ); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer for Settings -->
                    <div class="sw-settings-footer">
                        <button type="button" class="sw-btn" id="sw-admin-space-cancel-btn"><?php esc_html_e( 'Cancel', 'starter-plugin' ); ?></button>
                        <button type="submit" class="sw-btn sw-btn-primary" id="sw-admin-space-save-btn"><?php esc_html_e( 'Save Settings', 'starter-plugin' ); ?></button>
                    </div>
                </form>

                <!-- Panel 3: Modular Extensions Management -->
                <div id="sw-extensions-panel" class="sw-settings-form" style="display:none;">
                    <div class="sw-settings-body">
                        <div class="sw-settings-section">
                            <h4 class="sw-settings-section-title"><?php esc_html_e( 'Modular Extensions', 'starter-plugin' ); ?></h4>
                            <p class="sw-field-hint"><?php esc_html_e( 'Enable companion tools and specialized workflows for Andika. All extensions remain completely modular with zero overhead when turned off.', 'starter-plugin' ); ?></p>

                            <div class="sw-extensions-list" id="sw-extensions-list">
                                <?php
                                $registered_exts = script_writer_get_available_companion_extensions();
                                $enabled_exts    = script_writer_get_enabled_extensions();

                                if ( empty( $registered_exts ) ) :
                                ?>
                                    <div class="sw-ext-empty"><?php esc_html_e( 'No companion extensions registered.', 'starter-plugin' ); ?></div>
                                <?php
                                else :
                                    foreach ( $registered_exts as $ext_id => $ext ) :
                                        $is_active     = ! empty( $enabled_exts[ $ext_id ] );
                                        $is_standalone = ! empty( $ext['is_standalone'] );
                                ?>
                                    <div class="sw-ext-card <?php echo $is_active ? 'is-active' : ''; ?>" data-extension="<?php echo esc_attr( $ext_id ); ?>">
                                        <div class="sw-ext-card-header">
                                            <div class="sw-ext-title-group">
                                                <div class="sw-ext-status-dot <?php echo $is_active ? 'active' : ''; ?>" title="<?php echo $is_active ? esc_attr__( 'Active', 'starter-plugin' ) : esc_attr__( 'Inactive', 'starter-plugin' ); ?>"></div>
                                                <div class="sw-ext-heading-block">
                                                    <h5 class="sw-ext-title"><?php echo esc_html( $ext['name'] ); ?></h5>
                                                    <div class="sw-ext-sub-meta">
                                                        <span class="sw-ext-version">v<?php echo esc_html( isset( $ext['version'] ) ? $ext['version'] : '1.0.0' ); ?></span>
                                                        <span class="sw-ext-meta-sep">&bull;</span>
                                                        <span class="sw-ext-kind-label"><?php echo $is_standalone ? esc_html__( 'Standalone Plugin', 'starter-plugin' ) : esc_html__( 'Companion Extension', 'starter-plugin' ); ?></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="sw-ext-card-action">
                                                <button type="button" class="sw-btn sw-btn-toggle-ext <?php echo $is_active ? 'active' : ''; ?>" data-ext-id="<?php echo esc_attr( $ext_id ); ?>" data-enabled="<?php echo $is_active ? '1' : '0'; ?>">
                                                    <?php echo $is_active ? esc_html__( 'Enabled', 'starter-plugin' ) : esc_html__( 'Enable', 'starter-plugin' ); ?>
                                                </button>
                                            </div>
                                        </div>
                                        <p class="sw-ext-desc"><?php echo esc_html( $ext['description'] ); ?></p>
                                    </div>
                                <?php
                                    endforeach;
                                endif;
                                ?>
                            </div>
                        </div>
                    </div>
                    <div class="sw-settings-footer">
                        <button type="button" class="sw-btn" id="sw-extensions-close-btn"><?php esc_html_e( 'Close', 'starter-plugin' ); ?></button>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- VIEW 4: Distraction-Free Authentication Screen (Sign In & Register) -->
        <div id="script-writer-auth-view" class="<?php echo ( $initial_view === 'auth' ) ? 'sw-view-active' : 'sw-view-hidden'; ?>">
            <div class="sw-auth-container">
                <div class="sw-auth-card">
                    <!-- Auth Brand Header -->
                    <div class="sw-auth-brand">
                        <span class="sw-auth-badge" id="sw-auth-space-badge"><?php echo esc_html( script_writer_get_space_name() ); ?> <?php esc_html_e( 'Writing Studio', 'starter-plugin' ); ?></span>
                        <h1 class="sw-auth-logo" id="sw-auth-space-name"><?php echo esc_html( script_writer_get_login_label() ); ?></h1>
                        <p class="sw-auth-subtitle" id="sw-auth-space-desc"><?php echo esc_html( script_writer_get_login_about() ); ?></p>
                    </div>

                    <!-- Auth Tabs Switcher -->
                    <div class="sw-auth-tabs" role="tablist">
                        <button type="button" class="sw-auth-tab-btn active" id="sw-tab-btn-login" data-tab="login" role="tab" aria-selected="true"><?php esc_html_e( 'Sign In', 'starter-plugin' ); ?></button>
                        <button type="button" class="sw-auth-tab-btn" id="sw-tab-btn-register" data-tab="register" role="tab" aria-selected="false"><?php esc_html_e( 'Create Account', 'starter-plugin' ); ?></button>
                    </div>

                    <!-- Alert message container -->
                    <div id="sw-auth-alert" class="sw-auth-alert" style="display:none;" role="alert"></div>

                    <!-- Form 1: Sign In Form -->
                    <form id="sw-auth-login-form" class="sw-auth-form" method="post" autocomplete="on">
                        <div class="sw-auth-field">
                            <label for="sw-login-user"><?php esc_html_e( 'Username or Email', 'starter-plugin' ); ?></label>
                            <input type="text" id="sw-login-user" name="log" class="sw-auth-input" placeholder="username or email" required autofocus />
                        </div>
                        <div class="sw-auth-field">
                            <label for="sw-login-pwd"><?php esc_html_e( 'Password', 'starter-plugin' ); ?></label>
                            <input type="password" id="sw-login-pwd" name="pwd" class="sw-auth-input" placeholder="••••••••" required />
                        </div>
                        <div class="sw-auth-extra">
                            <label class="sw-auth-checkbox-label">
                                <input type="checkbox" id="sw-login-remember" name="remember" value="1" checked />
                                <span><?php esc_html_e( 'Remember me', 'starter-plugin' ); ?></span>
                            </label>
                        </div>
                        <button type="submit" class="sw-btn sw-btn-primary sw-auth-submit-btn" id="sw-login-submit-btn">
                            <span><?php esc_html_e( 'Sign In to Workspace →', 'starter-plugin' ); ?></span>
                        </button>
                    </form>

                    <!-- Form 2: Register Form -->
                    <form id="sw-auth-register-form" class="sw-auth-form" method="post" style="display:none;" autocomplete="on">
                        <div class="sw-auth-field">
                            <label for="sw-reg-name"><?php esc_html_e( 'Your Name / Pen Name', 'starter-plugin' ); ?></label>
                            <input type="text" id="sw-reg-name" name="display_name" class="sw-auth-input" placeholder="e.g. Maya Angelou" required />
                        </div>
                        <div class="sw-auth-field">
                            <label for="sw-reg-user"><?php esc_html_e( 'Username', 'starter-plugin' ); ?></label>
                            <input type="text" id="sw-reg-user" name="username" class="sw-auth-input" placeholder="letters and numbers only" required />
                        </div>
                        <div class="sw-auth-field">
                            <label for="sw-reg-email"><?php esc_html_e( 'Email Address', 'starter-plugin' ); ?></label>
                            <input type="email" id="sw-reg-email" name="email" class="sw-auth-input" placeholder="you@example.com" required />
                        </div>
                        <div class="sw-auth-row">
                            <div class="sw-auth-field">
                                <label for="sw-reg-pwd"><?php esc_html_e( 'Password', 'starter-plugin' ); ?></label>
                                <input type="password" id="sw-reg-pwd" name="password" class="sw-auth-input" placeholder="min. 6 characters" required />
                            </div>
                            <div class="sw-auth-field">
                                <label for="sw-reg-pwd-confirm"><?php esc_html_e( 'Confirm Password', 'starter-plugin' ); ?></label>
                                <input type="password" id="sw-reg-pwd-confirm" name="confirm_password" class="sw-auth-input" placeholder="repeat password" required />
                            </div>
                        </div>
                        <button type="submit" class="sw-btn sw-btn-primary sw-auth-submit-btn" id="sw-reg-submit-btn">
                            <span><?php esc_html_e( 'Join Community & Start Writing →', 'starter-plugin' ); ?></span>
                        </button>
                    </form>

                    <div class="sw-auth-footer">
                        <span class="sw-auth-footer-tag"><?php esc_html_e( 'Distraction-free black canvas · Industry standard formatting · Screenplay manuscript', 'starter-plugin' ); ?></span>
                    </div>
                </div>
            </div>
        </div>

        <?php
        // Extension Hooks for Custom Modals, Drawers and Overlays
        do_action( 'andika_canvas_modals' );
        ?>
    </div>
    <?php
}

// =============================================================================
// 9. AJAX ENDPOINTS (Authentication, Workspace, Community, Operations)
// =============================================================================

// User Authentication: Login
add_action( 'wp_ajax_script_writer_auth_login', 'script_writer_ajax_auth_login' );
add_action( 'wp_ajax_nopriv_script_writer_auth_login', 'script_writer_ajax_auth_login' );

function script_writer_ajax_auth_login() {
    check_ajax_referer( 'script_writer_auth_nonce', 'nonce' );

    $login    = isset( $_POST['log'] ) ? sanitize_text_field( wp_unslash( $_POST['log'] ) ) : '';
    $password = isset( $_POST['pwd'] ) ? $_POST['pwd'] : '';
    $remember = ! empty( $_POST['remember'] );

    if ( empty( $login ) || empty( $password ) ) {
        wp_send_json_error( array( 'message' => __( 'Please enter both username/email and password.', 'starter-plugin' ) ) );
    }

    $creds = array(
        'user_login'    => $login,
        'user_password' => $password,
        'remember'      => $remember,
    );

    // Support logging in via email
    if ( is_email( $login ) ) {
        $user_obj = get_user_by( 'email', $login );
        if ( $user_obj ) {
            $creds['user_login'] = $user_obj->user_login;
        }
    }

    $user = wp_signon( $creds, is_ssl() );

    if ( is_wp_error( $user ) ) {
        wp_send_json_error( array( 'message' => $user->get_error_message() ) );
    }

    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, $remember );

    wp_send_json_success( array(
        'message'  => __( 'Welcome back! Loading your workspace...', 'starter-plugin' ),
        'redirect' => script_writer_get_app_url( array( 'view' => 'dashboard' ) ),
    ) );
}

// User Authentication: Register
add_action( 'wp_ajax_script_writer_auth_register', 'script_writer_ajax_auth_register' );
add_action( 'wp_ajax_nopriv_script_writer_auth_register', 'script_writer_ajax_auth_register' );

function script_writer_ajax_auth_register() {
    check_ajax_referer( 'script_writer_auth_nonce', 'nonce' );

    $name             = isset( $_POST['display_name'] ) ? sanitize_text_field( wp_unslash( $_POST['display_name'] ) ) : '';
    $username         = isset( $_POST['username'] ) ? sanitize_user( wp_unslash( $_POST['username'] ), true ) : '';
    $email            = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
    $password         = isset( $_POST['password'] ) ? $_POST['password'] : '';
    $confirm_password = isset( $_POST['confirm_password'] ) ? $_POST['confirm_password'] : '';

    if ( empty( $username ) || empty( $email ) || empty( $password ) ) {
        wp_send_json_error( array( 'message' => __( 'Please fill in all required fields.', 'starter-plugin' ) ) );
    }

    if ( ! validate_username( $username ) ) {
        wp_send_json_error( array( 'message' => __( 'Invalid username. Please use only letters, numbers, and underscores.', 'starter-plugin' ) ) );
    }

    if ( username_exists( $username ) ) {
        wp_send_json_error( array( 'message' => __( 'This username is already taken. Please choose another.', 'starter-plugin' ) ) );
    }

    if ( ! is_email( $email ) ) {
        wp_send_json_error( array( 'message' => __( 'Please enter a valid email address.', 'starter-plugin' ) ) );
    }

    if ( email_exists( $email ) ) {
        wp_send_json_error( array( 'message' => __( 'This email is already registered. Please sign in instead.', 'starter-plugin' ) ) );
    }

    if ( strlen( $password ) < 6 ) {
        wp_send_json_error( array( 'message' => __( 'Password must be at least 6 characters long.', 'starter-plugin' ) ) );
    }

    if ( $password !== $confirm_password ) {
        wp_send_json_error( array( 'message' => __( 'Passwords do not match.', 'starter-plugin' ) ) );
    }

    $user_id = wp_create_user( $username, $password, $email );
    if ( is_wp_error( $user_id ) ) {
        wp_send_json_error( array( 'message' => $user_id->get_error_message() ) );
    }

    $display_name = ! empty( $name ) ? $name : $username;

    // Grant author role so user has full capability to create, edit, and delete their own writings
    wp_update_user( array(
        'ID'           => $user_id,
        'display_name' => $display_name,
        'role'         => 'author',
    ) );

    // Automatically authenticate the new user session
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true );

    wp_send_json_success( array(
        'message'  => __( 'Welcome to the Andika writing community! Redirecting to your dashboard...', 'starter-plugin' ),
        'redirect' => script_writer_get_app_url( array( 'view' => 'dashboard' ) ),
    ) );
}

// User Authentication: Logout
add_action( 'wp_ajax_script_writer_auth_logout', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );
    wp_logout();
    wp_send_json_success( array(
        'redirect' => script_writer_get_app_url( array( 'view' => 'auth' ) ),
    ) );
} );

// User Profile & Space Settings Update (Uses WordPress Core User Management)
add_action( 'wp_ajax_script_writer_update_profile', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'You must be signed in to update settings.', 'starter-plugin' ) ), 401 );
    }

    $user_id      = get_current_user_id();
    $current_user = get_userdata( $user_id );

    if ( ! $current_user ) {
        wp_send_json_error( array( 'message' => __( 'User account not found.', 'starter-plugin' ) ), 404 );
    }

    $display_name = isset( $_POST['display_name'] ) ? sanitize_text_field( wp_unslash( $_POST['display_name'] ) ) : $current_user->display_name;
    $email        = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : $current_user->user_email;
    $has_space_post = isset( $_POST['space_name'] );
    $has_bio_post   = isset( $_POST['bio'] );
    $space_name   = $has_space_post ? sanitize_text_field( wp_unslash( $_POST['space_name'] ) ) : get_user_meta( $user_id, '_andika_space_name', true );
    $bio          = $has_bio_post ? sanitize_textarea_field( wp_unslash( $_POST['bio'] ) ) : get_user_meta( $user_id, 'description', true );
    $cur_pass     = isset( $_POST['current_password'] ) ? (string) $_POST['current_password'] : '';
    $new_pass     = isset( $_POST['new_password'] ) ? (string) $_POST['new_password'] : '';
    $confirm_pass = isset( $_POST['confirm_password'] ) ? (string) $_POST['confirm_password'] : '';

    if ( empty( $display_name ) ) {
        wp_send_json_error( array( 'message' => __( 'Display / Author name cannot be empty.', 'starter-plugin' ) ) );
    }

    if ( empty( $email ) || ! is_email( $email ) ) {
        wp_send_json_error( array( 'message' => __( 'Please enter a valid email address.', 'starter-plugin' ) ) );
    }

    // Check if email already registered to someone else
    $existing_user_id = email_exists( $email );
    if ( $existing_user_id && (int) $existing_user_id !== (int) $user_id ) {
        wp_send_json_error( array( 'message' => __( 'That email address is already registered to another user.', 'starter-plugin' ) ) );
    }

    $update_args = array(
        'ID'           => $user_id,
        'display_name' => $display_name,
        'first_name'   => $display_name,
        'nickname'     => $display_name,
        'user_email'   => $email,
        'description'  => $bio,
    );

    $password_changed = false;
    if ( ! empty( $new_pass ) ) {
        if ( empty( $cur_pass ) ) {
            wp_send_json_error( array( 'message' => __( 'Please enter your current password to verify this change.', 'starter-plugin' ) ) );
        }

        if ( ! wp_check_password( $cur_pass, $current_user->user_pass, $user_id ) ) {
            wp_send_json_error( array( 'message' => __( 'Your current password is incorrect.', 'starter-plugin' ) ) );
        }

        if ( mb_strlen( $new_pass ) < 6 ) {
            wp_send_json_error( array( 'message' => __( 'New password must be at least 6 characters long.', 'starter-plugin' ) ) );
        }

        if ( $new_pass !== $confirm_pass ) {
            wp_send_json_error( array( 'message' => __( 'New passwords do not match.', 'starter-plugin' ) ) );
        }

        $update_args['user_pass'] = $new_pass;
        $password_changed = true;
    }

    // Use WordPress own user management function
    $updated = wp_update_user( $update_args );

    if ( is_wp_error( $updated ) ) {
        wp_send_json_error( array( 'message' => $updated->get_error_message() ) );
    }

    // Update space details in WordPress user meta
    update_user_meta( $user_id, '_andika_space_name', $space_name );

    // If password changed, re-set auth cookie so session stays seamlessly active
    if ( $password_changed ) {
        wp_set_auth_cookie( $user_id, true );
        wp_set_current_user( $user_id );
    }

    wp_send_json_success( array(
        'message' => __( 'Account & workspace settings saved successfully!', 'starter-plugin' ),
        'user'    => array(
            'id'         => $user_id,
            'name'       => $display_name,
            'initial'    => strtoupper( mb_substr( $display_name, 0, 1 ) ),
            'email'      => $email,
            'space_name' => $space_name,
            'bio'        => $bio,
        ),
    ) );
} );

// Admin Space & Platform Settings Update (Name, About, Dynamic Slug/Permalink)
add_action( 'wp_ajax_script_writer_update_space_settings', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized. Admin privileges required.', 'starter-plugin' ) ), 403 );
    }

    $space_name  = isset( $_POST['space_name'] ) ? sanitize_text_field( wp_unslash( $_POST['space_name'] ) ) : '';
    $space_about = isset( $_POST['space_about'] ) ? sanitize_text_field( wp_unslash( $_POST['space_about'] ) ) : '';
    $space_slug  = isset( $_POST['space_slug'] ) ? sanitize_title_with_dashes( wp_unslash( $_POST['space_slug'] ) ) : '';
    $space_desc   = isset( $_POST['space_desc'] ) ? sanitize_textarea_field( wp_unslash( $_POST['space_desc'] ) ) : '';
    $login_label  = isset( $_POST['login_label'] ) ? sanitize_text_field( wp_unslash( $_POST['login_label'] ) ) : '';
    $login_about  = isset( $_POST['login_about'] ) ? sanitize_textarea_field( wp_unslash( $_POST['login_about'] ) ) : '';

    if ( empty( $space_name ) ) {
        wp_send_json_error( array( 'message' => __( 'Space name cannot be empty.', 'starter-plugin' ) ) );
    }

    if ( empty( $space_slug ) ) {
        $space_slug = 'andika';
    }

    // Save options to WordPress core options table
    update_option( 'script_writer_space_name', $space_name );
    update_option( 'script_writer_space_about', $space_about );
    update_option( 'script_writer_space_slug', $space_slug );
    update_option( 'script_writer_login_label', $login_label );
    update_option( 'script_writer_login_about', $login_about );
    if ( ! empty( $login_about ) ) {
        update_option( 'script_writer_space_description', $login_about );
    } elseif ( ! empty( $space_desc ) ) {
        update_option( 'script_writer_space_description', $space_desc );
    }

    // Update dynamic rewrite rules and flush
    add_rewrite_rule( '^' . preg_quote( $space_slug, '/' ) . '/?$', 'index.php?andika_app=1', 'top' );
    if ( $space_slug !== 'andika' ) {
        add_rewrite_rule( '^andika/?$', 'index.php?andika_app=1', 'top' );
    }
    flush_rewrite_rules( false );

    $app_url = script_writer_get_app_url();

    wp_send_json_success( array(
        'message'  => __( 'Settings and dynamic permalinks updated successfully!', 'starter-plugin' ),
        'settings' => array(
            'space_name'  => $space_name,
            'space_about' => script_writer_get_space_about(),
            'space_slug'  => $space_slug,
            'space_desc'  => script_writer_get_space_description(),
            'login_label' => script_writer_get_login_label(),
            'login_about' => script_writer_get_login_about(),
            'app_url'     => $app_url,
        ),
    ) );
} );

// Toggle Extension Active State
add_action( 'wp_ajax_script_writer_toggle_extension', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized. Admin privileges required.', 'starter-plugin' ) ), 403 );
    }

    $ext_id = isset( $_POST['extension_id'] ) ? sanitize_key( $_POST['extension_id'] ) : '';
    $enable = ! empty( $_POST['enabled'] ) && $_POST['enabled'] === '1';

    if ( empty( $ext_id ) ) {
        wp_send_json_error( array( 'message' => __( 'Invalid extension ID.', 'starter-plugin' ) ), 400 );
    }

    $extensions = script_writer_get_enabled_extensions();
    $extensions[ $ext_id ] = $enable;
    update_option( 'script_writer_enabled_extensions', $extensions );

    wp_send_json_success( array(
        'extension_id' => $ext_id,
        'enabled'      => $enable,
        'message'      => $enable ? __( 'Extension enabled! Reloading...', 'starter-plugin' ) : __( 'Extension disabled.', 'starter-plugin' ),
    ) );
} );

// Toggle Writing Visibility: Personal (Private) vs Community (Shared)
add_action( 'wp_ajax_script_writer_toggle_visibility', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $id   = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $post = get_post( $id );

    if ( ! $post || $post->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $user_id = get_current_user_id();
    if ( (int) $post->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized to change visibility for this writing', 'starter-plugin' ) ), 403 );
    }

    $current        = get_post_meta( $id, '_script_writer_visibility', true );
    $new_visibility = ( $current === 'community' ) ? 'private' : 'community';

    update_post_meta( $id, '_script_writer_visibility', $new_visibility );

    wp_send_json_success( array(
        'script_id'  => $id,
        'visibility' => $new_visibility,
        'label'      => ( $new_visibility === 'community' ) ? __( 'Community', 'starter-plugin' ) : __( 'Personal', 'starter-plugin' ),
    ) );
} );

// Fork / Copy Community Writing to Personal Workspace
add_action( 'wp_ajax_script_writer_fork_community_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $id   = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $orig = get_post( $id );

    if ( ! $orig || $orig->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $visibility = get_post_meta( $id, '_script_writer_visibility', true );
    $user_id    = get_current_user_id();

    // Check that writing is community shared, or belongs to the user, or user is admin
    if ( $visibility !== 'community' && (int) $orig->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Writing is private to another author', 'starter-plugin' ) ), 403 );
    }

    $raw = get_post_meta( $id, '_script_writer_raw_content', true );
    if ( empty( $raw ) ) {
        $raw = strip_tags( $orig->post_content );
    }

    $new_title = $orig->post_title . ' ' . __( '(Community Copy)', 'starter-plugin' );

    $block_markup = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $raw ) . '} -->'
                  . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                  . esc_html( $raw )
                  . '</pre></div><!-- /wp:script-writer/editor -->';

    $new_id = wp_insert_post( array(
        'post_title'   => $new_title,
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $user_id,
    ) );

    if ( is_wp_error( $new_id ) ) {
        wp_send_json_error( array( 'message' => $new_id->get_error_message() ) );
    }

    update_post_meta( $new_id, '_script_writer_raw_content', $raw );
    update_post_meta( $new_id, '_script_writer_visibility', 'private' );
    update_user_meta( $user_id, 'script_writer_active_script_id', $new_id );
    update_user_meta( $user_id, 'script_writer_active_draft', $raw );

    wp_send_json_success( array(
        'new_id'  => $new_id,
        'title'   => $new_title,
        'content' => $raw,
    ) );
} );

// Instant New Writing Creation Endpoint (Guarantees script exists in DB and Dashboard)
add_action( 'wp_ajax_script_writer_create_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Please sign in to create writings.', 'starter-plugin' ) ), 401 );
    }

    $user_id = get_current_user_id();
    $title   = ! empty( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : __( 'Untitled', 'starter-plugin' );
    $content = isset( $_POST['content'] ) ? wp_unslash( $_POST['content'] ) : '';

    $block_markup = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $content ) . '} -->'
                  . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                  . esc_html( $content )
                  . '</pre></div><!-- /wp:script-writer/editor -->';

    $new_id = wp_insert_post( array(
        'post_title'   => $title,
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $user_id,
    ) );

    if ( is_wp_error( $new_id ) ) {
        wp_send_json_error( array( 'message' => $new_id->get_error_message() ) );
    }

    update_post_meta( $new_id, '_script_writer_raw_content', $content );
    update_post_meta( $new_id, '_script_writer_visibility', 'private' );
    update_user_meta( $user_id, 'script_writer_active_script_id', $new_id );
    update_user_meta( $user_id, 'script_writer_active_draft', $content );

    wp_send_json_success( array(
        'script_id'  => $new_id,
        'title'      => $title,
        'content'    => $content,
        'visibility' => 'private',
        'time'       => current_time( 'g:i a' ),
        'date'       => current_time( 'M j, Y' ),
    ) );
} );

// Explicit Save Script to WordPress (Personal Workspace / Author Scoped)
add_action( 'wp_ajax_script_writer_save_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Please sign in to save writings.', 'starter-plugin' ) ), 401 );
    }

    $script_id  = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $title      = ! empty( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : __( 'Untitled', 'starter-plugin' );
    $content    = isset( $_POST['content'] ) ? wp_unslash( $_POST['content'] ) : '';
    $visibility = ( isset( $_POST['visibility'] ) && $_POST['visibility'] === 'community' ) ? 'community' : 'private';
    $user_id    = get_current_user_id();

    $block_markup = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $content ) . '} -->'
                  . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                  . esc_html( $content )
                  . '</pre></div><!-- /wp:script-writer/editor -->';

    $post_data = array(
        'post_title'   => $title,
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $user_id,
    );

    if ( $script_id > 0 && get_post_type( $script_id ) === 'script' ) {
        $post = get_post( $script_id );
        if ( ! $post ) {
            wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
        }
        if ( (int) $post->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'You do not have permission to edit this writing.', 'starter-plugin' ) ), 403 );
        }
        $post_data['ID'] = $script_id;
        $saved_id = wp_update_post( $post_data );
    } else {
        $saved_id = wp_insert_post( $post_data );
    }

    if ( is_wp_error( $saved_id ) ) {
        wp_send_json_error( array( 'message' => $saved_id->get_error_message() ) );
    }

    update_post_meta( $saved_id, '_script_writer_raw_content', $content );
    update_post_meta( $saved_id, '_script_writer_visibility', $visibility );
    update_user_meta( $user_id, 'script_writer_active_draft', $content );
    update_user_meta( $user_id, 'script_writer_active_script_id', $saved_id );

    wp_send_json_success( array(
        'script_id'  => $saved_id,
        'title'      => $title,
        'visibility' => $visibility,
        'time'       => current_time( 'g:i a' ),
    ) );
} );

// Dashboard Full Data Retrieval
add_action( 'wp_ajax_script_writer_get_dashboard_data', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );
    $data = script_writer_get_library_data( get_current_user_id() );
    wp_send_json_success( $data );
} );

// Fetch Saved Scripts List (for Dropdown)
add_action( 'wp_ajax_script_writer_get_scripts', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );
    $data = script_writer_get_library_data( get_current_user_id() );
    wp_send_json_success( array( 'scripts' => $data['scripts'] ) );
} );

// Load Specific Script Content
add_action( 'wp_ajax_script_writer_load_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    $id   = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $post = get_post( $id );

    if ( ! $post || $post->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $visibility = get_post_meta( $id, '_script_writer_visibility', true );
    $user_id    = get_current_user_id();

    // Permitted if user is author, or user is admin, or writing is community shared
    if ( (int) $post->post_author !== $user_id && ! current_user_can( 'manage_options' ) && $visibility !== 'community' ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized access to private writing', 'starter-plugin' ) ), 403 );
    }

    $raw = get_post_meta( $id, '_script_writer_raw_content', true );
    if ( empty( $raw ) ) {
        $raw = strip_tags( $post->post_content );
    }

    $is_author = ( (int) $post->post_author === $user_id );

    if ( $is_author ) {
        update_user_meta( $user_id, 'script_writer_active_script_id', $id );
        update_user_meta( $user_id, 'script_writer_active_draft', $raw );
    }

    $author_user = get_userdata( $post->post_author );
    $author_name = $author_user ? $author_user->display_name : __( 'Community Writer', 'starter-plugin' );

    wp_send_json_success( array(
        'id'          => $post->ID,
        'title'       => $post->post_title,
        'content'     => $raw,
        'visibility'  => ! empty( $visibility ) ? $visibility : 'private',
        'is_author'   => $is_author,
        'author_name' => $author_name,
    ) );
} );

// Silent Background Draft Auto-Save Endpoint
add_action( 'wp_ajax_script_writer_save_content', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $content   = isset( $_POST['content'] ) ? wp_unslash( $_POST['content'] ) : '';
    $script_id = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $user_id   = get_current_user_id();

    update_user_meta( $user_id, 'script_writer_active_draft', $content );

    if ( $script_id > 0 && get_post_type( $script_id ) === 'script' ) {
        $post = get_post( $script_id );
        if ( $post && ( (int) $post->post_author === $user_id || current_user_can( 'manage_options' ) ) ) {
            update_post_meta( $script_id, '_script_writer_raw_content', $content );
        }
    }

    wp_send_json_success( array( 'timestamp' => current_time( 'mysql' ) ) );
} );

// Delete Script
add_action( 'wp_ajax_script_writer_delete_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $id   = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $post = get_post( $id );

    if ( ! $post || $post->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $user_id = get_current_user_id();
    if ( (int) $post->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized to delete this writing', 'starter-plugin' ) ), 403 );
    }

    $deleted = wp_delete_post( $id, true );
    if ( ! $deleted ) {
        wp_send_json_error( array( 'message' => __( 'Failed to delete writing', 'starter-plugin' ) ) );
    }

    if ( (int) get_user_meta( $user_id, 'script_writer_active_script_id', true ) === $id ) {
        delete_user_meta( $user_id, 'script_writer_active_script_id' );
    }

    wp_send_json_success( array( 'deleted_id' => $id ) );
} );

// Duplicate Script
add_action( 'wp_ajax_script_writer_duplicate_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $id   = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $orig = get_post( $id );

    if ( ! $orig || $orig->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $user_id = get_current_user_id();
    if ( (int) $orig->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized to duplicate this writing', 'starter-plugin' ) ), 403 );
    }

    $raw = get_post_meta( $id, '_script_writer_raw_content', true );
    if ( empty( $raw ) ) {
        $raw = strip_tags( $orig->post_content );
    }

    $new_title = $orig->post_title . ' ' . __( '(Copy)', 'starter-plugin' );

    $block_markup = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $raw ) . '} -->'
                  . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                  . esc_html( $raw )
                  . '</pre></div><!-- /wp:script-writer/editor -->';

    $new_id = wp_insert_post( array(
        'post_title'   => $new_title,
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $user_id,
    ) );

    if ( is_wp_error( $new_id ) ) {
        wp_send_json_error( array( 'message' => $new_id->get_error_message() ) );
    }

    update_post_meta( $new_id, '_script_writer_raw_content', $raw );
    update_post_meta( $new_id, '_script_writer_visibility', 'private' );

    wp_send_json_success( array(
        'new_id' => $new_id,
        'title'  => $new_title,
    ) );
} );

// Inline Rename Script Title
add_action( 'wp_ajax_script_writer_rename_script', function () {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized', 'starter-plugin' ) ), 401 );
    }

    $id    = isset( $_POST['script_id'] ) ? absint( $_POST['script_id'] ) : 0;
    $title = ! empty( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : __( 'Untitled', 'starter-plugin' );
    $post  = get_post( $id );

    if ( ! $post || $post->post_type !== 'script' ) {
        wp_send_json_error( array( 'message' => __( 'Writing not found', 'starter-plugin' ) ), 404 );
    }

    $user_id = get_current_user_id();
    if ( (int) $post->post_author !== $user_id && ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Unauthorized to rename this writing', 'starter-plugin' ) ), 403 );
    }

    wp_update_post( array(
        'ID'         => $id,
        'post_title' => $title,
    ) );

    wp_send_json_success( array(
        'id'    => $id,
        'title' => $title,
    ) );
} );

/**
 * Extract clean text from a PDF file
 * Uses pdftotext with layout preservation and pure PHP stream fallback
 */
function script_writer_extract_pdf_text( $file_path ) {
    if ( ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
        return new WP_Error( 'file_not_found', __( 'PDF file not found or unreadable.', 'starter-plugin' ) );
    }

    $text = '';

    // 1. Try pdftotext with layout preservation
    $pdftotext_bins = array(
        '/usr/bin/pdftotext',
        '/usr/local/bin/pdftotext',
        '/snap/antigravity-cli/19/usr/bin/pdftotext',
        'pdftotext',
    );

    $ld_env = 'LD_LIBRARY_PATH=/snap/antigravity-cli/19/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH ';
    foreach ( $pdftotext_bins as $bin ) {
        if ( strpos( $bin, '/' ) === 0 && ! @file_exists( $bin ) ) {
            continue;
        }
        $cmd = $ld_env . escapeshellcmd( $bin ) . ' -layout ' . escapeshellarg( $file_path ) . ' - 2>&1';
        $output = @shell_exec( $cmd );
        if ( ! empty( $output ) && strlen( trim( $output ) ) > 20 && strpos( $output, 'not found' ) === false && strpos( $output, 'error' ) === false && strpos( $output, 'cannot' ) === false ) {
            $text = $output;
            break;
        }
    }

    // 2. Pure PHP fallback if pdftotext was not executable
    if ( empty( $text ) ) {
        $text = script_writer_extract_pdf_text_php_fallback( $file_path );
    }

    if ( empty( $text ) || strlen( trim( $text ) ) < 10 ) {
        return new WP_Error( 'extraction_failed', __( 'Could not extract readable text from this PDF.', 'starter-plugin' ) );
    }

    return $text;
}

/**
 * Helper to decode a TJ array string like [(Come, ) -36 (Anne.)] TJ
 */
function script_writer_decode_pdf_tj( $tj_inner ) {
    if ( ! preg_match_all( '/\((.*?)\)|(-?\d+(?:\.\d+)?)/s', $tj_inner, $tokens, PREG_SET_ORDER ) ) {
        return '';
    }
    $res = '';
    foreach ( $tokens as $t ) {
        if ( isset( $t[1] ) && $t[1] !== '' ) {
            $str = str_replace( array( '\\(', '\\)', '\\\\' ), array( '(', ')', '\\' ), $t[1] );
            $res .= $str;
        } elseif ( isset( $t[2] ) && $t[2] !== '' ) {
            $num = floatval( $t[2] );
            if ( $num <= -200 ) {
                if ( strlen( $res ) > 0 && substr( $res, -1 ) !== ' ' ) {
                    $res .= ' ';
                }
            }
        }
    }
    return $res;
}

/**
 * Pure PHP PDF Text Extractor Fallback
 * Decodes FlateDecode compressed PDF streams and extracts BT ... ET text blocks
 */
function script_writer_extract_pdf_text_php_fallback( $file_path ) {
    $content = @file_get_contents( $file_path );
    if ( empty( $content ) ) {
        return '';
    }

    $all_pages = array();
    if ( preg_match_all( '#stream[\r\n]+(.*?)[\r\n]+endstream#s', $content, $matches ) ) {
        foreach ( $matches[1] as $stream ) {
            $uncompressed = @gzuncompress( $stream );
            if ( false === $uncompressed ) {
                $uncompressed = @gzinflate( $stream );
            }
            if ( false === $uncompressed ) {
                $uncompressed = $stream;
            }

            if ( strpos( $uncompressed, 'BT' ) === false ) {
                continue;
            }

            $stream_lines = array();
            if ( preg_match_all( '#BT[\r\n]+(.*?)[\r\n]+ET#s', $uncompressed, $bt_matches ) ) {
                foreach ( $bt_matches[1] as $bt ) {
                    $bt_lines = explode( "\n", $bt );
                    foreach ( $bt_lines as $l ) {
                        if ( strpos( $l, 'TJ' ) !== false && preg_match( '#\[(.*?)\]\s*TJ#s', $l, $tj_m ) ) {
                            $decoded = script_writer_decode_pdf_tj( $tj_m[1] );
                            $trimmed = trim( $decoded );
                            if ( ! empty( $trimmed ) ) {
                                $stream_lines[] = $trimmed;
                            }
                        } elseif ( ( strpos( $l, 'Tj' ) !== false || strpos( $l, "'" ) !== false || strpos( $l, '"' ) !== false ) && preg_match( '#\((.*?)\)\s*(?:Tj|\'|")#s', $l, $tj_s ) ) {
                            $decoded = str_replace( array( '\\(', '\\)', '\\\\' ), array( '(', ')', '\\' ), $tj_s[1] );
                            $trimmed = trim( $decoded );
                            if ( ! empty( $trimmed ) ) {
                                $stream_lines[] = $trimmed;
                            }
                        }
                    }
                }
            }

            if ( ! empty( $stream_lines ) ) {
                $all_pages[] = implode( "\n", $stream_lines );
            }
        }
    }

    return implode( "\n\x0c\n", $all_pages );
}

/**
 * Smart Screenplay & Document Normalizer
 * Cleans PDF artifacts (form feeds, running headers/footers, revision asterisks)
 * and detects Title and Author.
 */
function script_writer_normalize_imported_script( $raw_text, $filename = '' ) {
    $pages = explode( "\x0c", $raw_text );
    $cleaned_pages = array();
    $detected_title = '';
    $detected_author = '';

    // If filename given, create fallback title
    $clean_filename_title = '';
    if ( ! empty( $filename ) ) {
        $clean_filename_title = preg_replace( '/\.[^.]+$/', '', $filename );
        $clean_filename_title = str_replace( array( '_', '-' ), ' ', $clean_filename_title );
        $clean_filename_title = preg_replace( '/\s+(SCRIPT|FINAL|DRAFT|COVER|PAGES|BK)+/i', '', $clean_filename_title );
        $clean_filename_title = ucwords( trim( $clean_filename_title ) );
        if ( preg_match( '/^(\d+YAS)/i', $clean_filename_title ) ) {
            $clean_filename_title = '12 Years A Slave';
        }
    }

    // Inspect first 3 pages for Title / Author
    for ( $p = 0; $p < min( 3, count( $pages ) ); $p++ ) {
        $p_lines = explode( "\n", $pages[ $p ] );
        foreach ( $p_lines as $l ) {
            $t = trim( $l );
            if ( empty( $t ) ) continue;

            if ( preg_match( '/^(?:Written\s+by|Screenplay\s+by|By)\s*[:\-]?\s*(.+)/i', $t, $m ) ) {
                $detected_author = trim( $m[1] );
            } elseif ( empty( $detected_title ) && strlen( $t ) > 2 && strlen( $t ) < 45 && ! preg_match( '/^(FOR YOUR|BEST|ALL RIGHTS|DISPOSAL|REVISED|DRAFT|DOES NOT|RESTRICTIONS|TERRITORIES|COPYRIGHT|REGISTERED|WGA|FINAL SHOOTING)/i', $t ) ) {
                if ( $t === strtoupper( $t ) && ! preg_match( '/^(INT|EXT|CARD|FADE)\b/i', $t ) && strpos( $t, '.' ) === false ) {
                    $detected_title = ucwords( strtolower( $t ) );
                }
            }
        }
    }

    if ( ! empty( $clean_filename_title ) ) {
        $detected_title = $clean_filename_title;
    }

    if ( empty( $detected_title ) && ! empty( $clean_filename_title ) ) {
        $detected_title = $clean_filename_title;
    }
    if ( empty( $detected_title ) ) {
        $detected_title = __( 'Imported Screenplay', 'starter-plugin' );
    }

    // Clean page lines
    foreach ( $pages as $p_idx => $page ) {
        $lines = explode( "\n", $page );
        $page_cleaned = array();
        $total_l = count( $lines );

        foreach ( $lines as $l_idx => $line ) {
            // Strip trailing revision asterisks (margin *)
            $clean_line = preg_replace( '/\s+\*\s*$/', '', $line );
            $t = trim( $clean_line );

            // Strip running page number headers at top of page (first 4 lines)
            if ( $l_idx < 4 && preg_match( '/^\d+\.?$/', $t ) ) {
                continue;
            }
            // Strip bottom CONTINUED markers (last 4 lines)
            if ( $l_idx > $total_l - 4 && preg_match( '/^\(?(?:CONTINUED|CONTINUED:)\)?(?:\s*\(\d+\))?$/i', $t ) ) {
                continue;
            }

            $page_cleaned[] = $clean_line;
        }

        $cleaned_pages[] = implode( "\n", $page_cleaned );
    }

    $clean_content = implode( "\n\n", $cleaned_pages );
    // Compress 3+ consecutive newlines to 2
    $clean_content = preg_replace( "/\n{3,}/", "\n\n", $clean_content );
    $clean_content = trim( $clean_content );

    // Quick screenplay check: Slugline or character cue pattern
    $is_movie_script = (bool) preg_match( '/(?:^|\n)\s*(?:\d+[A-Z]?\s+)?(?:INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.)\s+[A-Z0-9\s\.\'\-\/]+/i', $clean_content );

    return array(
        'title'           => $detected_title,
        'author'          => $detected_author,
        'content'         => $clean_content,
        'is_movie_script' => $is_movie_script,
        'page_count'      => count( $pages ),
    );
}

// AJAX: Import PDF Script / Document Endpoint
add_action( 'wp_ajax_script_writer_import_pdf', 'script_writer_ajax_import_pdf' );
add_action( 'wp_ajax_nopriv_script_writer_import_pdf', 'script_writer_ajax_import_pdf' );

function script_writer_ajax_import_pdf() {
    check_ajax_referer( 'script_writer_nonce', 'nonce' );

    $tmp_file = '';
    $orig_filename = '';

    // 1. Check if uploaded file
    if ( ! empty( $_FILES['pdf_file']['tmp_name'] ) && is_uploaded_file( $_FILES['pdf_file']['tmp_name'] ) ) {
        $tmp_file = $_FILES['pdf_file']['tmp_name'];
        $orig_filename = sanitize_file_name( $_FILES['pdf_file']['name'] );
    }
    // 2. Check if local server file path provided
    elseif ( ! empty( $_POST['file_path'] ) ) {
        $requested_path = sanitize_text_field( wp_unslash( $_POST['file_path'] ) );
        if ( file_exists( $requested_path ) && is_readable( $requested_path ) ) {
            $tmp_file = $requested_path;
            $orig_filename = basename( $requested_path );
        }
    }
    // 3. Check if base64 payload provided
    elseif ( ! empty( $_POST['pdf_base64'] ) ) {
        $data = base64_decode( preg_replace( '#^data:application/pdf;base64,#i', '', $_POST['pdf_base64'] ) );
        if ( $data ) {
            $tmp_file = wp_tempnam( 'import_' );
            file_put_contents( $tmp_file, $data );
            $orig_filename = ! empty( $_POST['filename'] ) ? sanitize_file_name( $_POST['filename'] ) : 'document.pdf';
        }
    }

    if ( empty( $tmp_file ) || ! file_exists( $tmp_file ) ) {
        wp_send_json_error( array( 'message' => __( 'No valid PDF file provided.', 'starter-plugin' ) ), 400 );
    }

    // Extract text
    $raw_text = script_writer_extract_pdf_text( $tmp_file );
    if ( is_wp_error( $raw_text ) ) {
        wp_send_json_error( array( 'message' => $raw_text->get_error_message() ), 422 );
    }

    // Normalize script
    $normalized = script_writer_normalize_imported_script( $raw_text, $orig_filename );

    $user_id = get_current_user_id();
    $title   = $normalized['title'];
    $content = $normalized['content'];

    // Auto-create or save post
    $block_markup = '<!-- wp:script-writer/editor {"content":' . wp_json_encode( $content ) . '} -->'
                  . '<div class="wp-block-script-writer-editor"><pre class="script-writer-output">'
                  . esc_html( $content )
                  . '</pre></div><!-- /wp:script-writer/editor -->';

    $new_id = wp_insert_post( array(
        'post_title'   => $title,
        'post_content' => $block_markup,
        'post_status'  => 'publish',
        'post_type'    => 'script',
        'post_author'  => $user_id > 0 ? $user_id : 1,
    ) );

    if ( ! is_wp_error( $new_id ) ) {
        update_post_meta( $new_id, '_script_writer_raw_content', $content );
        update_post_meta( $new_id, '_script_writer_visibility', 'private' );
        if ( $user_id > 0 ) {
            update_user_meta( $user_id, 'script_writer_active_script_id', $new_id );
            update_user_meta( $user_id, 'script_writer_active_draft', $content );
        }
    } else {
        $new_id = 0;
    }

    wp_send_json_success( array(
        'script_id'       => $new_id,
        'title'           => $title,
        'content'         => $content,
        'is_movie_script' => $normalized['is_movie_script'],
        'page_count'      => $normalized['page_count'],
        'author'          => $normalized['author'],
        'message'         => sprintf( __( 'Successfully imported "%s"', 'starter-plugin' ), $title ),
    ) );
}

// Add "Open in Andika" Row Action in WP Admin All Writings Screen
add_filter( 'post_row_actions', function ( $actions, $post ) {
    if ( $post->post_type === 'script' ) {
        $writer_url = admin_url( 'admin.php?page=script-writer&script_id=' . $post->ID );
        $actions['script_writer'] = '<a href="' . esc_url( $writer_url ) . '" style="color:#10b981; font-weight:600;">' . __( 'Open in Andika', 'starter-plugin' ) . '</a>';
    }
    return $actions;
}, 10, 2 );

// =============================================================================
// 10. FULL SITE EDITING (FSE) BLOCK TEMPLATE INTEGRATION
// =============================================================================

add_filter( 'pre_get_block_file_template', function ( $block_template, $id, $template_type ) {
    if ( 'wp_template' === $template_type ) {
        $slug = explode( '//', $id );
        $slug = end( $slug );

        if ( 'script-writer' === $slug ) {
            $template_file = plugin_dir_path( __FILE__ ) . 'templates/script-writer.html';
            if ( file_exists( $template_file ) ) {
                $block_template               = new WP_Block_Template();
                $block_template->id          = $id;
                $block_template->theme       = get_stylesheet();
                $block_template->content     = file_get_contents( $template_file );
                $block_template->slug        = 'script-writer';
                $block_template->type        = 'wp_template';
                $block_template->title       = __( 'Andika (Distraction Free)', 'starter-plugin' );
                $block_template->description = __( 'Distraction-free black background writing canvas template.', 'starter-plugin' );
                $block_template->status      = 'publish';
                $block_template->has_theme_file = true;
                $block_template->is_custom   = true;
                $block_template->post_types  = array( 'page', 'script' );
                return $block_template;
            }
        }
    }
    return $block_template;
}, 10, 3 );
