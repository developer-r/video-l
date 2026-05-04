/**
 * Optional helper for MovieParser TMDB.
 * This file is safe to load on its own and does not require Lampa at startup.
 */
(function(global) {
    'use strict';

    var VideoSources = {
        version: '2.0.0',

        search: function(query, source, callback) {
            if (typeof callback === 'function') callback([]);
        },

        getDirectUrl: function(url, callback) {
            if (typeof callback === 'function') callback(url || '');
        },

        createIframe: function(embedUrl, width, height) {
            return '<iframe src="' + (embedUrl || '') + '" ' +
                'width="' + (width || '100%') + '" ' +
                'height="' + (height || '100%') + '" ' +
                'frameborder="0" allowfullscreen></iframe>';
        },

        getSourcesList: function() {
            return [];
        }
    };

    global.VideoSources = VideoSources;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = VideoSources;
    }
})(typeof window !== 'undefined' ? window : globalThis);
