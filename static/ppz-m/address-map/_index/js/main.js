import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { getUrlParam } from '/static/ppz-m/_index/js/utils.js';
import GaodeMap, { parseGaodeData } from '/static/ppz-m/_index/js/gaode-map.js';
import AMapLoader from 'https://cdn.jsdelivr.net/npm/@amap/amap-jsapi-loader@1.0.1/+esm';

// 压缩高德地址数据
function compactGaodeData(gaodeRawData, lng, lat) {
    if (!gaodeRawData) {
        return { formatted_address: '', lng: lng || 0, lat: lat || 0, province: '', city: '', district: '', township: '', adcode: '', aoi_name: '' };
    }

    var data = gaodeRawData;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {
            return { formatted_address: '', lng: lng || 0, lat: lat || 0, province: '', city: '', district: '', township: '', adcode: '', aoi_name: '' };
        }
    }

    if (data.regeocode) {
        var regeocode = data.regeocode;
        var addrComp = regeocode.addressComponent || {};
        var aois = regeocode.aois || [];
        return {
            formatted_address: regeocode.formatted_address || '',
            lng: lng || 0,
            lat: lat || 0,
            province: addrComp.province || '',
            city: (typeof addrComp.city === 'string' ? addrComp.city : '') || addrComp.province || '',
            district: addrComp.district || '',
            township: addrComp.township || '',
            adcode: addrComp.adcode || '',
            aoi_name: aois.length > 0 ? (aois[0].name || '') : ''
        };
    }

    if (data.name !== undefined) {
        var loc = data.location ? data.location.split(',') : [];
        return {
            formatted_address: data.address || data.pname + data.cityname + data.adname + data.name,
            lng: loc.length === 2 ? parseFloat(loc[0]) : (lng || 0),
            lat: loc.length === 2 ? parseFloat(loc[1]) : (lat || 0),
            province: data.pname || '',
            city: data.cityname || '',
            district: data.adname || '',
            township: '',
            adcode: data.adcode || '',
            aoi_name: ''
        };
    }

    return { formatted_address: '', lng: lng || 0, lat: lat || 0, province: '', city: '', district: '', township: '', adcode: '', aoi_name: '' };
}

let initialAddress = null;
let currentSelectedAddress = null;
let gaodeMap = null;
let isEditMode = false;
let isSaveMode = false;

// 初始化页面
function initPage() {
    initialAddress = parseAddressParams();
    isEditMode = initialAddress && initialAddress.lng && initialAddress.lat;
    isSaveMode = getUrlParam('mode') === 'save';
    loadGaodeMapKey();
}

// 解析URL中的地址参数
function parseAddressParams() {
    const params = {};

    const location = getUrlParam('location');
    if (location) {
        const parts = location.split(',');
        if (parts.length === 2) {
            params.lng = parseFloat(parts[0]);
            params.lat = parseFloat(parts[1]);
        }
    }

    const lng = getUrlParam('lng');
    const lat = getUrlParam('lat');
    if (lng && lat) {
        params.lng = parseFloat(lng);
        params.lat = parseFloat(lat);
    }

    const address = getUrlParam('address');
    if (address) {
        params.address = decodeURIComponent(address);
    }

    return Object.keys(params).length > 0 ? params : null;
}

// 加载高德地图Key
async function loadGaodeMapKey() {
    showLoading();
    try {
        const result = await Auth.fetchApi('/gaode', 'getGaodeMapKey', {});
        const data = result.data;

        if (data && data.key) {
            loadGaodeMapScript(data.key);
        } else {
            throw new Error('获取地图Key失败');
        }
    } catch (error) {
        console.error('加载地图Key失败:', error);
        hideLoading();
        showToast(error.message || '加载地图失败', 'error');
    }
}

