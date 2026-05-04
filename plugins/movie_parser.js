/**
 * MovieParser TMDB plugin for Lampa
 * Single-file version with safe startup sequence.
 */
(function() {
    'use strict';

    var PLUGIN_FLAG = 'movieparser_tmdb_plugin_ready';
    var COMPONENT_NAME = 'movie_parser_tmdb';
    var BUTTON_CLASS = 'view--movie-parser-tmdb';
    var VERSION = '2.0.0';
    var APP_LISTENER_FLAG = 'movieparser_tmdb_app_listener_ready';
    var TMDB_API = 'https://api.themoviedb.org/3/search/movie';
    var TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
    var FALLBACK_IMAGE = './img/img_broken.svg';
    var CONFIG = {
        apiKey: 'b2a29c6e844d4f856b5d08a904e3a354',
        language: 'ru-RU'
    };

    function log() {
        if (window.console && console.log) {
            console.log.apply(console, ['[MovieParser]'].concat([].slice.call(arguments)));
        }
    }

    function parseJson(payload) {
        if (!payload) return null;
        if (typeof payload === 'string') {
            try {
                return JSON.parse(payload);
            } catch (error) {
                return null;
            }
        }

        return typeof payload === 'object' ? payload : null;
    }

    function hasRequiredApi() {
        return !!(
            window.Lampa &&
            Lampa.Component &&
            Lampa.Activity &&
            Lampa.Reguest &&
            Lampa.Listener &&
            Lampa.Search &&
            Lampa.Controller
        );
    }

    function getMovieTitle(movie) {
        if (!movie) return '';

        return movie.title || movie.name || movie.original_title || movie.original_name || '';
    }

    function getSearchQuery(object) {
        if (!object) return '';

        return object.search || getMovieTitle(object.movie) || object.title || '';
    }

    function getPoster(path) {
        return path ? TMDB_IMAGE + path : FALLBACK_IMAGE;
    }

    function buildSearchUrl(query) {
        return TMDB_API +
            '?api_key=' + encodeURIComponent(CONFIG.apiKey) +
            '&language=' + encodeURIComponent(CONFIG.language) +
            '&query=' + encodeURIComponent(query) +
            '&page=1';
    }

    function normalizeMovie(item) {
        return {
            id: item.id,
            title: item.title || item.original_title || 'Без названия',
            original_title: item.original_title || item.title || '',
            release_date: item.release_date || '',
            overview: item.overview || '',
            poster_path: item.poster_path || '',
            poster: getPoster(item.poster_path),
            vote_average: item.vote_average || 0
        };
    }

    function fetchMovies(query, onSuccess, onError) {
        var request = new Lampa.Reguest();

        request.timeout(15000);
        request.silent(
            buildSearchUrl(query),
            function(payload) {
                var json = parseJson(payload);
                var results = json && Array.isArray(json.results) ? json.results.map(normalizeMovie) : [];
                onSuccess(results);
            },
            function(error) {
                if (onError) onError(error);
            }
        );

        return request;
    }

    function showMovieInfo(movie) {
        var parts = [movie.title];

        if (movie.release_date) parts.push(movie.release_date.slice(0, 4));
        if (movie.overview) parts.push(movie.overview.slice(0, 140));

        Lampa.Noty.show(parts.join('\n'));
    }

    function openSearchActivity(movie, query) {
        var searchQuery = query || getMovieTitle(movie) || 'Matrix';

        Lampa.Activity.push({
            url: '',
            title: 'TMDB',
            component: COMPONENT_NAME,
            movie: movie || {},
            search: searchQuery,
            page: 1
        });
    }

    function renderMovieList(scroll, movies, onFocus) {
        scroll.clear();

        movies.forEach(function(movie) {
            var year = movie.release_date ? movie.release_date.slice(0, 4) : '----';
            var rating = movie.vote_average ? '  •  ' + movie.vote_average.toFixed(1) : '';
            var element = $(
                '<div class="online-prestige selector">' +
                    '<div class="online-prestige__img">' +
                        '<img src="' + movie.poster + '" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">' +
                    '</div>' +
                    '<div class="online-prestige__body">' +
                        '<div class="online-prestige__title">' + movie.title + '</div>' +
                        '<div class="online-prestige__time">' + year + rating + '</div>' +
                    '</div>' +
                '</div>'
            );

            element
                .on('hover:enter', function() {
                    showMovieInfo(movie);
                })
                .on('hover:focus', function(event) {
                    if (onFocus) onFocus(event.target);
                    scroll.update($(event.target), true);
                });

            scroll.append(element);
        });
    }

    function component(object) {
        var network;
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var last;

        this.initialize = function() {
            this.loading(true);

            if (filter.addButtonBack) filter.addButtonBack();

            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append('<div style="padding: 20px;">Загрузка результатов TMDB...</div>');

            Lampa.Controller.enable('content');
            this.search();
        };

        this.search = function() {
            var query = getSearchQuery(object);
            var self = this;

            if (!query) {
                self.error('Не удалось определить строку поиска');
                return;
            }

            network = fetchMovies(
                query,
                function(movies) {
                    self.loading(false);

                    if (!movies.length) {
                        self.error('По вашему запросу ничего не найдено');
                        return;
                    }

                    renderMovieList(scroll, movies, function(target) {
                        last = target;
                    });
                    Lampa.Controller.enable('content');
                },
                function() {
                    self.error('Не удалось получить ответ от TMDB');
                }
            );
        };

        this.error = function(message) {
            scroll.clear();
            scroll.append(
                '<div class="online-empty">' +
                    '<div class="online-empty__title">' + message + '</div>' +
                '</div>'
            );
            this.loading(false);
        };

        this.getChoice = function() {
            return {
                season: 0,
                voice: 0
            };
        };

        this.saveChoice = function() {};

        this.loading = function(state) {
            if (!this.activity) return;

            if (state) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        this.start = function() {
            var self = this;

            if (!Lampa.Activity.active() || Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function() {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function() {
                    Navigator.move('down');
                },
                left: function() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: function() {
                    self.back();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.render = function() {
            return files.render();
        };

        this.back = function() {
            Lampa.Activity.backward();
        };

        this.pause = function() {};
        this.stop = function() {};

        this.destroy = function() {
            if (network && network.clear) network.clear();
            if (files && files.destroy) files.destroy();
            if (scroll && scroll.destroy) scroll.destroy();
        };
    }

    function buildSearchSource() {
        return {
            title: 'TMDB',
            params: {
                align_left: true,
                lazy: true
            },
            search: function(params, done) {
                var query = params && params.query ? params.query : '';

                if (!query) {
                    done([]);
                    return;
                }

                fetchMovies(
                    query,
                    function(movies) {
                        done([{
                            title: 'TMDB',
                            results: movies
                        }]);
                    },
                    function() {
                        done([]);
                    }
                );
            },
            onSelect: function(params, close) {
                if (close) close();
                openSearchActivity(params ? params.element : null, params && params.element ? params.element.title : '');
            }
        };
    }

    function createButton(movie) {
        var button = $('<div class="full-start__button selector ' + BUTTON_CLASS + '"><span>TMDB</span></div>');

        button.on('hover:enter', function() {
            openSearchActivity(movie);
        });

        return button;
    }

    function addButton(event) {
        if (!event || event.type !== 'complite' || !event.data || !event.data.movie) return;
        if (!event.object || !event.object.activity || !event.object.activity.render) return;

        var root = event.object.activity.render();
        if (!root || !root.find) return;
        if (root.find('.' + BUTTON_CLASS).length) return;

        var target = root.find('.view--torrent');
        if (!target.length) return;

        target.after(createButton(event.data.movie));
    }

    function attachButtonToCurrentCard() {
        try {
            var active = Lampa.Activity.active();

            if (!active || active.component !== 'full' || !active.activity || !active.activity.render) return;
            if (!active.card) return;

            addButton({
                type: 'complite',
                data: { movie: active.card },
                object: { activity: active.activity }
            });
        } catch (error) {
            log('Failed to attach button to active card', error);
        }
    }

    function startPlugin() {
        if (window[PLUGIN_FLAG]) return;
        if (!hasRequiredApi()) return;

        window[PLUGIN_FLAG] = true;

        Lampa.Manifest.plugins = {
            type: 'video',
            version: VERSION,
            name: 'MovieParser TMDB',
            description: 'Поиск фильмов через TMDB',
            component: COMPONENT_NAME
        };

        Lampa.Lang.add({
            movie_parser_title: {
                ru: 'TMDB'
            }
        });

        Lampa.Component.add(COMPONENT_NAME, component);
        Lampa.Search.addSource(buildSearchSource());
        Lampa.Listener.follow('full', addButton);

        attachButtonToCurrentCard();
        log('Plugin started');
    }

    function waitForLampa() {
        if (window[PLUGIN_FLAG]) return;

        if (window.appready && hasRequiredApi()) {
            startPlugin();
            return;
        }

        if (window.Lampa && Lampa.Listener && !window[APP_LISTENER_FLAG]) {
            window[APP_LISTENER_FLAG] = true;

            Lampa.Listener.follow('app', function(event) {
                if (event.type === 'ready' || event.type === 'complite') startPlugin();
            });
        }

        setTimeout(waitForLampa, 250);
    }

    waitForLampa();
})();
