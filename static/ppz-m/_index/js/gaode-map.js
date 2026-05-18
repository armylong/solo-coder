import { Auth } from '/static/_common/auth.js';

// 解析高德地址数据
export function parseGaodeData(gaodeData) {
    if (typeof gaodeData === 'string') {
        try {
            gaodeData = JSON.parse(gaodeData);
        } catch (e) {
            return {};
        }
    }
    if (!gaodeData) return {};

    if (gaodeData.formatted_address !== undefined) {
        return {
            name: gaodeData.aoi_name || '',
            address: gaodeData.formatted_address || '',
            province: gaodeData.province || '',
            city: gaodeData.city || '',
            district: gaodeData.district || '',
            adcode: gaodeData.adcode || '',
            location: (gaodeData.lng && gaodeData.lat) ? { lng: gaodeData.lng, lat: gaodeData.lat } : null
        };
    }

    var location = null;
    if (gaodeData.location) {
        var loc = typeof gaodeData.location === 'string' ? gaodeData.location.split(',') : [];
        if (loc.length === 2) {
            location = { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]) };
        }
    }

    if (gaodeData.regeocode) {
        const regeocode = gaodeData.regeocode;
        const addrComp = regeocode.addressComponent || {};
        const pois = regeocode.pois || [];
        const firstPoi = pois.length > 0 ? pois[0] : null;
        if (!location && firstPoi && firstPoi.location) {
            var loc = firstPoi.location.split(',');
            if (loc.length === 2) {
                location = { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]) };
            }
        }
        return {
            name: firstPoi ? firstPoi.name : '',
            address: regeocode.formatted_address || '',
            province: addrComp.province || '',
            city: (typeof addrComp.city === 'string' ? addrComp.city : '') || addrComp.province || '',
            district: addrComp.district || '',
            adcode: addrComp.adcode || '',
            location: location
        };
    }

    if (gaodeData.name !== undefined) {
        return {
            name: gaodeData.name || '',
            address: gaodeData.address || '',
            province: gaodeData.pname || '',
            city: gaodeData.cityname || '',
            district: gaodeData.adname || '',
            adcode: gaodeData.adcode || '',
            location: location
        };
    }

    return gaodeData;
}

export default class GaodeMap {
    constructor(containerId, options) {
        this.containerId = containerId;
        this.options = options || {};
        this.map = null;
        this.geocoder = null;
        this.geolocation = null;
        this.markers = [];
        this.clickMarker = null;
        this.eventHandlers = {};
        this.isDragging = false;
        this.lastClickTime = 0;
        this.longPressTimer = null;
        this.longPressTriggered = false;
        this.lastLngLat = null;

        this.init();
    }

    init() {
        if (!window.AMap) {
            console.error('高德地图API未加载，请先加载AMap脚本');
            return;
        }

        const defaultOptions = {
            zoom: 15,
            pitch: 0,
            viewMode: '2D',
            zoomEnable: true,
            dragEnable: true,
            keyboardEnable: true,
            doubleClickZoom: true,
            scrollWheel: true,
            touchZoom: true,
            touchZoomCenter: 1
        };

        const mapOptions = Object.assign({}, defaultOptions, this.options);

        this.map = new AMap.Map(this.containerId, mapOptions);

        this.initGeocoder();
        this.initControls();
        this.initEventListeners();
    }

    initGeocoder() {
        if (AMap.Geocoder) {
            this.geocoder = new AMap.Geocoder({
                city: '全国',
                radius: 1000,
                extensions: 'base'
            });
        }
    }

    initControls() {
        if (AMap.Scale) {
            const scale = new AMap.Scale({
                position: 'LB'
            });
            this.map.addControl(scale);
        }
    }