async function loadGaodeMapScript(key) {
    if (window.AMap) {
        initMap();
        return;
    }

    try {
        await AMapLoader.load({
            key: key,
            version: '2.0',
            plugins: ['AMap.Geocoder', 'AMap.Geolocation', 'AMap.Scale']
        });
        initMap();
    } catch (error) {
        hideLoading();
        showToast('加载地图脚本失败', { type: 'error' });
    }
}

// 初始化地图
async function initMap() {
    const mapOptions = {
        zoom: 15,
        pitch: 0,
        viewMode: '2D'
    };

    if (initialAddress && initialAddress.lng && initialAddress.lat) {
        mapOptions.center = [initialAddress.lng, initialAddress.lat];
    }

    gaodeMap = new GaodeMap('mapContainer', mapOptions);

    gaodeMap.on('addressSelected', function(addressInfo) {
        currentSelectedAddress = addressInfo;
        showAddressInfoPanel(addressInfo);
    });

    gaodeMap.on('mapMove', function() {
        hideAddressInfoPanel();
    });

    document.getElementById('zoomInBtn').addEventListener('click', function() {
        const currentZoom = gaodeMap.getZoom();
        if (currentZoom !== null && currentZoom < 18) {
            gaodeMap.setZoom(currentZoom + 1);
        }
    });

    document.getElementById('zoomOutBtn').addEventListener('click', function() {
        const currentZoom = gaodeMap.getZoom();
        if (currentZoom !== null && currentZoom > 3) {
            gaodeMap.setZoom(currentZoom - 1);
        }
    });

    const nativeMap = gaodeMap.getNativeMap();
    if (nativeMap) {
        nativeMap.on('click', function() {
            collapseAddressList();
        });
    }

    if (initialAddress && initialAddress.lng && initialAddress.lat) {
        gaodeMap.addMarker({
            position: [initialAddress.lng, initialAddress.lat],
            title: initialAddress.address || '初始位置'
        });

        showAddressInfoPanel({
            name: initialAddress.address || '',
            address: initialAddress.address || '',
            location: { lng: initialAddress.lng, lat: initialAddress.lat }
        });

        hideLoading();
        initSearch();
        return;
    }

    gaodeMap.on('location', function(result) {
        hideLoading();
        if (result.success) {
            showToast('已定位到当前位置', { type: 'info' });
        } else {
            showToast(result.message || '定位失败，请手动选择地址', 'error');
        }
    });

    await gaodeMap.locate();
    initSearch();
}

let searchDebounceTimer = null;
let currentSearchMarkers = [];
let currentSearchResults = [];
let currentLocation = null;

// 初始化搜索功能
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    searchInput.addEventListener('input', function(e) {
        const value = e.target.value.trim();
        btnClearSearch.style.display = value ? 'block' : 'none';

        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }

        if (value.length > 0) {
            searchDebounceTimer = setTimeout(function() {
                searchAddress(value);
            }, 300);
        } else {
            clearSearch();
        }
    });

    searchInput.addEventListener('focus', function() {
        const value = this.value.trim();
        if (value.length > 0 && currentSearchResults.length > 0) {
            showAddressList();
        }
    });
}

function isValidLngLat(lng, lat) {
    if (typeof lng !== 'number' || typeof lat !== 'number') {
        return false;
    }
    if (isNaN(lng) || isNaN(lat)) {
        return false;
    }
    if (!isFinite(lng) || !isFinite(lat)) {
        return false;
    }
    return true;
}

function getSafeMapCenter() {
    if (!gaodeMap) {
        return null;
    }
    try {
        const center = gaodeMap.getCenter();
        if (center && isValidLngLat(center.lng, center.lat)) {
            return center;
        }
    } catch (e) {
        console.warn('获取地图中心点失败:', e);
    }
    return null;
}

