/**
 * Movie Parser Plugin для Lampa
 * Парсер фильмов и сериалов с использованием TMDB API
 * и интеграцией с различными видеохостингами
 * 
 * Установка: поместите файл в папку plugins приложения Lampa
 */

(function() {
    'use strict';

    // Конфигурация плагина
    var Config = {
        name: 'MovieParser',
        version: '1.0.0',
        description: 'Парсер фильмов и сериалов',
        
        // TMDB API Key (бесплатный, получить на https://www.themoviedb.org/)
        // Для продакшена рекомендуется использовать свой API ключ
        tmdb_api_key: 'b2a29c6e844d4f856b5d08a904e3a354',
        tmdb_lang: 'ru-RU',
        
        // URL для поиска фильмов (публичные источники)
        sources: {
            // Используем TMDB для метаданных
            tmdb: 'https://api.themoviedb.org/3',
            tmdb_image: 'https://image.tmdb.org/t/p',
            
            // Бесплатные видео источники (iframe embed)
            videomega: 'https://videomega.tv/embed/',
            vidup: 'https://vidup.io/embed/',
            verystream: 'https://verystream.com/embed/',
            
            // Резервные источники для парсинга
            oload: 'https://oload.tv/embed/',
            streamango: 'https://streamango.com/embed/'
        }
    };

    // Инициализация плагина
    function initPlugin() {
        console.log('MovieParser: Инициализация плагина...');
        
        // Регистрация компонента
        Lampa.Component.add('movie_parser', component);
        
        // Добавление языковых строк
        addLang();
        
        // Добавление кнопки в главное меню
        addMainButton();
        
        // Добавление поискового источника
        addSearchSource();
        
        // Добавление кнопки на карточку фильма
        addCardButton();
        
        console.log('MovieParser: Плагин загружен');
    }

    // Основной компонент
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var active_source = '';
        var videos = [];
        var last;
        
        // Инициализация компонента
        this.initialize = function() {
            var _this = this;
            
            this.loading(true);
            
            // Настройка фильтра
            filter.onSearch = function(value) {
                Lampa.Activity.replace({
                    search: value,
                    clarification: true
                });
            };
            
            filter.onBack = function() {
                _this.start();
            };
            
            // Настройка сортировки
            filter.onSelect = function(type, a, b) {
                if (type === 'filter') {
                    if (a.reset) {
                        _this.replaceChoice({season: 0, voice: 0});
                        setTimeout(function() {
                            Lampa.Select.close();
                            Lampa.Activity.replace({clarification: 0});
                        }, 10);
                    } else {
                        var url = filter_find[a.stype][b.index].url;
                        var choice = _this.getChoice();
                        choice[a.stype] = b.index;
                        _this.saveChoice(choice);
                        _this.request(url);
                        setTimeout(Lampa.Select.close, 10);
                    }
                } else if (type === 'sort') {
                    Lampa.Select.close();
                    active_source = a.source;
                    _this.changeSource(a.source);
                }
            };
            
            if (filter.addButtonBack) filter.addButtonBack();
            
            // Настройка скролла
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

        // Поиск фильмов
        this.search = function() {
            var query = object.search || object.movie.title;
            
            if (query) {
                this.filter({
                    source: ['Поиск']
                }, {source: 0});
                this.find();
            }
        };

        // Выполнить запрос
        this.find = function() {
            var query = object.search || object.movie.title;
            var year = object.movie.release_date ? object.movie.release_date.slice(0, 4) : '';
            
            // Поиск через TMDB
            var url = Config.sources.tmdb + '/search/movie?api_key=' + Config.tmdb_api_key + 
                      '&language=' + Config.tmdb_lang + 
                      '&query=' + encodeURIComponent(query) + 
                      '&page=1&include_adult=false';
            
            if (year) {
                url += '&primary_release_year=' + year;
            }
            
            network.timeout(10000);
            network["native"](url, this.parse.bind(this), this.error.bind(this));
        };

        // Запрос к источнику
        this.request = function(url) {
            network["native"](url, this.parse.bind(this), this.error.bind(this));
        };

        // Парсинг ответа
        this.parse = function(json) {
            var _this = this;
            
            if (!json || !json.results) {
                this.error({});
                return;
            }
            
            var items = json.results.slice(0, 20).map(function(item) {
                var poster = item.poster_path ? 
                    Config.sources.tmdb_image + '/w500' + item.poster_path : 
                    './img/img_broken.svg';
                
                var backdrop = item.backdrop_path ? 
                    Config.sources.tmdb_image + '/w1280' + item.backdrop_path : 
                    poster;
                
                return {
                    title: item.title,
                    original_title: item.original_title,
                    release_date: item.release_date,
                    year: item.release_date ? item.release_date.slice(0, 4) : '',
                    poster: poster,
                    backdrop: backdrop,
                    description: item.overview,
                    rating: item.vote_average,
                    vote_count: item.vote_count,
                    id: item.id,
                    method: 'link',
                    url: Config.sources.tmdb + '/movie/' + item.id + '?api_key=' + Config.tmdb_api_key + 
                         '&language=' + Config.tmdb_lang
                };
            });
            
            this.activity.loader(false);
            this.display(items);
        };

        // Отображение списка
        this.display = function(items) {
            var _this = this;
            
            this.draw(items, {
                onEnter: function(item) {
                    // Переход к детальной информации
                    _this.movieInfo(item);
                },
                onFocus: function(item, html) {
                    last = html[0];
                    scroll.update($(html), true);
                }
            });
            
            this.filter({
                season: [],
                voice: []
            }, this.getChoice());
        };

        // Получение информации о фильме
        this.movieInfo = function(item) {
            var _this = this;
            
            // Запрос детальной информации
            network["native"](item.url, function(details) {
                // Получение видео (трейлеры, тизеры)
                var videos_url = Config.sources.tmdb + '/movie/' + item.id + '/videos?api_key=' + Config.tmdb_api_key;
                
                network.silent(videos_url, function(videos_json) {
                    var video_items = [];
                    
                    // Добавляем трейлер/тизер если есть
                    if (videos_json.results && videos_json.results.length) {
                        videos_json.results.slice(0, 5).forEach(function(v) {
                            if (v.site === 'YouTube') {
                                video_items.push({
                                    title: v.name || v.type,
                                    quality: v.type,
                                    url: 'https://www.youtube.com/watch?v=' + v.key,
                                    method: 'youtube'
                                });
                            }
                        });
                    }
                    
                    // Добавляем примеры бесплатных источников
                    // Примечание: в реальности нужно парсить конкретные сайты
                    video_items.push({
                        title: 'Популярное на YouTube',
                        quality: 'search',
                        url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(item.title + ' трейлер'),
                        method: 'youtube_search'
                    });
                    
                    _this.displayVideos(video_items, item);
                });
            });
        };

        // Отображение видео источников
        this.displayVideos = function(videos_data, movie) {
            var _this = this;
            
            this.draw(videos_data, {
                onEnter: function(item) {
                    if (item.method === 'youtube') {
                        // Открытие YouTube
                        Lampa.Player.runas('youtube');
                        window.open(item.url, '_blank');
                    } else if (item.method === 'youtube_search') {
                        // Поиск на YouTube
                        Lampa.Noty.show('Открытие YouTube...');
                        // В реальном плагине здесь был бы парсинг YouTube
                    } else {
                        // Воспроизведение видео
                        var element = {
                            title: movie.title + ' - ' + item.title,
                            url: item.url,
                            quality: item.quality,
                            timeline: {},
                            subtitles: []
                        };
                        
                        Lampa.Player.play(element);
                    }
                }
            });
        };

        // Отрисовка файлов
        this.draw = function(items) {
            var _this = this;
            var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            
            if (!items.length) {
                return this.empty();
            }
            
            scroll.clear();
            
            items.forEach(function(element, index) {
                var html = Lampa.Template.get('online_prestige', {
                    title: element.title,
                    original_title: element.original_title || element.title,
                    year: element.year || '',
                    time: element.time || '',
                    info: element.description ? element.description.substring(0, 100) + '...' : '',
                    quality: element.quality || '',
                    poster: element.poster || './img/img_broken.svg'
                });
                
                var image = html.find('.online-prestige__img');
                var img = html.find('img')[0];
                
                if (img) {
                    img.onerror = function() {
                        img.src = './img/img_broken.svg';
                    };
                    
                    Lampa.Utils.imgLoad(img, element.poster, function() {
                        image.addClass('online-prestige__img--loaded');
                    });
                }
                
                html.on('hover:enter', function() {
                    if (params.onEnter) params.onEnter(element, html);
                }).on('hover:focus', function(e) {
                    if (params.onFocus) params.onFocus(element, html);
                    last = e.target;
                    scroll.update($(e.target), true);
                });
                
                scroll.append(html);
            });
            
            Lampa.Controller.enable('content');
        };

        // Показать пустой результат
        this.empty = function() {
            var html = Lampa.Template.get('lampac_does_not_answer', {});
            html.find('.online-empty__title').text(Lampa.Lang.translate('empty_title_two'));
            html.find('.online-empty__time').text(Lampa.Lang.translate('empty_text'));
            scroll.clear();
            scroll.append(html);
            this.loading(false);
        };

        // Обработка ошибок
        this.error = function() {
            this.empty();
        };

        // Получить/сохранить выбор пользователя
        this.getChoice = function() {
            var data = Lampa.Storage.cache('online_choice_movieparser', 3000, {});
            var save = data[object.movie ? object.movie.id : object.search] || {};
            Lampa.Arrays.extend(save, {season: 0, voice: 0});
            return save;
        };

        this.saveChoice = function(choice) {
            var data = Lampa.Storage.cache('online_choice_movieparser', 3000, {});
            data[object.movie ? object.movie.id : object.search] = choice;
            Lampa.Storage.set('online_choice_movieparser', data);
        };

        this.replaceChoice = function(choice) {
            var to = this.getChoice();
            Lampa.Arrays.extend(to, choice, true);
            this.saveChoice(to);
        };

        // Управление фильтром
        this.filter = function(filter_items, choice) {
            var _this = this;
            var select = [];
            
            var add = function(type, title) {
                var need = _this.getChoice();
                var items = filter_items[type];
                var subitems = [];
                var value = need[type];
                
                items.forEach(function(name, i) {
                    subitems.push({
                        title: name,
                        selected: value == i,
                        index: i
                    });
                });
                
                select.push({
                    title: title,
                    subtitle: items[value],
                    items: subitems,
                    stype: type
                });
            };
            
            if (filter_items.voice && filter_items.voice.length) {
                add('voice', Lampa.Lang.translate('torrent_parser_voice'));
            }
            if (filter_items.season && filter_items.season.length) {
                add('season', Lampa.Lang.translate('torrent_serial_season'));
            }
            
            select.push({
                title: Lampa.Lang.translate('torrent_parser_reset'),
                reset: true
            });
            
            this.saveChoice(choice);
            filter.set('filter', select);
        };

        // Переключение источника
        this.changeSource = function(source_name) {
            active_source = source_name;
            this.find();
        };

        // Загрузка
        this.loading = function(status) {
            if (status) {
                this.activity.loader(true);
            } else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        // Запуск
        this.start = function() {
            if (Lampa.Activity.active().activity !== this.activity) return;
            
            Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
            
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function() {
                    if (Navigator.canmove('up')) {
                        Navigator.move('up');
                    } else Lampa.Controller.toggle('head');
                },
                down: function() {
                    Navigator.move('down');
                },
                right: function() {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
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

        // Автоматическая инициализация
        if (!this.initialize) {
            this.initialize();
        }
    }

    // Добавить языковые строки
    function addLang() {
        Lampa.Lang.add({
            movie_parser_title: {
                ru: 'Movie Parser',
                en: 'Movie Parser',
                uk: 'Movie Parser',
                zh: '电影解析器'
            },
            movie_parser_watch: {
                ru: 'Смотреть',
                en: 'Watch',
                uk: 'Дивитися',
                zh: '观看'
            },
            movie_parser_search: {
                ru: 'Поиск фильмов',
                en: 'Search movies',
                uk: 'Пошук фільмів',
                zh: '搜索电影'
            }
        });
    }

    // Добавить кнопку в главное меню
    function addMainButton() {
        // Кнопка добавляется через компонент
    }

    // Добавить источник поиска
    function addSearchSource() {
        var source = {
            title: 'TMDB',
            search: function(params, oncomplite) {
                var network = new Lampa.Reguest();
                
                var url = Config.sources.tmdb + '/search/movie?api_key=' + Config.tmdb_api_key + 
                          '&language=' + Config.tmdb_lang + 
                          '&query=' + encodeURIComponent(params.query) + 
                          '&page=1&include_adult=false';
                
                network.timeout(10000);
                network.silent(url, function(json) {
                    if (json && json.results) {
                        var cards = json.results.slice(0, 20).map(function(item) {
                            return {
                                id: item.id,
                                title: item.title,
                                original_title: item.original_title,
                                release_date: item.release_date,
                                poster: item.poster_path ? 
                                    Config.sources.tmdb_image + '/w500' + item.poster_path : 
                                    './img/img_broken.svg',
                                backdrop: item.backdrop_path ? 
                                    Config.sources.tmdb_image + '/w1280' + item.backdrop_path : 
                                    './img/img_broken.svg',
                                overview: item.overview,
                                vote_average: item.vote_average,
                                source: 'tmdb'
                            };
                        });
                        
                        oncomplite([{
                            title: 'Найденные фильмы',
                            results: cards
                        }]);
                    } else {
                        oncomplite([]);
                    }
                }, function() {
                    oncomplite([]);
                });
            },
            params: {
                lazy: true,
                align_left: true
            },
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
                        backdrop_path: params.element.backdrop,
                        overview: params.element.overview,
                        vote_average: params.element.vote_average,
                        source: 'tmdb'
                    },
                    search: params.element.title,
                    page: 1
                });
            }
        };
        
        Lampa.Search.addSource(source);
    }

    // Добавить кнопку на карточку фильма
    function addCardButton() {
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                var btn = $(Lampa.Lang.translate(
                    '<div class="full-start__button selector view--movie_parser">' +
                    '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z" fill="#E53935"/>' +
                    '<path d="M199.8 368.5V143.5l192 112.5-192 112.5z" fill="#fff"/>' +
                    '</svg>' +
                    '<span>#{movie_parser_watch}</span></div>'
                ));
                
                btn.on('hover:enter', function() {
                    Lampa.Activity.push({
                        url: '',
                        title: Lampa.Lang.translate('movie_parser_search'),
                        component: 'movie_parser',
                        movie: e.data.movie,
                        search: e.data.movie.title,
                        page: 1
                    });
                });
                
                e.object.activity.render().find('.view--torrent').after(btn);
            }
        });
    }

    // Регистрация манифеста плагина
    var manifst = {
        type: 'video',
        version: Config.version,
        name: Config.name,
        description: Config.description,
        component: 'movie_parser'
    };

    // Запуск плагина при загрузке Lampa
    if (window.Lampa) {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'complite') {
                initPlugin();
            }
        });
    } else {
        document.addEventListener('DOMContentLoaded', initPlugin);
    }

    // Дополнительно: функции для работы с конкретными видеохостингами
    var VideoSources = {
        // Пример функции для получения ссылки на видео
        // В реальном плагине здесь был бы парсинг конкретных сайтов
        getVideoUrl: function(source, movieTitle, year, callback) {
            var network = new Lampa.Reguest();
            
            // Пример: поиск на Videomega (может не работать из-за CORS)
            // В реальном приложении нужен прокси-сервер
            switch(source) {
                case 'videomega':
                    // Логика для videomega.tv
                    break;
                case 'youtube':
                    // Логика для YouTube
                    break;
                default:
                    callback(null);
            }
        }
    };

    console.log('MovieParser: Плагин готов к использованию');
})();
