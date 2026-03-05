/**
 * Video Sources Module для Movie Parser Plugin
 * Модуль для работы с различными видеохостингами
 * 
 * ВНИМАНИЕ: Из-за CORS ограничений браузеров и TV приложений,
 * для полноценной работы требуется прокси-сервер.
 * Данный модуль демонстрирует структуру и подходы к парсингу.
 */

var VideoSources = (function() {
    'use strict';
    
    var network = new Lampa.Reguest();
    
    // Конфигурация источников
    var sources = {
        // YouTube (работает через iframe API)
        youtube: {
            name: 'YouTube',
            embed: 'https://www.youtube.com/embed/',
            search: 'https://www.googleapis.com/youtube/v3/search',
            api_key: '', // Требуется API ключ
            type: 'iframe'
        },
        
        // Публичные видеохостинги (могут не работать из-за CORS)
        videomega: {
            name: 'Videomega',
            base_url: 'https://videomega.tv',
            embed: 'https://videomega.tv/embed/',
            search: '/search',
            type: 'iframe'
        },
        
        vidup: {
            name: 'VidUP',
            embed: 'https://vidup.io/embed/',
            type: 'iframe'
        },
        
        verystream: {
            name: 'VeryStream',
            embed: 'https://verystream.com/embed/',
            type: 'iframe'
        },
        
        // Open video APIs
        openapi: {
            name: 'Open API Movies',
            // Пример публичного API для фильмов
            api_url: 'https://api.tvmaze.com/search/shows',
            type: 'api'
        },
        
        // Internet Archive (бесплатные фильмы)
        archive: {
            name: 'Internet Archive',
            base_url: 'https://archive.org/advancedsearch.php',
            type: 'api'
        }
    };
    
    /**
     * Поиск видео по названию
     */
    function searchVideo(query, source, callback) {
        if (!sources[source]) {
            callback(null);
            return;
        }
        
        var source_config = sources[source];
        
        switch(source) {
            case 'youtube':
                searchYouTube(query, source_config, callback);
                break;
            case 'openapi':
                searchTVMaze(query, source_config, callback);
                break;
            case 'archive':
                searchArchive(query, source_config, callback);
                break;
            default:
                callback(null);
        }
    }
    
    /**
     * Поиск на YouTube
     */
    function searchYouTube(query, config, callback) {
        // Используем iframe embed для воспроизведения
        // В реальном плагине нужен YouTube API
        var searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query + ' full movie');
        
        network.silent(searchUrl, function(html) {
            var results = [];
            
            // Парсим результаты из HTML (упрощённо)
            try {
                var match = html.match(/"videoId":"([a-zA-Z0-9_-]+)"/g);
                if (match) {
                    match.slice(0, 10).forEach(function(m) {
                        var id = m.match(/"videoId":"([a-zA-Z0-9_-]+)"/)[1];
                        results.push({
                            id: id,
                            title: 'YouTube Video',
                            url: 'https://www.youtube.com/watch?v=' + id,
                            embed: 'https://www.youtube.com/embed/' + id,
                            quality: 'auto',
                            source: 'youtube'
                        });
                    });
                }
            } catch(e) {
                console.log('YouTube search error:', e);
            }
            
            callback(results);
        }, function() {
            callback([]);
        });
    }
    
    /**
     * Поиск на TVMaze (публичное API)
     */
    function searchTVMaze(query, config, callback) {
        var url = config.api_url + '?q=' + encodeURIComponent(query);
        
        network.timeout(10000);
        network.silent(url, function(json) {
            if (Array.isArray(json)) {
                var results = json.slice(0, 10).map(function(item) {
                    return {
                        id: item.show.id,
                        title: item.show.name,
                        summary: item.show.summary,
                        image: item.show.image ? item.show.image.medium : '',
                        url: item.show.officialSite || '',
                        source: 'openapi'
                    };
                });
                callback(results);
            } else {
                callback([]);
            }
        }, function() {
            callback([]);
        });
    }
    
    /**
     * Поиск в Internet Archive
     */
    function searchArchive(query, config, callback) {
        var url = config.base_url + '?q=' + encodeURIComponent(query + ' movie') + 
                  '&fl[]=identifier&fl[]=title&fl[]=description&rows=20&output=json';
        
        network.timeout(15000);
        network.silent(url, function(json) {
            try {
                var data = JSON.parse(json);
                var results = (data.response || {}).docs || [];
                
                results = results.map(function(item) {
                    return {
                        id: item.identifier,
                        title: item.title,
                        description: item.description,
                        url: 'https://archive.org/details/' + item.identifier,
                        embed: 'https://archive.org/embed/' + item.identifier,
                        source: 'archive'
                    };
                });
                
                callback(results);
            } catch(e) {
                console.log('Archive search error:', e);
                callback([]);
            }
        }, function() {
            callback([]);
        });
    }
    
    /**
     * Получение прямой ссылки на видео
     * Примечание: требуется прокси для обхода CORS
     */
    function getDirectUrl(embedUrl, callback) {
        // В реальном плагине здесь был бы запрос к прокси-серверу
        // который делает request к embedUrl и возвращает video src
        
        // Для примера возвращаем embed URL
        callback(embedUrl);
    }
    
    /**
     * Создание iframe для воспроизведения
     */
    function createIframe(embedUrl, width, height) {
        return '<iframe src="' + embedUrl + '" ' +
               'width="' + (width || '100%') + '" ' +
               'height="' + (height || '100%') + '" ' +
               'frameborder="0" allowfullscreen></iframe>';
    }
    
    /**
     * Получить список всех источников
     */
    function getSourcesList() {
        return Object.keys(sources).map(function(key) {
            return {
                id: key,
                name: sources[key].name,
                type: sources[key].type
            };
        });
    }
    
    // Публичный API модуля
    return {
        search: searchVideo,
        getDirectUrl: getDirectUrl,
        createIframe: createIframe,
        getSourcesList: getSourcesList,
        sources: sources
    };
})();

// Экспорт для использования в основном плагине
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoSources;
}