// 搜索地址
async function searchAddress(keyword) {
    if (!keyword || keyword.length === 0) {
        return;
    }

    console.log('开始搜索:', keyword);

    const query = {
        keywords: keyword,
        offset: '20',
        page: '1'
    };

    const mapCenter = getSafeMapCenter();
    if (mapCenter) {
        query.location = mapCenter.lng + ',' + mapCenter.lat;
        query.sortrule = 'distance';
    }

    try {
        const result = await Auth.fetchApi('/gaode', 'gaodeProxy', {
            api: 'searchPoi',
            query: query
        });
        const data = result.data;

        if (data && data.status === '1' && data.pois) {
            currentSearchResults = data.pois.map(function(poi) {
                const loc = poi.location ? poi.location.split(',') : [];
                return {
                    id: poi.id || '',
                    name: poi.name || '',
                    address: poi.address || '',
                    type: poi.type || '',
                    tel: poi.tel || '',
                    province: poi.pname || '',
                    city: poi.cityname || '',
                    district: poi.adname || '',
                    adcode: poi.adcode || '',
                    citycode: poi.citycode || '',
                    distance: poi.distance ? parseInt(poi.distance) : 0,
                    location: loc.length === 2 ? { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]) } : null,
                    gaodeRawData: poi
                };
            });
            console.log('搜索结果数量:', currentSearchResults.length);
            renderAddressList(currentSearchResults);
            showAddressMarkers(currentSearchResults);
        } else {
            showToast('搜索失败，请重试', { type: 'error' });
        }
    } catch (error) {
        console.error('搜索地址失败:', error);
        showToast('搜索失败，请重试', { type: 'error' });
    }
}

// 渲染搜索结果列表
function renderAddressList(list) {
    const addressList = document.getElementById('addressList');
    const resultCount = document.getElementById('searchResultCount');
    const listLength = list ? list.length : 0;

    resultCount.textContent = listLength > 0 ? `搜索结果 (${listLength})` : '未找到相关地址';

    if (!list || listLength === 0) {
        addressList.innerHTML = '<div class="empty-result">未找到相关地址</div>';
        showAddressList();
        return;
    }

    let html = '';
    list.forEach(function(item, index) {
        if (!item) return;

        const distanceText = item.distance ? formatDistance(item.distance) : '';
        const subtitle = item.address || item.type || '';

        html += `
            <div class="address-item" data-index="${index}" onclick="onAddressItemClick(${index})">
                <div class="address-item-icon">📍</div>
                <div class="address-item-content">
                    <div class="address-item-name">${item.name || '未知地点'}</div>
                    <div class="address-item-detail">${subtitle}</div>
                </div>
                ${distanceText ? `<div class="address-item-distance">${distanceText}</div>` : ''}
                <button class="btn-select-item" onclick="event.stopPropagation(); selectAddressByIndex(${index})">
                    选择
                </button>
            </div>
        `;
    });

    addressList.innerHTML = html;
    showAddressList();
}

// 在地图上标注搜索结果
function showAddressMarkers(list) {
    clearSearchMarkers();

    if (!list || list.length === 0 || !gaodeMap) {
        return;
    }

    const nativeMap = gaodeMap.getNativeMap();
    if (!nativeMap) {
        console.warn('无法获取原生地图实例');
        return;
    }

    console.log('开始添加标记, 数量:', list.length);

    list.forEach(function(item, index) {
        if (!item || !item.location) {
            console.log('跳过无效条目:', item);
            return;
        }

        const location = item.location;
        if (!isValidLngLat(location.lng, location.lat)) {
            console.log('跳过无效坐标:', location);
            return;
        }

        try {
            const lngLat = new AMap.LngLat(location.lng, location.lat);

            const marker = new AMap.Marker({
                position: lngLat,
                title: item.name || '',
                zIndex: 100 + index
            });

            const content = `
                <div style="padding: 8px 12px; min-width: 160px;">
                    <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">${item.name || '未知地点'}</div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${item.address || ''}</div>
                    <div style="text-align: right;">
                        <button onclick="window.__selectSearchAddress__(${index})" 
                                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                       color: white; 
                                       border: none; 
                                       padding: 5px 14px; 
                                       border-radius: 4px; 
                                       font-size: 12px; 
                                       cursor: pointer;">
                            选择
                        </button>
                    </div>
                </div>
            `;

            const infoWindow = new AMap.InfoWindow({
                content: content,
                offset: new AMap.Pixel(0, -30)
            });

            marker.on('click', function() {
                infoWindow.open(nativeMap, lngLat);
            });

            nativeMap.add(marker);
            currentSearchMarkers.push({ 
                marker: marker, 
                infoWindow: infoWindow, 
                data: item,
                index: index,
                lngLat: lngLat
            });

            console.log('添加标记成功:', item.name);
        } catch (e) {
            console.error('添加标记失败:', e, item);
        }
    });

    console.log('标记添加完成, 总数:', currentSearchMarkers.length);
}

