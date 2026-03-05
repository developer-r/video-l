/**
 * Movie Parser Plugin для Lampa
 * Минимальная версия
 */

(function() {
    'use strict';

    console.log('MovieParser: Script loaded');

    var version = '1.0.2';

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

        var self = this;

        this.initialize = function() {
            console.log('MovieParser: Component initialize');
            
            this.loading(true);
            
            // Простой фильтр
            filter.onBack = function() {
                self.start();
            };
            
            if (filter.addButtonBack) filter.addButtonBack();
            
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append('<div style="padding:20px;text-align:center">Загрузка...</div>');
            
            Lampa.Controller.enable('content');
            this.loading(false);
            
            // Запуск поиска
            this.search();
        };

        this.search = function() {
            var query = object.search || object.movie.title || 'matrix';
            
            var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + Config.tmdb_api_key + 
                      '&language=' + Config.tmdb_lang + 
                      '&query=' + encodeURIComponent(query) + 
                      '&page=1';
            
            console.log('MovieParser: Searching', query);
            
            network.timeout(15000);
            network["native"](url, 
                function(json) { self.parse(json); }, 
                function() { self.error(); }
            );
        };

        this.parse = function(json) {
            console.log('MovieParser: Got results', json);
            
            if (!json || !json.results || !json.results.length) {
                this.error();
                return;
            }
            
            var _this = this;
            scroll.clear();
            
            json.results.slice(0, 10).forEach(function(item, index) {
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
            var html = $('<div class="online-empty">' +
                '<div class="online-empty__title">Ошибка</div>' +
                '<div class="online-empty__time">Проверьте интернет</div></div>');
            scroll.clear();
            scroll.append(html);
            this.loading(false);
        };

        this.getChoice = function() { return {season:0,voice:0}; };
        this.saveChoice = function() {};

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
                down: function() { Navigator.move('down'); },
                right: function() {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                left: function() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function() { return files.render(); };
        this.back = function() { Lampa.Activity.backward(); };
        this.pause = function() {};
        this.stop = function() {};
        this.destroy = function() {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    // Регистрация
    var manifst = {
        type: 'video',
        version: version,
        name: 'MovieParser TMDB',
        description: 'Поиск фильмов',
        component: 'movie_parser'
    };

    function startPlugin() {
        try {
            console.log('MovieParser: Starting plugin...');
            
            // Компонент
            Lampa.Component.add('movie_parser', component);
            
            // Язык
            Lampa.Lang.add({
                mp_title: {ru:'MovieParser',en:'MovieParser'},
                mp_watch: {ru:'Смотреть',en:'Watch'}
            });
            
            // Поиск
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
                        } else {
                            done([]);
                        }
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
            
            // Кнопка
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
            
            console.log('MovieParser: Plugin ready');
            
        } catch(e) {
            console.error('MovieParser: Error', e);
        }
    }

    // Запуск
    Lampa.Manifest.plugins = manifst;

    function init() {
        console.log('MovieParser: Init');
        if (window.Lampa) {
            if (Lampa.App && Lampa.App.started) {
                startPlugin();
            } else {
                Lampa.Listener.follow('app', function(e) {
                    if (e.type === 'complite') {
                        setTimeout(startPlugin, 100);
                    }
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