    initEventListeners() {
        const self = this;

        this.map.on('click', function(e) {
            const now = Date.now();
            if (now - self.lastClickTime < 300) {
                return;
            }
            self.lastClickTime = now;

            if (self.longPressTriggered) {
                self.longPressTriggered = false;
                return;
            }

            self.handleMapClick(e);
        });

        this.map.on('mousedown', function(e) {
            self.isDragging = false;
            self.longPressTriggered = false;
            self.lastLngLat = e.lnglat;

            self.longPressTimer = setTimeout(function() {
                if (!self.isDragging) {
                    self.longPressTriggered = true;
                    self.handleMapLongPress(e);
                }
            }, 500);
        });

        this.map.on('mouseup', function(e) {
            if (self.longPressTimer) {
                clearTimeout(self.longPressTimer);
                self.longPressTimer = null;
            }
        });

        this.map.on('dragstart', function(e) {
            self.isDragging = true;
            if (self.longPressTimer) {
                clearTimeout(self.longPressTimer);
                self.longPressTimer = null;
            }
        });

        this.map.on('dragging', function(e) {
            self.trigger('mapMove', e);
        });

        this.map.on('moveend', function(e) {
            const center = self.map.getCenter();
            if (center) {
                self.trigger('mapMoveEnd', {
                    lng: center.lng,
                    lat: center.lat,
                    lnglat: center
                });
            }
        });

        this.map.on('zoomstart', function(e) {
            self.trigger('mapZoomStart', e);
        });

        this.map.on('zoomend', function(e) {
            self.trigger('mapZoomEnd', {
                zoom: self.map.getZoom()
            });
        });

        this.map.on('complete', function() {
            self.trigger('mapComplete', {});
        });
    }

    handleMapClick(e) {
        const lnglat = e.lnglat;
        const self = this;

        this.getAddressByLocation(lnglat, function(err, gaodeRawData) {
            const info = {
                location: {
                    lng: lnglat.lng,
                    lat: lnglat.lat
                },
                lnglat: lnglat,
                gaodeRawData: gaodeRawData || null
            };

            self.showClickMarker(lnglat, info);
            self.trigger('addressSelected', info);
        });
    }

    handleMapLongPress(e) {
        this.handleMapClick(e);
    }

    getAddressByLocation(lnglat, callback) {
        const self = this;

        Auth.fetchApi('/gaode', 'gaodeProxy', {
            api: 'regeo',
            query: {
                location: lnglat.lng + ',' + lnglat.lat,
                extensions: 'all'
            }
        })
        .then(function(result) {
            const data = result.data;
            if (data && data.status === '1' && data.regeocode) {
                callback(null, data);
            } else {
                console.warn('后端获取地址失败，将只返回经纬度信息');
                callback(null, null);
            }
        })
        .catch(function(error) {
            console.warn('请求后端地址接口失败:', error, '，将只返回经纬度信息');
            callback(null, null);
        });
    }

    showClickMarker(lnglat, info) {
        if (this.clickMarker) {
            this.map.remove(this.clickMarker);
        }

        const displayInfo = info.gaodeRawData ? parseGaodeData(info.gaodeRawData) : null;

        this.clickMarker = new AMap.Marker({
            position: lnglat,
            title: displayInfo?.name || displayInfo?.address || '选择的位置'
        });

        this.map.add(this.clickMarker);

        if (this.infoWindow) {
            this.infoWindow.close();
        }

        const content = this.createInfoWindowContent(displayInfo, lnglat);
        this.infoWindow = new AMap.InfoWindow({
            content: content,
            offset: [0, -30],
            showShadow: false
        });

        this.infoWindow.open(this.map, lnglat);
    }

    createInfoWindowContent(displayInfo, lnglat) {
        const name = displayInfo?.name || '选择的位置';
        const address = displayInfo?.address || `${lnglat.lng.toFixed(6)}, ${lnglat.lat.toFixed(6)}`;

        return `
            <div style="padding: 8px 12px; min-width: 180px;">
                <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 6px;">${name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${address}</div>
                <div style="text-align: right;">
                    <button onclick="window.__gaodeMapSelectAddress__()" 
                            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                   color: white; 
                                   border: none; 
                                   padding: 6px 16px; 
                                   border-radius: 4px; 
                                   font-size: 12px; 
                                   cursor: pointer;">
                        选择此地址
                    </button>
                </div>
            </div>
        `;
    }