function clearSearchMarkers() {
    if (currentSearchMarkers.length > 0 && gaodeMap) {
        try {
            const nativeMap = gaodeMap.getNativeMap();
            if (nativeMap) {
                currentSearchMarkers.forEach(function(item) {
                    if (item.marker) {
                        nativeMap.remove(item.marker);
                    }
                    if (item.infoWindow) {
                        item.infoWindow.close();
                    }
                });
            }
        } catch (e) {
            console.error('清除标记失败:', e);
        }
        currentSearchMarkers = [];
    }
}

function showAddressList() {
    const panel = document.getElementById('addressListPanel');
    panel.classList.remove('hidden');
    panel.classList.remove('collapsed');
    hideAddressInfoPanel();
}

function closeAddressList() {
    const panel = document.getElementById('addressListPanel');
    panel.classList.add('hidden');
    panel.classList.remove('collapsed');
}

function isAddressListCollapsed() {
    const panel = document.getElementById('addressListPanel');
    return panel.classList.contains('collapsed');
}

function toggleAddressList() {
    const panel = document.getElementById('addressListPanel');
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
    } else {
        panel.classList.add('collapsed');
    }
}

function collapseAddressList() {
    const panel = document.getElementById('addressListPanel');
    if (!panel.classList.contains('hidden')) {
        panel.classList.add('collapsed');
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    closeAddressList();
    clearSearchMarkers();
    currentSearchResults = [];
}

// 点击地址项
function onAddressItemClick(index) {
    console.log('点击地址项:', index);

    if (index < 0 || index >= currentSearchResults.length) {
        console.warn('无效的地址索引:', index);
        return;
    }

    const item = currentSearchResults[index];
    if (!item || !item.location) {
        console.warn('地址数据无效:', item);
        return;
    }

    const location = item.location;
    if (!isValidLngLat(location.lng, location.lat)) {
        console.warn('无效的坐标:', location);
        return;
    }

    try {
        const lngLat = new AMap.LngLat(location.lng, location.lat);
        const nativeMap = gaodeMap ? gaodeMap.getNativeMap() : null;

        if (nativeMap) {
            nativeMap.setZoomAndCenter(18, lngLat);

            const markerItem = currentSearchMarkers.find(function(m) {
                return m.index === index;
            });

            nativeMap.on('moveend', function handler() {
                nativeMap.off('moveend', handler);
                nativeMap.setCenter(lngLat);
                if (markerItem && markerItem.infoWindow) {
                    markerItem.infoWindow.open(nativeMap, markerItem.lngLat);
                }
            });
        }

        collapseAddressList();
    } catch (e) {
        console.error('处理地址点击失败:', e);
        showToast('操作失败，请重试', { type: 'error' });
    }
}

// 选中地址
function selectAddressByIndex(index) {
    console.log('选择地址:', index);

    if (index < 0 || index >= currentSearchResults.length) {
        showToast('地址数据无效', { type: 'error' });
        return;
    }

    const item = currentSearchResults[index];
    if (!item) {
        showToast('地址数据无效', { type: 'error' });
        return;
    }

    currentSelectedAddress = item;
    closeAddressList();
    clearSearchMarkers();
    confirmSelect();
}

window.__selectSearchAddress__ = function(index) {
    selectAddressByIndex(index);
};

function formatDistance(meters) {
    if (meters < 1000) {
        return meters + 'm';
    }
    return (meters / 1000).toFixed(1) + 'km';
}

function showAddressInfoPanel(addressInfo) {
    const panel = document.getElementById('addressInfoPanel');
    const nameEl = document.getElementById('selectedAddressName');
    const detailEl = document.getElementById('selectedAddressDetail');

    const displayInfo = parseGaodeData(addressInfo.gaodeRawData);
    const name = addressInfo.name || displayInfo.name || displayInfo.address || '选择的位置';
    const address = addressInfo.address || displayInfo.address || '';

    nameEl.textContent = name;
    detailEl.textContent = address;

    currentSelectedAddress = addressInfo;
    panel.classList.remove('hidden');
}

function hideAddressInfoPanel() {
    const panel = document.getElementById('addressInfoPanel');
    panel.classList.add('hidden');
}

// 确认选择地址
function confirmSelect() {
    if (!currentSelectedAddress) {
        showToast('请先选择一个地址', { type: 'error' });
        return;
    }

    if (isSaveMode) {
        showRemarkModal();
    } else {
        const lng = currentSelectedAddress.location ? currentSelectedAddress.location.lng : 0;
        const lat = currentSelectedAddress.location ? currentSelectedAddress.location.lat : 0;
        const gaodeData = compactGaodeData(currentSelectedAddress.gaodeRawData, lng, lat);

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'addressSelected', data: { gaode_data: gaodeData } }, '*');
        } else {
            const pickerMode = getUrlParam('picker_mode') || 'start';
            localStorage.setItem('ppz_pending_address', JSON.stringify({
                gaode_data: gaodeData,
                picker_mode: pickerMode
            }));
            window.history.back();
        }
    }
}

