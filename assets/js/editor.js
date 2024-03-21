/* global $gp_editor_options, $gp, Intl, wp */
/* eslint camelcase: "off" */
$gp.editor = (
	function( $ ) {
		return {
			current: null,
			original_translations: null,
			init: function( table ) {
				var $previewRows;

				$gp.init();
				$gp.editor.table = table;
				$gp.editor.install_hooks();

				// Open the first editor if the current table has only one.
				$previewRows = $gp.editor.table.find( 'tr.preview' );
				if ( 1 === $previewRows.length ) {
					$gp.editor.show( $previewRows.eq( 0 ) );
				}
			},
			original_id_from_row_id: function( row_id ) {
				return row_id.split( '-' )[ 0 ];
			},
			translation_id_from_row_id: function( row_id ) {
				return row_id.split( '-' )[ 1 ];
			},
			translation_status_from_row: function( editor ) {
				// CSS classes and their actual statuses.
				var statuses = {
					untranslated: 'untranslated',
					'status-current': 'translated',
					'status-waiting': 'waiting',
					'status-changesrequested': 'changesrequested',
					'status-fuzzy': 'fuzzy',
					'status-old': 'old',
					'status-rejected': 'rejected',
				};
				var classes = editor.attr( 'class' ).split( ' ' );
				var status = false;
				var hasWarnings = false;
				var hasCurrent = false;
				var hasWaiting = false;
				var hasFuzzy = false;
				$.each( classes, function( index, value ) {
					if ( statuses.hasOwnProperty( value ) ) {
						status = statuses[ value ];
					}
					if ( value === 'has-warnings' ) {
						hasWarnings = true;
					}
					if ( value === 'has-current' ) {
						hasCurrent = true;
					}
					if ( value === 'has-waiting' ) {
						hasWaiting = true;
					}
					if ( value === 'has-fuzzy' ) {
						hasFuzzy = true;
					}
				} );
				return {
					status: status,
					hasWarnings: hasWarnings,
					hasCurrent: hasCurrent,
					hasWaiting: hasWaiting,
					hasFuzzy: hasFuzzy,
				};
			},
			update_word_count: function( element ) {
				var string;
				var count_characters;
				var count_words;
				var html;

				// Update counts for all row textareas (singular and plurals).
				$( element.target ).parents( 'div.strings' ).find( 'div.textareas' ).each( function() {
					string = $( this ).find( 'textarea' ).val();
					count_characters = wp.wordcount.count( string, 'characters_including_spaces' );
					count_words = wp.wordcount.count( string, $gp_editor_options.word_count_type );

					html = wp.i18n.sprintf(
						'<span class="characters">%1$s</span> • <span class="words">%2$s</span>',
						wp.i18n.sprintf(
							/* translators: %d: Characters count. */
							wp.i18n._n( '%d Character', '%d Characters', count_characters, 'glotpress' ),
							count_characters
						),
						wp.i18n.sprintf(
							/* translators: %d: Words count. */
							wp.i18n._n( '%d Word', '%d Words', count_words, 'glotpress' ),
							count_words
						)
					);

					// Update counts HTML.
					$( this ).find( 'div.counts' ).html( html );
				} );
			},
			update_filter_count: function( status, action ) {
				var status_filter, count;

				// Get User Locale.
				var userLocale = $gp_editor_options.user_locale;

				var filter_toolbar = $( 'form#upper-filters-toolbar' );

				if ( status === 'current' ) {
					status = 'translated';
				}

				status_filter = filter_toolbar.find( 'a.' + status );
				count = status_filter.attr( 'data-count' );

				switch ( action ) {
					case 'add':
						// Increase status count.
						++count;
						break;
					case 'remove':
						// Decrease status count.
						--count;
						break;
				}

				// Update filters data-attributes.
				$( status_filter ).attr( 'data-count', count );

				/**
				 * Update translation filter counts.
				 *
				 * Until there isn't a proper function like number_format_i18n() for js, use Intl.NumberFormat based on WP user locale slug ('en', 'pt', etc.).
				 * https://github.com/WordPress/gutenberg/issues/22628
				 */
				$( status_filter ).find( 'span.count' ).text( new Intl.NumberFormat( userLocale.slug ).format( count ) );
			},
			show: function( element ) {
				var row_id = element.closest( 'tr' ).attr( 'row' );
				var editor = $( '#editor-' + row_id );
				var gmt_date_added = $( '#gmt-date-added-' + row_id );
				var local_date_added = $( '#local-date-added-' + row_id );
				var offset = new Date().getTimezoneOffset();
				var gmt_date = new Date( gmt_date_added.text() );
				var local_date = new Date( ( gmt_date - ( offset * 60 * 1000 ) ) );

				if ( ! editor.length ) {
					return;
				}
				if ( $gp.editor.current ) {
					$gp.editor.hide();
				}
				editor.preview = $( '#preview-' + row_id );
				editor.row_id = row_id;
				editor.original_id = $gp.editor.original_id_from_row_id( row_id );
				editor.translation_id = $gp.editor.translation_id_from_row_id( row_id );
				editor.translation_status = $gp.editor.translation_status_from_row( editor ).status;
				editor.translation_has_current = $gp.editor.translation_status_from_row( editor ).hasCurrent;
				editor.translation_has_waiting = $gp.editor.translation_status_from_row( editor ).hasWaiting;
				editor.translation_has_fuzzy = $gp.editor.translation_status_from_row( editor ).hasFuzzy;
				editor.translation_warnings = $gp.editor.translation_status_from_row( editor ).hasWarnings;

				editor.original_translations = $( 'textarea[name="translation[' + editor.original_id + '][]"]', editor ).map( function() {
					return this.value;
				} ).get();

				$gp.editor.current = editor;

				local_date_added.text( local_date.toLocaleDateString() + ' ' + local_date.toLocaleTimeString() );

				editor.show();
				editor.preview.hide();
				$( 'textarea:first', editor ).focus();
			},
			prev: function() {
				var prev;
				if ( ! $gp.editor.current ) {
					return;
				}

				// TODO: go to previous page if needed
				prev = $gp.editor.current.prevAll( 'tr.editor' );
				if ( prev.length ) {
					$gp.editor.show( prev.eq( 0 ) );
				} else {
					$gp.editor.hide();
				}
			},
			next: function() {
				var next;

				if ( ! $gp.editor.current ) {
					return;
				}

				// TODO: go to next page if needed.
				next = $gp.editor.current.nextAll( 'tr.editor' );
				if ( next.length ) {
					$gp.editor.show( next.eq( 0 ) );
				} else {
					$gp.editor.hide();
				}
			},
			hide: function( editor ) {
				editor = editor ? editor : $gp.editor.current;
				if ( ! editor ) {
					return;
				}
				editor.hide();
				editor.preview.show();
				$gp.editor.current = null;
			},
			install_hooks: function() {
				$( $gp.editor.table )
					.on( 'click', 'a.edit', $gp.editor.hooks.show )
					.on( 'dblclick', 'tr.preview td', $gp.editor.hooks.show )
					.on( 'change', 'select.priority', $gp.editor.hooks.set_priority )
					.on( 'click', 'button.close', $gp.editor.hooks.cancel )
					.on( 'click', 'a.discard-warning', $gp.editor.hooks.discard_warning )
					.on( 'click', 'button.copy', $gp.editor.hooks.copy )
					.on( 'click', 'button.inserttab', $gp.editor.hooks.tab )
					.on( 'click', 'button.insertnl', $gp.editor.hooks.newline )
					.on( 'click', 'button.approve', $gp.editor.hooks.set_status_current )
					.on( 'click', 'button.reject', $gp.editor.hooks.set_status_rejected )
					.on( 'click', 'button.changesrequested', $gp.editor.hooks.set_status_changesrequested )
					.on( 'click', 'button.fuzzy', $gp.editor.hooks.set_status_fuzzy )
					.on( 'click', 'button.ok', $gp.editor.hooks.ok )
					.on( 'keydown', 'tr.editor textarea', $gp.editor.hooks.keydown )
					.on( 'focus input', 'tr.editor textarea.foreign-text', $gp.editor.hooks.update_word_count );
				$( '#translations' ).tooltip( {
					items: '.glossary-word',
					content: function() {
						var content = $( '<ul>' );
						$.each( $( this ).data( 'translations' ), function( i, e ) {
							var def = $( '<li>' );
							if ( e.locale_entry ) {
								def.append( $( '<span>', { text: e.locale_entry } ).addClass( 'locale-entry bubble' ) );
							}
							def.append( $( '<span>', { text: e.pos } ).addClass( 'pos' ) );
							def.append( $( '<span>', { text: e.translation } ).addClass( 'translation' ) );
							def.append( $( '<span>', { text: e.comment } ).addClass( 'comment' ) );
							content.append( def );
						} );
						return content;
					},
					hide: false,
					show: false,
				} );

				$.valHooks.textarea = {
					get: function( elem ) {
						return elem.value.replace( /\r?\n/g, '\r\n' );
					},
				};
			},
			keydown: function( e ) {
				var target, container, approve, reject, copy;

				if ( 27 === e.keyCode || ( 90 === e.keyCode && e.shiftKey && e.ctrlKey ) ) { // Escape or Ctrl-Shift-Z = Cancel.
					$gp.editor.hide();
				} else if ( 33 === e.keyCode || ( 38 === e.keyCode && e.ctrlKey ) ) { // Page Up or Ctrl-Up Arrow = Previous editor.
					$gp.editor.prev();
				} else if ( 34 === e.keyCode || ( 40 === e.keyCode && e.ctrlKey ) ) { // Page Down or Ctrl-Down Arrow = Next editor.
					$gp.editor.next();
				} else if ( 13 === e.keyCode && e.shiftKey ) { // Shift-Enter = Save.
					target = $( e.target );

					if ( 0 === e.altKey && target.val().length ) {
						container = target.closest( '.textareas' ).prev();

						if ( container.children() ) {
							target.val( container.find( '.original' ).text() );
						} else {
							target.val( container.text() );
						}
					}

					if ( target.nextAll( 'textarea' ).length ) {
						target.nextAll( 'textarea' ).eq( 0 ).focus();
					} else {
						$gp.editor.save( target.parents( 'tr.editor' ).find( 'button.ok' ) );
					}
				} else if ( ( 13 === e.keyCode && e.ctrlKey ) || ( 66 === e.keyCode && e.shiftKey && e.ctrlKey ) ) { // Ctrl-Enter or Ctrl-Shift-B = Copy original.
					copy = $( '.editor:visible' ).find( '.copy' );

					if ( copy.length > 0 ) {
						copy.trigger( 'click' );
					}
				} else if ( ( 107 === e.keyCode && e.ctrlKey ) || ( 65 === e.keyCode && e.shiftKey && e.ctrlKey ) ) { // Ctrl-+ or Ctrl-Shift-A = Approve.
					approve = $( '.editor:visible' ).find( '.approve' );

					if ( approve.length > 0 ) {
						approve.trigger( 'click' );
					}
				} else if ( ( 109 === e.keyCode && e.ctrlKey ) || ( 82 === e.keyCode && e.shiftKey && e.ctrlKey ) ) { // Ctrl-- or Ctrl-Shift-R = Reject.
					reject = $( '.editor:visible' ).find( '.reject' );

					if ( reject.length > 0 ) {
						reject.trigger( 'click' );
					}
				} else if ( ( 192 === e.keyCode && e.ctrlKey ) || ( 192 === e.keyCode && e.shiftKey && e.ctrlKey ) ) { // Ctrl-~ or Ctrl-Shift-~ = Fuzzy.
					reject = $( '.editor:visible' ).find( '.fuzzy' );

					if ( reject.length > 0 ) {
						reject.trigger( 'click' );
					}
				} else {
					return true;
				}

				return false;
			},
			replace_current: function( html ) {
				var old_current;

				if ( ! $gp.editor.current ) {
					return;
				}
				$gp.editor.current.after( html );
				old_current = $gp.editor.current;
				old_current.attr( 'id', old_current.attr( 'id' ) + '-old' );
				old_current.preview.attr( 'id', old_current.preview.attr( 'id' ) + '-old' );
				$gp.editor.next();
				old_current.preview.remove();
				old_current.remove();
			},
			save: function( button ) {
				var editor, textareaName,
					data = [],
					translations;

				if ( ! $gp.editor.current ) {
					return;
				}

				editor = $gp.editor.current;
				button.prop( 'disabled', true );
				$gp.notices.notice( wp.i18n.__( 'Saving&hellip;', 'glotpress' ) );

				data = {
					original_id: editor.original_id,
					_gp_route_nonce: button.data( 'nonce' ),
				};

				textareaName = 'translation[' + editor.original_id + '][]';
				translations = $( 'textarea[name="' + textareaName + '"]', editor ).map( function() {
					return this.value;
				} ).get();

				data[ textareaName ] = translations;

				$.ajax( {
					type: 'POST',
					url: $gp_editor_options.url,
					data: data,
					dataType: 'json',
					success: function( response ) {
						var original_id, old_status, old_warnings, new_status, new_warnings;

						button.prop( 'disabled', false );
						$gp.notices.success( wp.i18n.__( 'Saved!', 'glotpress' ) );

						old_status = $gp.editor.current.translation_status;
						old_warnings = $gp.editor.current.translation_warnings;

						for ( original_id in response ) {
							$gp.editor.replace_current( response[ original_id ] );
						}

						// TODO: On suggesting new translation, don't replace others if looking at all.

						new_status = $gp.editor.current.translation_status;
						new_warnings = $gp.editor.current.translation_warnings;

						if ( old_status !== new_status ) {
							$gp.editor.update_filter_count( old_status, 'remove' );
							$gp.editor.update_filter_count( new_status, 'add' );
						}

						if ( old_warnings === false && new_warnings === true ) {
							$gp.editor.update_filter_count( 'warnings', 'add' );
						}

						if ( $gp.editor.current.hasClass( 'no-warnings' ) ) {
							$gp.editor.next();
						}
					},
					error: function( xhr, msg ) {
						button.prop( 'disabled', false );
						/* translators: %s: Error message. */
						msg = xhr.responseText ? wp.i18n.sprintf( wp.i18n.__( 'Error: %s', 'glotpress' ), xhr.responseText ) : wp.i18n.__( 'Error saving the translation!', 'glotpress' );
						$gp.notices.error( msg );
					},
				} );
			},
			set_priority: function( select ) {
				var editor, data;

				if ( ! $gp.editor.current ) {
					return;
				}

				editor = $gp.editor.current;
				select.prop( 'disabled', true );
				$gp.notices.notice( wp.i18n.__( 'Setting priority&hellip;', 'glotpress' ) );

				data = {
					priority: $( 'option:selected', select ).val(),
					_gp_route_nonce: select.data( 'nonce' ),
				};

				$.ajax( {
					type: 'POST',
					url: $gp_editor_options.set_priority_url.replace( '%original-id%', editor.original_id ),
					data: data,
					success: function() {
						var new_priority_class;

						select.prop( 'disabled', false );
						$gp.notices.success( wp.i18n.__( 'Priority set!', 'glotpress' ) );
						new_priority_class = 'priority-' + $( 'option:selected', select ).text();
						$gp.editor.current.addClass( new_priority_class );
						$gp.editor.current.preview.addClass( new_priority_class );
					},
					error: function( xhr, msg ) {
						select.prop( 'disabled', false );
						/* translators: %s: Error message. */
						msg = xhr.responseText ? wp.i18n.sprintf( wp.i18n.__( 'Error: %s', 'glotpress' ), xhr.responseText ) : wp.i18n.__( 'Error setting the priority!', 'glotpress' );
						$gp.notices.error( msg );
					},
				} );
			},
			set_status: function( button, status ) {
				var editor, data, status_name, old_status, has_current, has_waiting, has_fuzzy, original_id, translation_id,
					translationChanged = false;

				if ( ! $gp.editor.current || ! $gp.editor.current.translation_id ) {
					return;
				}

				editor = $gp.editor.current;

				$( '[id*="translation_' + editor.original_id + '_"]' ).each( function() {
					if ( this.value !== this.defaultValue ) {
						translationChanged = true;
					}
				} );

				if ( translationChanged ) {
					$gp.notices.error( wp.i18n.__( 'Translation has changed! Please add the new translation before changing its status.', 'glotpress' ) );
					return;
				}

				button.prop( 'disabled', true );

				switch ( status ) {
					case 'current':
						status_name = wp.i18n._x( 'current', 'Single Status', 'glotpress' );
						break;
					case 'rejected':
						status_name = wp.i18n._x( 'rejected', 'Single Status', 'glotpress' );
						break;
					case 'fuzzy':
						status_name = wp.i18n._x( 'fuzzy', 'Single Status', 'glotpress' );
						break;
					case 'changesrequested':
						status_name = wp.i18n._x( 'changes requested', 'Single Status', 'glotpress' );
						break;
				}

				/* translators: %s: Status name. */
				$gp.notices.notice( wp.i18n.sprintf( wp.i18n.__( 'Setting status to &#8220;%s&#8221;&hellip;', 'glotpress' ), status_name ) );

				data = {
					translation_id: editor.translation_id,
					status: status,
					_gp_route_nonce: button.data( 'nonce' ),
				};

				$.ajax( {
					type: 'POST',
					url: $gp_editor_options.set_status_url,
					data: data,
					success: function( response ) {
						button.prop( 'disabled', false );
						$gp.notices.success( wp.i18n.__( 'Status set!', 'glotpress' ) );
						old_status = $gp.editor.current.translation_status;
						original_id = $gp.editor.current.original_id;
						translation_id = $gp.editor.current.translation_id;
						has_current = $gp.editor.current.translation_has_current;
						has_waiting = $gp.editor.current.translation_has_waiting;
						has_fuzzy = $gp.editor.current.translation_has_fuzzy;

						// Check if old status was current.

						if ( old_status === 'translated' ) {
							// Remove any has-current for the same original_id, because there can only be one current.
							$( 'tr.has-current[row^="' + original_id + '-"]' ).removeClass( 'has-current' );
							$gp.editor.update_filter_count( old_status, 'remove' );
						} else if ( old_status === 'waiting' ) { // Check if old status was waiting.
							// Remove any has-waiting for the same original_id, because there can only be one waiting.
							$( 'tr.has-waiting[row^="' + original_id + '-"]' ).removeClass( 'has-waiting' );
							$gp.editor.update_filter_count( old_status, 'remove' );
						} else {
							//$gp.editor.update_filter_count( old_status, 'remove' );
						}

						// $gp.editor.update_filter_count( old_status, 'remove' ); NÃO PODE SER PORQUE DEPENDE DE CONDIÇÕES.

						// TODO: Untranslated: no waiting, current or fuzzy.

						// Check if new status is current.
						if ( status === 'current' ) {
							// If the old translation has another current for the same original, set the previous current to old.
							$( 'tr[row^="' + original_id + '-"].status-current' ).each( function() {
								$( this ).removeClass( 'status-current' ).addClass( 'status-old' );
								$( this ).find( 'div.meta dd[id^="status-"] span.status' ).text( wp.i18n.__( 'old', 'glotpress' ) );
								$( this ).find( 'div.meta dd[id^="status-"] button.approve' ).prop( 'disabled', false );
							} );

							// All other must have 'has-current'.
							$( 'tr[row^="' + original_id + '-"]' ).each( function() {
								// Add has-current.
								$( this ).addClass( 'has-current' );
							} );

							// Check all waiting translations for the same original_id.
							$( 'tr.preview.status-waiting[row^="' + original_id + '-"]' ).each( function() {
								// Decrease waiting count.
								$gp.editor.update_filter_count( 'waiting', 'remove' );
							} );
							$( 'tr.status-waiting[row^="' + original_id + '-"]' ).each( function() {
								// Change from waiting to old.
								$( this ).removeClass( 'status-waiting' ).addClass( 'status-old' );
							} );

							// Check all fuzzy translations for the same original_id.
							$( 'tr.preview.status-fuzzy[row^="' + original_id + '-"]' ).each( function() {
								// Decrease fuzzy count.
								$gp.editor.update_filter_count( 'fuzzy', 'remove' );
							} );
							$( 'tr.status-fuzzy[row^="' + original_id + '-"]' ).each( function() {
								// Change from fuzzy to old.
								$( this ).removeClass( 'status-fuzzy' ).addClass( 'status-old' );
							} );

							if ( ! has_current ) {
								$gp.editor.update_filter_count( status, 'add' );
							}
						}


						// Check if new status is waiting.
						/*if ( status === 'waiting' ) {
							// If the old translation has another waiting for the same original, set the previous current to old.
							$( 'tr[row^="' + original_id + '-"].status-waiting' ).each( function() {
								$( this ).removeClass( 'status-waiting' ).addClass( 'status-old' );
								$( this ).find( 'div.meta dd[id^="status-"] span.status' ).text( wp.i18n.__( 'old', 'glotpress' ) );
								// $( this ).find( 'div.meta dd[id^="status-"] button.approve' ).prop( 'disabled', false );
							} );


							// All other must have 'has-waiting'.
							$( 'tr[row^="' + original_id + '-"]' ).each( function() {
								// Add has-waiting.
								$( this ).addClass( 'has-waiting' );
							} );


							// Check all waiting translations for the same original_id.
							$( 'tr.preview.status-waiting[row^="' + original_id + '-"]' ).each( function() {
								// Decrease waiting count.
								$gp.editor.update_filter_count( 'waiting', 'remove' );
							} );
							$( 'tr.status-waiting[row^="' + original_id + '-"]' ).each( function() {
								// Change from waiting to old.
								$( this ).removeClass( 'status-waiting' ).addClass( 'status-old' );
							} );
							*/

							// Check all fuzzy translations for the same original_id.
							/*$( 'tr.preview.status-fuzzy[row^="' + original_id + '-"]' ).each( function() {
								// Decrease fuzzy count.
								$gp.editor.update_filter_count( 'fuzzy', 'remove' );
							} );
							$( 'tr.status-fuzzy[row^="' + original_id + '-"]' ).each( function() {
								// Change from fuzzy to old.
								$( this ).removeClass( 'status-fuzzy' ).addClass( 'status-old' );
							} );



							if ( ! has_waiting ) {
								$gp.editor.update_filter_count( status, 'add' );
							}
						}
						*/

						// Check if new status is current.
						if ( status === 'fuzzy' ) {
							$gp.editor.update_filter_count( status, 'add' );
						}

						$gp.editor.replace_current( response );

						$gp.editor.next();

						// If the old translation has another current for the same original, set the previous current to old.
						/*
						if ( has_current ) {
							$( 'tr[row^="' + original_id + '-"].status-current' ).each( function() {
								$( this ).removeClass( 'status-current' ).addClass( 'status-old has-current' );
								$( this ).find( 'div.meta dd[id^="status-"] span.status' ).text( wp.i18n.__( 'old', 'glotpress' ) );
								$( this ).find( 'div.meta dd[id^="status-"] button.approve' ).prop( 'disabled', false );
							} );
						}
						*/





						// If the old status is different from current status, update old row.
						/*if ( old_status !== status ) {
							// If the old translation don't have any other current for same original, update counts.
							if ( ! has_current ) {
								$gp.editor.update_filter_count( old_status, 'remove' );
								$gp.editor.update_filter_count( status, 'add' );
							} else { // If the old translation has another current for the same original, set the previous current to old.
								$( 'tr[row^="' + original_id + '-"]:not([row$="' + translation_id + '"]).status-current' ).each( function() {
									$( this ).removeClass( 'status-current' ).addClass( 'status-old has-current' );
									$( this ).find( 'div.meta dd[id^="status-"] span.status' ).text( wp.i18n.__( 'old', 'glotpress' ) );
									$( this ).find( 'div.meta dd[id^="status-"] button.approve' ).prop( 'disabled', false );
								} );
							}
						} else {
							alert( 'Same status!' );
						}*/
					},
					error: function( xhr, msg ) {
						button.prop( 'disabled', false );
						/* translators: %s: Error message. */
						msg = xhr.responseText ? wp.i18n.sprintf( wp.i18n.__( 'Error: %s', 'glotpress' ), xhr.responseText ) : wp.i18n.__( 'Error setting the status!', 'glotpress' );
						$gp.notices.error( msg );
					},
				} );
			},
			discard_warning: function( link ) {
				var data, old_warnings, new_warnings, translation_status;
				if ( ! $gp.editor.current ) {
					return;
				}

				translation_status = $gp.editor.current.translation_status;

				$gp.notices.notice( wp.i18n.__( 'Discarding&hellip;', 'glotpress' ) );

				data = {
					translation_id: $gp.editor.current.translation_id,
					key: link.data( 'key' ),
					index: link.data( 'index' ),
					_gp_route_nonce: link.data( 'nonce' ),

				};

				$.ajax( {
					type: 'POST',
					url: $gp_editor_options.discard_warning_url,
					data: data,
					success: function( response ) {
						$gp.notices.success( wp.i18n.__( 'Saved!', 'glotpress' ) );
						old_warnings = $gp.editor.current.translation_warnings;
						$gp.editor.replace_current( response );
						new_warnings = $gp.editor.current.translation_warnings;
						// Check if removed all warnings.
						if ( old_warnings !== new_warnings ) {
							$gp.editor.update_filter_count( 'warnings', 'remove' );
							// If translation is current, move to next.
							if ( translation_status === 'current' ) {
								$gp.editor.next();
							}
						}
					},
					error: function( xhr, msg ) {
						/* translators: %s: Error message. */
						msg = xhr.responseText ? wp.i18n.sprintf( wp.i18n.__( 'Error: %s', 'glotpress' ), xhr.responseText ) : wp.i18n.__( 'Error saving the translation!', 'glotpress' );
						$gp.notices.error( msg );
					},
				} );
			},
			copy: function( link ) {
				var chunks = link.parents( '.textareas' ).find( 'textarea' ).attr( 'id' ).split( '_' );
				var original_index = Math.min( parseInt( chunks[ chunks.length - 1 ], 10 ), 1 );
				var original_texts = link.parents( '.strings' ).find( '.original_raw' );
				var original_text = original_texts.eq( original_index ).text();

				link.parents( '.textareas' ).find( 'textarea' ).val( original_text ).focus();
			},
			tab: function( link ) {
				var text_area = link.parents( '.textareas' ).find( 'textarea' );
				var cursorPos = text_area.prop( 'selectionStart' );
				var v = text_area.val();
				var textBefore = v.substring( 0, cursorPos );
				var textAfter = v.substring( cursorPos, v.length );

				text_area.val( textBefore + '\t' + textAfter );

				text_area.focus();
				text_area[ 0 ].selectionEnd = cursorPos + 1;
			},
			newline: function( link ) {
				var text_area = link.parents( '.textareas' ).find( 'textarea' );
				var cursorPos = text_area.prop( 'selectionStart' );
				var v = text_area.val();
				var textBefore = v.substring( 0, cursorPos );
				var textAfter = v.substring( cursorPos, v.length );

				text_area.val( textBefore + '\n' + textAfter );

				text_area.focus();
				text_area[ 0 ].selectionEnd = cursorPos + 1;
			},
			hooks: {
				show: function() {
					$gp.editor.show( $( this ) );
					return false;
				},
				hide: function() {
					$gp.editor.hide();
					return false;
				},
				ok: function() {
					$gp.editor.save( $( this ) );
					return false;
				},
				cancel: function() {
					var i = 0;

					for ( i = 0; i < $gp.editor.current.original_translations.length; i++ ) {
						$( 'textarea[id="translation_' + $gp.editor.current.original_id + '_' + i + '"]' ).val( $gp.editor.current.original_translations[ i ] );
					}

					$gp.editor.hide();

					return false;
				},
				keydown: function( e ) {
					return $gp.editor.keydown( e );
				},
				update_word_count: function( e ) {
					return $gp.editor.update_word_count( e );
				},
				copy: function() {
					$gp.editor.copy( $( this ) );
					return false;
				},
				tab: function() {
					$gp.editor.tab( $( this ) );
					return false;
				},
				newline: function() {
					$gp.editor.newline( $( this ) );
					return false;
				},
				discard_warning: function() {
					$gp.editor.discard_warning( $( this ) );
					return false;
				},
				set_status_current: function() {
					$gp.editor.set_status( $( this ), 'current' );
					return false;
				},
				set_status_rejected: function() {
					$gp.editor.set_status( $( this ), 'rejected' );
					return false;
				},
				set_status_fuzzy: function() {
					$gp.editor.set_status( $( this ), 'fuzzy' );
					return false;
				},
				set_status_changesrequested: function() {
					return false;
				},
				set_priority: function() {
					$gp.editor.set_priority( $( this ) );
					return false;
				},
			},
		};
	}( jQuery )
);

jQuery( function( $ ) {
	$gp.editor.init( $( '#translations' ) );
} );
