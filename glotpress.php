<?php
/**
 * @package GlotPress
 */
/*
Plugin Name: GlotPress
Plugin URI: https://wordpress.org/plugins/glotpress/
Description: GlotPress is a tool to help translators collaborate.
Version: 1.0-alpha
Author: the GlotPress team
Author URI: http://glotpress.org
License: GPLv2 or later
Text Domain: glotpress
*/

/*
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

define( 'GP_VERSION', '1.0-alpha-1100' );
define( 'GP_DB_VERSION', '940' );
define( 'GP_ROUTING', true );
define( 'GP_PLUGIN_FILE', __FILE__ );
define( 'GP_PATH', dirname( __FILE__ ) . '/' );
define( 'GP_INC', 'gp-includes/' );
define( 'GP_WP_REQUIRED_VERSION', '4.4' );

// This adds a row after GlotPress in the plugin page IF an incompatible version of WordPress is running.
function gp_after_plugin_row() {
	global $wp_version;
?>
	<tr>
		<th scope="row" class="check-column">
		</th>
		<td class="plugin-title" colspan="10">
			<span style="padding: 3px; color: black; background-color: yellow	; font-weight: bold">
			&nbsp;&nbsp;
			<?php echo sprintf(__('WARNING: GlotPress has detected an unsupported version of WordPress, WordPress Version %s or higher is required! Your current WordPress version is %s.'), GP_WP_REQUIRED_VERSION, $wp_version ); ?>
			&nbsp;&nbsp;
			</span>
		</td>
	</tr>
	
<?php
}

global $wp_version;

// Check the WP version, if we don't meet the minimum version to run GlotPress return so we don't cause any errors and add a warning to the plugin row.
if ( !version_compare( $wp_version, GP_WP_REQUIRED_VERSION, '>=' ) ) { 
	add_action('after_plugin_row_' . plugin_basename( __FILE__ ), 'gp_after_plugin_row', 10, 2);
	
	// Normally we'd just do a "return" here to avoid loading the rest of the plugin, however since we may have already set the rewrite rules, this would cause issues, so instead define a new constant and we'll check for it later when we go to run the router code.
	define( 'GP_UNSUPPORTED', true );
} 

require_once GP_PATH . 'gp-settings.php';

/**
 * Perform necessary actions on activation
 *
 * @since 1.0.0
 */
function gp_activate_plugin() {
	$admins = GP::$permission->find_one( array( 'action' => 'admin' ) );
	if ( ! $admins ) {
		GP::$permission->create( array( 'user_id' => get_current_user_id(), 'action' => 'admin' ) );
	}
}
register_activation_hook( GP_PLUGIN_FILE, 'gp_activate_plugin' );

/**
 * Run the plugin de-activation code.
 *
 * @since 1.0.0
 *
 * @param bool $network_wide Whether the plugin is deactivated for all sites in the network
 *                           or just the current site.
 */
function gp_deactivate_plugin( $network_wide ) {

	/*
	 * Flush the rewrite rule option so it will be re-generated next time the plugin is activated.
	 * If network deactivating, ensure we flush the option on every site.
	 */
	if ( $network_wide ) {
		$sites = wp_get_sites();

		foreach ( $sites as $site ) {
			switch_to_blog( $site['blog_id'] );
			update_option( 'gp_rewrite_rule', '' );
			restore_current_blog();
		}
	} else {
		update_option( 'gp_rewrite_rule', '' );
	}

}
register_deactivation_hook( GP_PLUGIN_FILE, 'gp_deactivate_plugin' );

// Load the plugin's translated strings
load_plugin_textdomain( 'glotpress', false, dirname( plugin_basename( GP_PLUGIN_FILE ) ) . '/languages/' );