// 显示备注弹窗
function showRemarkModal() {
    const modal = document.getElementById('addressRemarkModal');
    const nameInput = document.getElementById('addressName');
    const remarkInput = document.getElementById('addressRemark');

    const gaodeData = currentSelectedAddress ? compactGaodeData(
        currentSelectedAddress.gaodeRawData,
        currentSelectedAddress.location ? currentSelectedAddress.location.lng : 0,
        currentSelectedAddress.location ? currentSelectedAddress.location.lat : 0
    ) : {};

    nameInput.value = gaodeData.aoi_name || '';
    remarkInput.value = gaodeData.formatted_address || '';

    modal.classList.add('show');
    nameInput.focus();
}

function closeRemarkModal() {
    const modal = document.getElementById('addressRemarkModal');
    modal.classList.remove('show');
}

// 提交备注
function submitRemark() {
    const nameInput = document.getElementById('addressName');
    const remark = nameInput.value.trim();

    if (!remark) {
        showToast('请输入地址名称', { type: 'error' });
        nameInput.focus();
        return;
    }

    closeRemarkModal();

    const lng = currentSelectedAddress.location ? currentSelectedAddress.location.lng : 0;
    const lat = currentSelectedAddress.location ? currentSelectedAddress.location.lat : 0;
    const gaodeData = compactGaodeData(currentSelectedAddress.gaodeRawData, lng, lat);

    window.parent.postMessage({ type: 'addressSelected', data: { gaode_data: gaodeData, remark: remark } }, '*');
}

// 取消选择
function cancelSelect() {
    window.parent.postMessage({ type: 'addressCancel' }, '*');
}

document.addEventListener('DOMContentLoaded', initPage);

window.clearSearch = clearSearch;
window.toggleAddressList = toggleAddressList;
window.onAddressItemClick = onAddressItemClick;
window.selectAddressByIndex = selectAddressByIndex;
window.confirmSelect = confirmSelect;
window.cancelSelect = cancelSelect;
window.closeRemarkModal = closeRemarkModal;
window.submitRemark = submitRemark;
window.__gaodeMapSelectAddress__ = confirmSelect;
