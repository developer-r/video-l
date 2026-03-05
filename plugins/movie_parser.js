/**
 * Movie Parser Plugin для Lampa
 */

(function() {
    'use strict';

    // Уникальный ID плагина
    var plugin_id = 'movie_parser_' + Math.random().toString(36).substr(2, 9);

    console.log('[MovieParser] Script loading...');

    var version = '1.0.3';
    var Config = {
        name: 'MovieParser',
        tmdb_api_key: 'b2a29c6e844d4f856b5d08a904e3a354',
        tmdb_lang: 'ru-RU'
    };

    // Регистрация манифеста - критически важно!
    var manifst = {
        type: 'video',
        version: version,
        name: 'MovieParser TMDB',
        description: 'Поиск фильмов через TMDB',
        component: 'movie_parser'
    };

    // Функция компонента
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var last;
        var self = this;

        this.initialize = function() {
            console.log('[MovieParser] Component init');
            this.loading(true);
            
            if (filter.addButtonBack) filter.addButtonBack();
            
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append('<div style="padding:20px;text-align:center">Загрузка...</div>');
            
            Lampa.Controller.enable('content');
            this.loading(false);
            this.search();
        };

        this.search = function() {
            var query = object.search || object.movie.title || 'matrix';
            var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + Config.tmdb_api_key + 
                      '&language=' + Config.tmdb_lang + 
                      '&query=' + encodeURIComponent(query) + 
                      '&page=1';
            
            console.log('[MovieParser] Search:', query);
            network.timeout(15000);
            network["native"](url, function(json) { self.parse(json); }, function() { self.error(); });
        };

        this.parse = function(json) {
            console.log('[MovieParser] Results:', json ? json.results ? json.results.length : 0 : 0);
            if (!json || !json.results || !json.results.length) { this.error(); return; }
            
            scroll.clear();
            json.results.slice(0, 10).forEach(function(item) {
                var title = item.title || 'Без названия';
                var year = item.release_date ? item.release_date.slice(0, 4) : '----';
                var poster = item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : './img/img_broken.svg';
                var rating = item.vote_average ? '★ ' + item.vote_average.toFixed(1) : '';
                
                var html = $('<div class="online-prestige selector">' +
                    '<div class="online-prestige__img"><img src="' + poster + '" onerror="this.src=\'./img/img_broken.svg\'"></div>' +
                    '<div class="online-prestige__body">' +
                    '<div class="online-prestige__title">' + title + '</div>' +
                    '<div class="online-prestige__time">' + year + ' ' + rating + '</div>' +
                    '</div></div>');
                
                html.on('hover:enter', function() {
                    Lampa.Noty.show(title + '\n' + (item.overview || '').substring(0, 150));
                }).on('hover:focus', function(e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });
                scroll.append(html);
            });
            Lampa.Controller.enable('content');
        };

        this.error = function() {
            scroll.clear();
            scroll.append('<div class="online-empty"><div class="online-empty__title">Ошибка</div></div>');
            this.loading(false);
        };

        this.getChoice = function() { return {season:0,voice:0}; };
        this.saveChoice = function() {};
        this.loading = function(s) { if (s) this.activity.loader(true); else { this.activity.loader(false); this.activity.toggle(); }};

        this.start = function() {
            if (Lampa.Activity.active().activity !== this.activity) return;
            var _this = this;
            Lampa.Controller.add('content', {
                toggle: function() { Lampa.Controller.collectionSet(scroll.render(), files.render()); Lampa.Controller.collectionFocus(last||false, scroll.render()); },
                up: function() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function() { Navigator.move('down'); },
                left: function() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                back: function() { _this.back(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function() { return files.render(); };
        this.back = function() { Lampa.Activity.backward(); };
        this.pause = function() {}; 
        this.stop = function() {};
        this.destroy = function() { network.clear(); files.destroy(); scroll.destroy(); };
    }

    // Главная функция инициализации
    function initPlugin() {
        try {
            console.log('[MovieParser] Initializing...');
            
            // Проверяем Lampa
            if (!Lampa) {
                console.error('[MovieParser] Lampa not found!');
                return;
            }
            
            // Регистрируем манифест
            if (Lampa.Manifest) {
                Lampa.Manifest.plugins = manifst;
                console.log('[MovieParser] Manifest registered');
            }
            
            // Компонент
            if (Lampa.Component) {
                Lampa.Component.add('movie_parser', component);
                console.log('[MovieParser] Component added');
            }
            
            // Язык
            if (Lampa.Lang) {
                Lampa.Lang.add({
                    mp_title: {ru:'MovieParser',en:'MovieParser'},
                    mp_watch: {ru:'Смотреть',en:'Watch'}
                });
            }
            
            // Источник поиска
            if (Lampa.Search) {
                var src = {
                    title: 'TMDB',
                    search: function(p, done) {
                        var net = new Lampa.Reguest();
                        var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + Config.tmdb_api_key + 
                                  '&language=' + Config.tmdb_lang + 
                                  '&query=' + encodeURIComponent(p.query) + '&page=1';
                        net.timeout(10000);
                        net.silent(url, function(json) {
                            if (json && json.results) {
                                var cards = json.results.slice(0,15).map(function(i){
                                    return {
                                        id: i.id,
                                        title: i.title,
                                        original_title: i.original_title,
                                        release_date: i.release_date,
                                        poster: i.poster_path ? 'https://image.tmdb.org/t/p/w500'+i.poster_path : './img/img_broken.svg',
                                        vote_average: i.vote_average
                                    };
                                });
                                done([{title:'Фильмы',results:cards}]);
                            } else { done([]); }
                        }, function(){ done([]); });
                    },
                    params: {lazy:true, align_left:true},
                    onSelect: function(p, close) {
                        close();
                        Lampa.Activity.push({
                            url:'', title: p.element.title,
                            component:'movie_parser',
                            movie:{id:p.element.id,title:p.element.title,original_title:p.element.original_title,release_date:p.element.release_date,poster_path:p.element.poster,vote_average:p.element.vote_average},
                            search:p.element.title, page:1
                        });
                    }
                };
                Lampa.Search.addSource(src);
                console.log('[MovieParser] Search source added');
            }
            
            // Кнопка на карточке
            if (Lampa.Listener) {
                Lampa.Listener.follow('full', function(e) {
                    if (e.type === 'complite') {
                        var btn = $('<div class="full-start__button selector view--mp"><svg viewBox="0 0 512 512"><path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z" fill="#E53935"/><path d="M199.8 368.5V143.5l192 112.5-192 112.5z" fill="#fff"/></svg><span>TMDB</span></div>');
                        btn.on('hover:enter', function(){
                            Lampa.Activity.push({url:'',title:'Поиск',component:'movie_parser',movie:e.data.movie,search:e.data.movie.title,page:1});
                        });
                        var t = e.object.activity.render().find('.view--torrent');
                        if (t && t.length) t.after(btn);
                    }
                });
                console.log('[MovieParser] Card button added');
            }
            
            console.log('[MovieParser] Plugin ready!');
            
        } catch(e) {
            console.error('[MovieParser] Init error:', e);
        }
    }

    // Старт
    function start() {
        console.log('[MovieParser] Start called, Lampa:', !!window.Lampa);
        
        if (window.Lampa) {
            // Проверяем, загружено ли приложение
            if (Lampa.App && Lampa.App.started) {
                console.log('[MovieParser] App already started');
                initPlugin();
            } else if (Lampa.Listener) {
                console.log('[MovieParser] Waiting for app...');
                Lampa.Listener.follow('app', function(e) {
                    console.log('[MovieParser] App event:', e.type);
                    if (e.type === 'complite') {
                        setTimeout(initPlugin, 200);
                    }
                });
            } else {
                console.log('[MovieParser] No Listener, trying immediate init');
                setTimeout(initPlugin, 1000);
            }
        } else {
            console.log('[MovieParser] Waiting for Lampa...');
            setTimeout(start, 100);
        }
    }

    // Запуск
    start();

})();
