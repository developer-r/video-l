/**
 * Movie Parser Plugin для Lampa
 * Простая версия для тестирования
 */

(function() {
    'use strict';

    var version = '1.0.1';

    // Конфигурация
    var Config = {
        name: 'MovieParser',
        tmdb_api_key: 'b2a29c6e844d4f856b5d08a904e3a354',
        tmdb_lang: 'ru-RU'
    };

    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var last;

        this.initialize = function() {
            var _this = this;
            
            this.loading(true);
            
            filter.onSearch = function(value) {
                Lampa.Activity.replace({search: value, clarification: true});
            };
            
            filter.onBack = function() {
                _this.start();
            };
            
            filter.onSelect = function(type, a, b) {
                Lampa.Select.close();
            };
            
            if (filter.addButtonBack) filter.addButtonBack();
            
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get('lampac_content_loading'));
            
            Lampa.Controller.enable('content');
            this.loading(false);
            
            // Запуск поиска
            this.search();
        };

        this.search = function() {
            var query = object.search || object.movie.title || '.matrix';
            
            var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + Config.tmdb_api_key + 
                      '&language=' + Config.tmdb_lang + 
                      '&query=' + encodeURIComponent(query) + 
                      '&page=1';
            
            network.timeout(10000);
            network["native"](url, this.parse.bind(this), this.error.bind(this));
        };

        this.find = function() {
            this.search();
        };

        this.request = function(url) {
            network["native"](url, this.parse.bind(this), this.error.bind(this));
        };

        this.parse = function(json) {
            if (!json || !json.results) {
                this.error({});
                return;
            }
            
            var _this = this;
            var items = json.results.slice(0, 15).map(function(item) {
                return {
                    title: item.title || 'Без названия',
                    original_title: item.original_title || '',
                    year: item.release_date ? item.release_date.slice(0, 4) : '',
                    poster: item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : './img/img_broken.svg',
                    description: (item.overview || '').substring(0, 100),
                    rating: item.vote_average,
                    id: item.id,
                    method: 'link',
                    url: 'https://api.themoviedb.org/3/movie/' + item.id + '?api_key=' + Config.tmdb_api_key
                };
            });
            
            this.activity.loader(false);
            this.display(items);
        };

        this.display = function(items) {
            var _this = this;
            
            scroll.clear();
            
            items.forEach(function(element, index) {
                var html = $('<div class="online-prestige selector">' +
                    '<div class="online-prestige__img">' +
                    '<img src="' + element.poster + '" onerror="this.src=\'./img/img_broken.svg\'">' +
                    '</div>' +
                    '<div class="online-prestige__body">' +
                    '<div class="online-prestige__title">' + element.title + '</div>' +
                    '<div class="online-prestige__time">' + element.year + '</div>' +
                    '<div class="online-prestige__info">' + element.description + '</div>' +
                    '<div class="online-prestige__quality">' + (element.rating ? '★ ' + element.rating.toFixed(1) : '') + '</div>' +
                    '</div>' +
                    '</div>');
                
                html.on('hover:enter', function() {
                    // Показать детали
                    _this.movieInfo(element);
                }).on('hover:focus', function(e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });
                
                scroll.append(html);
            });
            
            Lampa.Controller.enable('content');
        };

        this.movieInfo = function(item) {
            var _this = this;
            
            // Получаем детали
            network.silent(item.url, function(details) {
                var info_text = (details.overview || 'Нет описания');
                
                // Показываем сообщение
                Lampa.Noty.show(info_text.substring(0, 200));
            });
        };

        this.error = function() {
            var html = $('<div class="online-empty">' +
                '<div class="online-empty__title">Ошибка поиска</div>' +
                '<div class="online-empty__time">Проверьте интернет соединение</div>' +
                '</div>');
            
            scroll.clear();
            scroll.append(html);
            this.loading(false);
        };

        this.getChoice = function() {
            return {season: 0, voice: 0};
        };

        this.saveChoice = function(choice) {};

        this.loading = function(status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        this.start = function() {
            if (Lampa.Activity.active().activity !== this.activity) return;
            
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
                right: function() {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    else filter.show('Фильтр', 'filter');
                },
                left: function() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back.bind(this)
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
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    // Регистрация манифеста
    var manifst = {
        type: 'video',
        version: version,
        name: 'MovieParser',
        description: 'Поиск фильмов через TMDB',
        component: 'movie_parser'
    };

    function initPlugin() {
        try {
            console.log('MovieParser: Starting...');
            
            // Регистрируем компонент
            Lampa.Component.add('movie_parser', component);
            
            // Добавляем языковые строки
            Lampa.Lang.add({
                movie_parser_watch: {
                    ru: 'Смотреть',
                    en: 'Watch'
                },
                movie_parser_search: {
                    ru: 'Поиск фильмов',
                    en: 'Search movies'
                }
            });
            
            // Добавляем источник поиска
            var source = {
                title: 'TMDB',
                search: function(params, oncomplite) {
                    var network = new Lampa.Reguest();
                    var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + Config.tmdb_api_key + 
                              '&language=' + Config.tmdb_lang + 
                              '&query=' + encodeURIComponent(params.query) + 
                              '&page=1';
                    
                    network.timeout(10000);
                    network.silent(url, function(json) {
                        if (json && json.results) {
                            var cards = json.results.slice(0, 20).map(function(item) {
                                return {
                                    id: item.id,
                                    title: item.title,
                                    original_title: item.original_title,
                                    release_date: item.release_date,
                                    poster: item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : './img/img_broken.svg',
                                    vote_average: item.vote_average
                                };
                            });
                            oncomplite([{title: 'Фильмы', results: cards}]);
                        } else {
                            oncomplite([]);
                        }
                    }, function() {
                        oncomplite([]);
                    });
                },
                params: {lazy: true, align_left: true},
                onSelect: function(params, close) {
                    close();
                    Lampa.Activity.push({
                        url: '',
                        title: params.element.title,
                        component: 'movie_parser',
                        movie: {
                            id: params.element.id,
                            title: params.element.title,
                            original_title: params.element.original_title,
                            release_date: params.element.release_date,
                            poster_path: params.element.poster,
                            vote_average: params.element.vote_average
                        },
                        search: params.element.title,
                        page: 1
                    });
                }
            };
            
            Lampa.Search.addSource(source);
            
            // Добавляем кнопку на карточку
            Lampa.Listener.follow('full', function(e) {
                if (e.type === 'complite') {
                    var btn = $('<div class="full-start__button selector view--movie_parser">' +
                        '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z" fill="#E53935"/>' +
                        '<path d="M199.8 368.5V143.5l192 112.5-192 112.5z" fill="#fff"/>' +
                        '</svg><span>TMDB</span></div>');
                    
                    btn.on('hover:enter', function() {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Поиск фильмов',
                            component: 'movie_parser',
                            movie: e.data.movie,
                            search: e.data.movie.title,
                            page: 1
                        });
                    });
                    
                    var target = e.object.activity.render().find('.view--torrent');
                    if (target.length) target.after(btn);
                }
            });
            
            console.log('MovieParser: Loaded successfully');
            
        } catch (e) {
            console.error('MovieParser: Init error', e);
        }
    }

    // Запуск
    Lampa.Manifest.plugins = manifst;

    if (window.Lampa) {
        if (Lampa.App && Lampa.App.started) {
            initPlugin();
        } else {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'complite') {
                    setTimeout(initPlugin, 500);
                }
            });
        }
    } else {
        window.addEventListener('load', function() {
            setTimeout(initPlugin, 1000);
        });
    }

})();