    on(eventName, handler) {
        if (!this.eventHandlers[eventName]) {
            this.eventHandlers[eventName] = [];
        }
        this.eventHandlers[eventName].push(handler);
    }

    off(eventName, handler) {
        if (!this.eventHandlers[eventName]) {
            return;
        }
        const index = this.eventHandlers[eventName].indexOf(handler);
        if (index > -1) {
            this.eventHandlers[eventName].splice(index, 1);
        }
    }

    trigger(eventName, data) {
        if (!this.eventHandlers[eventName]) {
            return;
        }
        this.eventHandlers[eventName].forEach(function(handler) {
            handler(data);
        });
    }

    locate() {
        const self = this;

        return new Promise(function(resolve, reject) {
            if (!AMap.Geolocation) {
                self.trigger('location', {
                    success: false,
                    message: '定位服务未加载'
                });
                reject(new Error('定位服务未加载'));
                return;
            }

            if (!self.geolocation) {
                self.geolocation = new AMap.Geolocation({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    buttonPosition: 'RB',
                    buttonOffset: new AMap.Pixel(10, 20),
                    zoomToAccuracy: true,
                    showCircle: true,
                    showMarker: true
                });
                self.map.addControl(self.geolocation);
            }

            self.geolocation.getCurrentPosition(function(status, result) {
                if (status === 'complete') {
                    const position = result.position;
                    self.trigger('location', {
                        success: true,
                        location: {
                            lng: position.lng,
                            lat: position.lat
                        },
                        lnglat: position,
                        accuracy: result.accuracy
                    });
                    resolve({
                        success: true,
                        location: {
                            lng: position.lng,
                            lat: position.lat
                        }
                    });
                } else {
                    self.trigger('location', {
                        success: false,
                        message: '定位失败: ' + result.message
                    });
                    reject(new Error('定位失败: ' + result.message));
                }
            });
        });
    }

    setCenter(lng, lat) {
        if (this.map) {
            this.map.setCenter([lng, lat]);
        }
    }

    setZoom(zoom) {
        if (this.map) {
            this.map.setZoom(zoom);
        }
    }

    setZoomAndCenter(zoom, lng, lat) {
        if (this.map) {
            this.map.setZoomAndCenter(zoom, [lng, lat]);
        }
    }

    getCenter() {
        if (this.map) {
            const center = this.map.getCenter();
            return {
                lng: center.lng,
                lat: center.lat
            };
        }
        return null;
    }

    getZoom() {
        if (this.map) {
            return this.map.getZoom();
        }
        return null;
    }

    addMarker(options) {
        if (!this.map || !options.position) {
            return null;
        }

        const markerOptions = {
            position: options.position,
            title: options.title || '',
            offset: options.offset || new AMap.Pixel(-13, -30),
            animation: options.animation || 'AMAP_ANIMATION_DROP'
        };

        if (options.icon) {
            markerOptions.icon = options.icon;
        }

        if (options.content) {
            markerOptions.content = options.content;
        }

        const marker = new AMap.Marker(markerOptions);
        this.map.add(marker);
        this.markers.push(marker);

        return marker;
    }

    removeMarker(marker) {
        if (this.map && marker) {
            this.map.remove(marker);
            const index = this.markers.indexOf(marker);
            if (index > -1) {
                this.markers.splice(index, 1);
            }
        }
    }

    clearMarkers() {
        if (this.map && this.markers.length > 0) {
            this.map.remove(this.markers);
            this.markers = [];
        }
    }

    destroy() {
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.eventHandlers = {};
        this.markers = [];
    }

    getNativeMap() {
        return this.map;
    }
}
