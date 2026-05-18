import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { requireLogin } from '/static/_common/login-modal.js';
import AMapLoader from 'https://cdn.jsdelivr.net/npm/@amap/amap-jsapi-loader@1.0.1/+esm';
import ClipperLib from 'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/+esm';

const SCALE = 1e6;

// 经纬度转Clipper坐标
function toClipperPath(path) {
    return path.map(p => ({ X: Math.round(p[0] * SCALE), Y: Math.round(p[1] * SCALE) }));
}

// Clipper坐标转经纬度
function fromClipperPath(path) {
    return path.map(p => [p.X / SCALE, p.Y / SCALE]);
}

// 围栏布尔运算（并集/差集）
function fenceBooleanOp(subjectFence, clipFence, clipType) {
    const cpr = new ClipperLib.Clipper();
    const pft = ClipperLib.PolyFillType.pftEvenOdd;

    for (const polygon of subjectFence) {
        for (const ring of polygon) {
            cpr.AddPath(toClipperPath(ring), ClipperLib.PolyType.ptSubject, true);
        }
    }
    for (const polygon of clipFence) {
        for (const ring of polygon) {
            cpr.AddPath(toClipperPath(ring), ClipperLib.PolyType.ptClip, true);
        }
    }

    const polyTree = new ClipperLib.PolyTree();
    cpr.Execute(clipType, polyTree, pft, pft);

    const result = [];
    const topChilds = typeof polyTree.Childs === 'function' ? polyTree.Childs() : (polyTree.Childs || []);
    for (const node of topChilds) {
        const contour = typeof node.Contour === 'function' ? node.Contour() : node.Contour;
        if (!contour || contour.length < 3) continue;
        const polygon = [fromClipperPath(contour)];
        const holeChilds = typeof node.Childs === 'function' ? node.Childs() : (node.Childs || []);
        for (const hole of holeChilds) {
            const holeContour = typeof hole.Contour === 'function' ? hole.Contour() : hole.Contour;
            if (holeContour && holeContour.length >= 3) {
                polygon.push(fromClipperPath(holeContour));
            }
        }
        result.push(polygon);
    }
    return result;
}

// 蓝色围栏转绿色格式
function blueToGreenFormat(bluePaths) {
    return bluePaths.map(path => [path.map(p => p.slice())]);
}

const GAODE_API_BASE = '/gaode';
const BUSINESS_AREA_API_BASE = '/business_area';

let areaId = 0;
let areaName = '';
let isEditMode = false;
let isOnlyView = false;

let map = null;
let geolocation = null;
let currentFencePolygons = [];
let provinceSelect = null;
let citySelect = null;
let districtSelect = null;
let currentProvinceAdcode = '';
let currentCityAdcode = '';

let blueFence = [];
let blueMarkers = [];
let bluePolylines = [];
let bluePolygons = [];
let blueActiveMarker = null;
let blueDeleteBtns = [];

let greenPolygons = [];
let greenFence = [];

const PROVINCE_DATA = [
    { name: '北京市', code: '110000' },
    { name: '天津市', code: '120000' },
    { name: '河北省', code: '130000' },
    { name: '山西省', code: '140000' },
    { name: '内蒙古自治区', code: '150000' },
    { name: '辽宁省', code: '210000' },
    { name: '吉林省', code: '220000' },
    { name: '黑龙江省', code: '230000' },
    { name: '上海市', code: '310000' },
    { name: '江苏省', code: '320000' },
    { name: '浙江省', code: '330000' },
    { name: '安徽省', code: '340000' },
    { name: '福建省', code: '350000' },
    { name: '江西省', code: '360000' },
    { name: '山东省', code: '370000' },
    { name: '河南省', code: '410000' },
    { name: '湖北省', code: '420000' },
    { name: '湖南省', code: '430000' },
    { name: '广东省', code: '440000' },
    { name: '广西壮族自治区', code: '450000' },
    { name: '海南省', code: '460000' },
    { name: '重庆市', code: '500000' },
    { name: '四川省', code: '510000' },
    { name: '贵州省', code: '520000' },
    { name: '云南省', code: '530000' },
    { name: '西藏自治区', code: '540000' },
    { name: '陕西省', code: '610000' },
    { name: '甘肃省', code: '620000' },
    { name: '青海省', code: '630000' },
    { name: '宁夏回族自治区', code: '640000' },
    { name: '新疆维吾尔自治区', code: '650000' },
    { name: '台湾省', code: '710000' },
    { name: '香港特别行政区', code: '810000' },
    { name: '澳门特别行政区', code: '820000' }
];

let loadingCounter = 0;

function safeShowLoading() {
    loadingCounter++;
    if (loadingCounter === 1) showLoading();
}

function safeHideLoading() {
    loadingCounter--;
    if (loadingCounter <= 0) {
        loadingCounter = 0;
        hideLoading();
    }
}



document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.ADMIN)) return;

    const urlParams = new URLSearchParams(window.location.search);
    areaId = parseInt(urlParams.get('area_id')) || 0;
    isEditMode = areaId > 0;
    isOnlyView = urlParams.get('only_view') === '1';

    if (isOnlyView) {
        document.getElementById('pageTitle').textContent = '查看运营区域';
    } else if (isEditMode) {
        document.getElementById('pageTitle').textContent = '编辑运营区域';
    } else {
        document.getElementById('pageTitle').textContent = '添加运营区域';
    }

    initPage();
});

// 初始化页面
function initPage() {
    provinceSelect = document.getElementById('provinceSelect');
    citySelect = document.getElementById('citySelect');
    districtSelect = document.getElementById('districtSelect');
    bindEvents();
    if (isOnlyView) {
        applyOnlyViewMode();
    }
    loadGaodeMapKey();
}

// 只读模式：禁用所有编辑控件
function applyOnlyViewMode() {
    document.getElementById('provinceSelect').disabled = true;
    document.getElementById('citySelect').disabled = true;
    document.getElementById('districtSelect').disabled = true;
    document.getElementById('searchInput').disabled = true;
    document.getElementById('searchBtn').disabled = true;

    document.getElementById('addFenceBtn').disabled = true;
    document.getElementById('removeFenceBtn').disabled = true;
    document.getElementById('clearAllBtn').disabled = true;
    document.getElementById('submitBtn').disabled = true;

    const actionBar = document.getElementById('actionBar');
    if (actionBar) actionBar.style.display = 'none';
}

function bindEvents() {
    document.getElementById('searchBtn').addEventListener('click', () => {
        const keyword = document.getElementById('searchInput').value.trim();
        console.log('搜索按钮被点击，关键词:', keyword, 'loadingCounter:', loadingCounter);
        if (keyword) {
            searchDistrict(keyword);
        } else {
            showToast('请输入搜索关键词', { type: 'error', closable: true });
        }
    });

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('searchBtn').click();
    });

    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

    provinceSelect.addEventListener('change', onProvinceChange);
    citySelect.addEventListener('change', onCityChange);
    districtSelect.addEventListener('change', onDistrictChange);

    document.addEventListener('click', (e) => {
        if (blueDeleteBtns.length > 0 && !e.target.closest('.point-delete-btn') && !e.target.closest('.amap-marker')) {
            hideDeleteButton();
        }
    });

    window.addEventListener('resize', () => {
        if (blueDeleteBtns.length > 0) {
            hideDeleteButton();
        }
    });

    document.getElementById('addFenceBtn').addEventListener('click', onAddFence);
    document.getElementById('removeFenceBtn').addEventListener('click', onRemoveFence);
    document.getElementById('clearAllBtn').addEventListener('click', onClearAllGreenFence);
    document.getElementById('submitBtn').addEventListener('click', onSubmit);

    document.getElementById('closeModalBtn').addEventListener('click', closeSubmitModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeSubmitModal);
    document.getElementById('confirmModalBtn').addEventListener('click', onConfirmCreate);

    document.getElementById('areaNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('confirmModalBtn').click();
    });

    document.getElementById('submitModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeSubmitModal();
        }
    });

    document.getElementById('closeConfirmModalBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelConfirmModalBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmEditBtn').addEventListener('click', onConfirmEdit);

    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeConfirmModal();
        }
    });
}

// 加载高德地图Key
async function loadGaodeMapKey() {
    safeShowLoading();
    try {
        const result = await Auth.fetchApi(GAODE_API_BASE, 'getGaodeMapKey', {});
        const data = result.data;
        if (data && data.key) {
            await loadGaodeMapScript(data.key);
        } else {
            throw new Error('获取地图Key失败');
        }
    } catch (error) {
        safeHideLoading();
        showToast(error.message || '加载地图失败', { type: 'error', closable: true });
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
            plugins: ['AMap.Geolocation', 'AMap.Scale', 'AMap.Geocoder']
        });
        initMap();
    } catch (error) {
        safeHideLoading();
        showToast('加载地图脚本失败', { type: 'error', closable: true });
    }
}

// 初始化地图
function initMap() {
    map = new AMap.Map('mapContainer', {
        zoom: 12,
        pitch: 0,
        viewMode: '2D',
        zoomEnable: true,
        dragEnable: true
    });

    map.addControl(new AMap.Scale({ position: 'LB' }));

    geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: false,
        showCircle: false,
        showMarker: true,
        markerOptions: {
            content: '<div style="width:12px;height:12px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.6);"></div>',
            offset: new AMap.Pixel(-6, -6)
        }
    });
    map.addControl(geolocation);

    initProvinceSelect();

    map.on('complete', () => {
        safeHideLoading();
        if (isEditMode) {
            loadExistingFenceData();
        } else {
            locateCurrentPosition();
        }
    });

    map.on('click', onMapClick);
}

// 加载已有围栏数据（编辑模式）
async function loadExistingFenceData() {
    safeShowLoading();
    try {
        const result = await Auth.fetchApi(BUSINESS_AREA_API_BASE, 'get', { area_id: areaId });
        const area = result.data.area;
        if (area) {
            areaName = area.area_name;
            document.getElementById('areaNameDisplay').textContent = areaName;
            document.getElementById('areaNameDisplay').style.display = 'inline';

            if (area.area_fence && Array.isArray(area.area_fence) && area.area_fence.length > 0) {
                greenFence = area.area_fence;
                renderGreenFence();

                if (greenPolygons.length > 0) {
                    map.setFitView(greenPolygons, false, [60, 60, 60, 60]);
                }
                showToast(`已加载区域"${areaName}"的围栏数据`, { type: 'success', closable: true });
            } else {
                locateCurrentPosition();
            }
        }
    } catch (error) {
        showToast('加载区域数据失败: ' + error.message, { type: 'error', closable: true });
        locateCurrentPosition();
    } finally {
        safeHideLoading();
    }
}

function initProvinceSelect() {
    provinceSelect.innerHTML = '<option value="">请选择省份</option>';
    PROVINCE_DATA.forEach(province => {
        const option = document.createElement('option');
        option.value = province.code;
        option.textContent = province.name;
        option.dataset.name = province.name;
        provinceSelect.appendChild(option);
    });
    provinceSelect.disabled = isOnlyView;
}

function onProvinceChange() {
    const provinceCode = provinceSelect.value;
    const provinceName = provinceSelect.options[provinceSelect.selectedIndex]?.dataset?.name || '';

    resetSelect(citySelect, '请选择城市');
    resetSelect(districtSelect, '请选择区县');

    currentProvinceAdcode = provinceCode;
    currentCityAdcode = '';

    if (!provinceCode) {
        citySelect.disabled = true;
        districtSelect.disabled = true;
        return;
    }

    citySelect.disabled = isOnlyView;
    loadSubDistricts(provinceName, provinceCode, citySelect);
}

function onCityChange() {
    const cityCode = citySelect.value;
    const cityName = citySelect.options[citySelect.selectedIndex]?.dataset?.name || '';

    resetSelect(districtSelect, '请选择区县');

    currentCityAdcode = cityCode;

    if (!cityCode) {
        districtSelect.disabled = true;
        return;
    }

    districtSelect.disabled = false;
    loadSubDistricts(cityName, cityCode, districtSelect);
}

function onDistrictChange() {
    const districtCode = districtSelect.value;
    const districtName = districtSelect.options[districtSelect.selectedIndex]?.dataset?.name || '';

    if (!districtCode) return;

    navigateAndDrawFence(districtName, districtCode);
}

function resetSelect(select, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    select.disabled = true;
}

// 加载子行政区
async function loadSubDistricts(keyword, adcode, selectElement) {
    safeShowLoading();
    try {
        const result = await Auth.fetchApi(GAODE_API_BASE, 'gaodeProxy', {
            api: 'searchDistrict',
            query: {
                keywords: keyword,
                subdistrict: '1',
                extensions: 'base'
            }
        });

        const data = result.data;
        if (!data || !data.districts || data.districts.length === 0) {
            safeHideLoading();
            showToast('获取行政区数据失败', { type: 'error', closable: true });
            return;
        }

        const district = data.districts[0];
        const subDistricts = district.districts || [];

        if (subDistricts.length > 0) {
            subDistricts.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.adcode;
                option.textContent = sub.name;
                option.dataset.name = sub.name;
                option.dataset.center = sub.center || '';
                selectElement.appendChild(option);
            });
            selectElement.disabled = false;
        }

        await navigateAndDrawFence(keyword, adcode);
        safeHideLoading();
    } catch (error) {
        safeHideLoading();
        showToast(error.message || '获取行政区数据失败', { type: 'error', closable: true });
    }
}

// 导航到行政区并绘制围栏
async function navigateAndDrawFence(keyword, adcode) {
    safeShowLoading();
    try {
        const result = await Auth.fetchApi(GAODE_API_BASE, 'gaodeProxy', {
            api: 'searchDistrict',
            query: {
                keywords: keyword,
                subdistrict: '0',
                extensions: 'all'
            }
        });

        safeHideLoading();

        const data = result.data;
        if (!data || !data.districts || data.districts.length === 0) {
            showToast('未找到该行政区域', { type: 'error', closable: true });
            return;
        }

        let district = data.districts[0];

        if (adcode) {
            const found = findDistrictByAdcode(data.districts, adcode);
            if (found) district = found;
        }

        if (district.polyline && district.polyline.length > 0) {
            drawFenceAsEditablePoints(district);
        } else if (district.center) {
            const center = parseCenter(district.center);
            if (center) {
                const level = district.level || '';
                let zoom = 12;
                if (level === 'province') zoom = 7;
                else if (level === 'city') zoom = 10;
                else if (level === 'district') zoom = 12;
                map.setZoomAndCenter(zoom, center);
            }
        } else {
            console.warn('未找到边界数据, district:', district);
            const level = district.level || '';
            if (level === 'street') {
                showToast('街道/乡镇级别不支持绘制围栏（高德API不提供该级别边界数据）', { type: 'error', closable: true });
            } else {
                showToast('未找到该区域的边界数据', { type: 'error', closable: true });
            }
        }
    } catch (error) {
        safeHideLoading();
        showToast(error.message || '获取行政区数据失败', { type: 'error', closable: true });
    }
}

function findDistrictByAdcode(districts, adcode) {
    for (const d of districts) {
        if (d.adcode === adcode) return d;
        if (d.districts && d.districts.length > 0) {
            const found = findDistrictByAdcode(d.districts, adcode);
            if (found) return found;
        }
    }
    return null;
}

// 搜索行政区
async function searchDistrict(keyword) {
    if (!keyword) {
        showToast('请输入搜索关键词', { type: 'error', closable: true });
        return;
    }

    safeShowLoading();
    try {
        const query = {
            keywords: keyword,
            subdistrict: '0',
            extensions: 'all'
        };

        const filterCode = getCurrentFilterCode();
        if (filterCode) {
            query.filter = filterCode;
        }

        const result = await Auth.fetchApi(GAODE_API_BASE, 'gaodeProxy', {
            api: 'searchDistrict',
            query: query
        });
        safeHideLoading();

        const data = result.data;
        if (!data || !data.districts || data.districts.length === 0) {
            showToast('未找到该行政区域', { type: 'error', closable: true });
            return;
        }

        const district = data.districts[0];

        if (district.polyline && district.polyline.length > 0) {
            drawFenceAsEditablePoints(district);
        } else if (district.center) {
            const center = parseCenter(district.center);
            if (center) {
                const level = district.level || '';
                let zoom = 12;
                if (level === 'province') zoom = 7;
                else if (level === 'city') zoom = 10;
                else if (level === 'district') zoom = 12;
                else if (level === 'street') zoom = 14;
                map.setZoomAndCenter(zoom, center);
            }
        } else {
            console.warn('未找到边界数据, district:', district);
            const level = district.level || '';
            if (level === 'street') {
                showToast('街道/乡镇级别不支持绘制围栏（高德API不提供该级别边界数据）', { type: 'error', closable: true });
            } else {
                showToast('未找到该区域的边界数据', { type: 'error', closable: true });
            }
        }
    } catch (error) {
        safeHideLoading();
        showToast(error.message || '搜索失败', { type: 'error', closable: true });
    }
}

function getCurrentFilterCode() {
    if (currentCityAdcode) return currentCityAdcode;
    if (currentProvinceAdcode) return currentProvinceAdcode;
    return '';
}

function parseCenter(center) {
    if (!center) return null;
    if (Array.isArray(center)) return center;
    if (typeof center === 'string') {
        const parts = center.split(',');
        if (parts.length === 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
        }
    }
    return null;
}

// 将行政区边界绘制为可编辑的蓝色点
function drawFenceAsEditablePoints(district) {
    blueFence = [];
    clearBlueGraphics();
    clearFence();

    const polylineData = district.polyline;
    if (!polylineData || polylineData.length === 0) {
        showToast('没有边界数据可绘制', { type: 'error', closable: true });
        return;
    }

    const polylineStr = Array.isArray(polylineData) ? polylineData.join('|') : polylineData;
    const paths = parsePolyline(polylineStr);

    if (paths.length === 0) {
        showToast('边界数据解析失败', { type: 'error', closable: true });
        return;
    }

    paths.forEach((path, pathIndex) => {
        if (path.length < 3) return;

        let points;
        if (path.length > 100) {
            const step = Math.floor(path.length / 100);
            const simplified = [];
            for (let i = 0; i < path.length; i += step) {
                simplified.push(path[i].slice());
            }
            const lastS = simplified[simplified.length - 1];
            const lastP = path[path.length - 1];
            if (lastS[0] !== lastP[0] || lastS[1] !== lastP[1]) {
                simplified.push(lastP.slice());
            }
            points = simplified;
        } else {
            points = path.map(p => p.slice());
        }

        blueFence.push(points);
    });

    if (blueFence.length === 0) {
        showToast('边界数据点不足', { type: 'error', closable: true });
        return;
    }

    let totalPoints = blueFence.reduce((sum, poly) => sum + poly.length, 0);
    renderBlueGraphics();

    if (bluePolygons.length > 0) {
        map.setFitView(bluePolygons, false, [60, 60, 60, 60]);
    } else if (bluePolylines.length > 0) {
        map.setFitView(bluePolylines, false, [60, 60, 60, 60]);
    } else if (blueMarkers.length > 0) {
        map.setFitView(blueMarkers, false, [60, 60, 60, 60]);
    }

    let msg = `已显示 "${district.name}" 围栏`;
    if (blueFence.length > 1) {
        msg += `，共 ${blueFence.length} 块区域、${totalPoints} 个顶点`;
    } else {
        msg += `，共 ${totalPoints} 个顶点`;
    }
    msg += '，点击地图可添加新顶点';
    showToast(msg, { type: 'success', closable: true });
}

// 解析高德polyline字符串
function parsePolyline(polylineStr) {
    if (!polylineStr) return [];

    if (typeof polylineStr !== 'string') return [];

    const result = [];

    const segments = polylineStr.split('|');

    segments.forEach(segment => {
        const path = [];
        const points = segment.split(';');

        points.forEach(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                    path.push([lng, lat]);
                }
            }
        });

        if (path.length >= 3) {
            result.push(path);
        }
    });

    return result;
}

function clearFence() {
    if (currentFencePolygons.length > 0) {
        map.remove(currentFencePolygons);
        currentFencePolygons = [];
    }
}

function locateCurrentPosition() {
    if (!geolocation) return;

    geolocation.getCurrentPosition((status, result) => {
        if (status === 'complete') {
            const position = result.position;
            map.setZoomAndCenter(12, position);
        } else {
            console.warn('定位失败:', result.message);
            map.setZoomAndCenter(10, [116.397428, 39.90923]);
        }
    });
}

function distanceSquared(a, b) {
    return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
}

function pointToSegmentDistSq(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return distanceSquared(p, a);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a[0] + t * dx;
    const projY = a[1] + t * dy;
    return (p[0] - projX) * (p[0] - projX) + (p[1] - projY) * (p[1] - projY);
}

function findNearestEdge(newPoint) {
    let bestDistSq = Infinity;
    let bestPolyIndex = -1;
    let bestEdgeIndex = -1;

    for (let pi = 0; pi < blueFence.length; pi++) {
        const poly = blueFence[pi];
        if (poly.length < 2) continue;
        for (let ei = 0; ei < poly.length; ei++) {
            const nextEi = (ei + 1) % poly.length;
            const distSq = pointToSegmentDistSq(newPoint, poly[ei], poly[nextEi]);
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestPolyIndex = pi;
                bestEdgeIndex = ei;
            }
        }
    }

    return { polyIndex: bestPolyIndex, edgeIndex: bestEdgeIndex, distSq: bestDistSq };
}

// 地图点击：查找最近边并插入蓝色点
function onMapClick(e) {
    if (isOnlyView) return;
    hideDeleteButton();
    const newPoint = [e.lnglat.lng, e.lnglat.lat];
    addBluePoint(newPoint);
}

// 添加蓝色编辑点
function addBluePoint(newPoint) {
    if (blueFence.length === 0) {
        blueFence.push([newPoint.slice()]);
        renderBlueGraphics();
        return;
    }

    const nearest = findNearestEdge(newPoint);

    if (nearest.polyIndex === -1) {
        let targetPoly = -1;
        for (let pi = 0; pi < blueFence.length; pi++) {
            if (blueFence[pi].length < 2) {
                targetPoly = pi;
                break;
            }
        }
        if (targetPoly === -1) {
            blueFence.push([newPoint.slice()]);
        } else {
            blueFence[targetPoly].push(newPoint.slice());
        }
        renderBlueGraphics();
        return;
    }

    blueFence[nearest.polyIndex].splice(nearest.edgeIndex + 1, 0, newPoint.slice());
    renderBlueGraphics();
}

function removeBluePoint(polyIndex, pointIndex) {
    if (polyIndex < 0 || polyIndex >= blueFence.length) return;
    const poly = blueFence[polyIndex];
    if (pointIndex < 0 || pointIndex >= poly.length) return;

    poly.splice(pointIndex, 1);
    hideDeleteButton();
    renderBlueGraphics();
}

function removeBluePolygon(polyIndex) {
    if (polyIndex < 0 || polyIndex >= blueFence.length) return;

    blueFence.splice(polyIndex, 1);
    hideDeleteButton();
    renderBlueGraphics();
}

// 渲染蓝色编辑图形
function renderBlueGraphics() {
    clearBlueMarkers();
    clearBlueLines();
    clearBluePolygons();

    if (blueFence.length === 0) return;

    blueFence.forEach((poly, polyIndex) => {
        poly.forEach((point, pointIndex) => {
            createBlueMarker(point, polyIndex, pointIndex);
        });

        if (poly.length === 2) {
            const line = new AMap.Polyline({
                path: poly,
                strokeColor: '#1890ff',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                zIndex: 50,
                clickable: false
            });
            map.add(line);
            bluePolylines.push(line);
        }

        if (poly.length > 2) {
            const polygon = new AMap.Polygon({
                path: poly,
                strokeColor: '#1890ff',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                fillColor: '#1890ff',
                fillOpacity: 0.15,
                zIndex: 50,
                clickable: false,
                bubble: true
            });
            map.add(polygon);
            bluePolygons.push(polygon);
        }
    });
}

function createBlueMarker(point, polyIndex, pointIndex) {
    const markerContent = document.createElement('div');
    markerContent.style.width = '22px';
    markerContent.style.height = '22px';
    markerContent.style.position = 'relative';
    markerContent.style.cursor = 'pointer';
    markerContent.innerHTML = `
        <div style="
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
            position: absolute;
            top: 3px;
            left: 3px;
            pointer-events: none;
        "></div>
    `;

    const marker = new AMap.Marker({
        position: point,
        content: markerContent,
        offset: new AMap.Pixel(-11, -11),
        zIndex: 100,
        clickable: true
    });

    marker.editPolyIndex = polyIndex;
    marker.editPointIndex = pointIndex;
    marker.editPoint = point.slice();

    markerContent.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showDeleteButton(marker, polyIndex, pointIndex, point);
    });

    marker.on('click', (e) => {
        if (e.domEvent) {
            e.domEvent.stopPropagation();
        }
        showDeleteButton(marker, polyIndex, pointIndex, point);
    });

    map.add(marker);
    blueMarkers.push(marker);
}

function getMapContainerOffset() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return { left: 0, top: 0 };
    const rect = mapContainer.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
}

function showDeleteButton(marker, polyIndex, pointIndex, point) {
    hideDeleteButton();

    blueActiveMarker = marker;

    const pixel = map.lngLatToContainer(point);
    const mapOffset = getMapContainerOffset();
    const baseLeft = mapOffset.left + pixel.getX() + 8;
    const baseTop = mapOffset.top + pixel.getY() - 16;

    const btnDeletePoint = document.createElement('div');
    btnDeletePoint.className = 'point-delete-btn';
    btnDeletePoint.textContent = '删除点';
    btnDeletePoint.style.left = baseLeft + 'px';
    btnDeletePoint.style.top = baseTop + 'px';
    btnDeletePoint.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeBluePoint(polyIndex, pointIndex);
    });

    const btnDeletePoly = document.createElement('div');
    btnDeletePoly.className = 'point-delete-btn point-delete-poly-btn';
    btnDeletePoly.textContent = '删除整块';
    btnDeletePoly.style.left = baseLeft + 'px';
    btnDeletePoly.style.top = (baseTop + 28) + 'px';
    btnDeletePoly.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeBluePolygon(polyIndex);
    });

    document.body.appendChild(btnDeletePoint);
    document.body.appendChild(btnDeletePoly);
    blueDeleteBtns = [btnDeletePoint, btnDeletePoly];
}

function hideDeleteButton() {
    blueDeleteBtns.forEach(btn => {
        if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    });
    blueDeleteBtns = [];
    blueActiveMarker = null;
}

function clearBlueMarkers() {
    if (blueMarkers.length > 0) {
        map.remove(blueMarkers);
        blueMarkers = [];
    }
}

function clearBlueLines() {
    if (bluePolylines.length > 0) {
        map.remove(bluePolylines);
        bluePolylines = [];
    }
}

function clearBluePolygons() {
    if (bluePolygons.length > 0) {
        map.remove(bluePolygons);
        bluePolygons = [];
    }
}

function clearBlueGraphics() {
    clearBlueMarkers();
    clearBlueLines();
    clearBluePolygons();
    hideDeleteButton();
}

function hasValidBlueFence() {
    if (blueFence.length === 0) return false;
    for (let i = 0; i < blueFence.length; i++) {
        if (blueFence[i].length >= 3) {
            return true;
        }
    }
    return false;
}

function getValidBluePaths() {
    const validPaths = [];
    for (let i = 0; i < blueFence.length; i++) {
        if (blueFence[i].length >= 3) {
            validPaths.push(blueFence[i].map(p => [p[0], p[1]]));
        }
    }
    return validPaths;
}

// 渲染绿色已确认围栏
function renderGreenFence() {
    clearGreenRender();
    
    if (greenFence.length === 0) return;

    greenFence.forEach(polygon => {
        if (polygon.length === 0 || polygon[0].length < 3) return;
        
        const p = new AMap.Polygon({
            path: polygon,
            strokeColor: '#10b981',
            strokeWeight: 3,
            strokeOpacity: 0.8,
            fillColor: '#10b981',
            fillOpacity: 0.15,
            zIndex: 10,
            clickable: false,
            bubble: true
        });
        map.add(p);
        greenPolygons.push(p);
    });
}

function clearGreenRender() {
    if (greenPolygons.length > 0) {
        map.remove(greenPolygons);
        greenPolygons = [];
    }
}

// 添加围栏：蓝色并集到绿色
function onAddFence() {
    if (!hasValidBlueFence()) {
        showToast('请先划定蓝色围栏', { type: 'error', closable: true });
        return;
    }
    
    const bluePaths = getValidBluePaths();
    const blueAsGreen = blueToGreenFormat(bluePaths);
    
    if (greenFence.length === 0) {
        greenFence = blueAsGreen;
    } else {
        greenFence = fenceBooleanOp(greenFence, blueAsGreen, ClipperLib.ClipType.ctUnion);
    }
    
    renderGreenFence();
    
    blueFence = [];
    clearBlueGraphics();
    
    showToast('已将蓝色围栏加入绿色围栏', { type: 'success', closable: true });
}

// 移除围栏：绿色差集蓝色
function onRemoveFence() {
    if (!hasValidBlueFence()) {
        showToast('请先划定蓝色围栏', { type: 'error', closable: true });
        return;
    }
    
    if (greenFence.length === 0) {
        showToast('暂无绿色围栏可删除', { type: 'warning', closable: true });
        return;
    }
    
    const bluePaths = getValidBluePaths();
    const blueAsGreen = blueToGreenFormat(bluePaths);
    
    greenFence = fenceBooleanOp(greenFence, blueAsGreen, ClipperLib.ClipType.ctDifference);
    
    renderGreenFence();
    
    blueFence = [];
    clearBlueGraphics();
    
    showToast('已删除与蓝色围栏交集部分', { type: 'success', closable: true });
}

// 清除所有绿色围栏
function onClearAllGreenFence() {
    if (greenFence.length === 0) {
        showToast('暂无绿色围栏可清除', { type: 'warning', closable: true });
        return;
    }
    
    greenFence = [];
    clearGreenRender();
    
    showToast('已清除所有绿色围栏', { type: 'success', closable: true });
}

// 提交围栏数据
function onSubmit() {
    if (greenFence.length === 0) {
        showToast('请先创建绿色围栏', { type: 'error', closable: true });
        return;
    }

    if (isEditMode) {
        document.getElementById('confirmModal').classList.add('show');
    } else {
        document.getElementById('areaNameInput').value = '';
        document.getElementById('submitModal').classList.add('show');
        document.getElementById('areaNameInput').focus();
    }
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

function buildFencePayload(areaNameVal) {
    return {
        area_name: areaNameVal,
        area_fence: greenFence.map(polygon =>
            polygon.map(ring =>
                ring.map(point => [parseFloat(point[0].toFixed(6)), parseFloat(point[1].toFixed(6))])
            )
        )
    };
}

async function submitToBackend(payload) {
    safeShowLoading();
    try {
        if (isEditMode) {
            payload.area_id = areaId;
            await Auth.fetchApi(BUSINESS_AREA_API_BASE, 'update', payload);
        } else {
            await Auth.fetchApi(BUSINESS_AREA_API_BASE, 'create', payload);
        }
        safeHideLoading();
        showToast(isEditMode ? '修改成功' : '创建成功', { type: 'success', closable: true });
        setTimeout(() => {
            window.parent.postMessage({ type: 'fenceSaved' }, '*');
        }, 800);
    } catch (error) {
        safeHideLoading();
        showToast('提交失败: ' + error.message, { type: 'error', closable: true });
    }
}

// 确认创建区域
async function onConfirmCreate() {
    const nameVal = document.getElementById('areaNameInput').value.trim();

    if (!nameVal) {
        showToast('请输入区域名称', { type: 'error', closable: true });
        document.getElementById('areaNameInput').focus();
        return;
    }

    const payload = buildFencePayload(nameVal);
    closeSubmitModal();
    await submitToBackend(payload);
}

// 确认编辑区域
async function onConfirmEdit() {
    closeConfirmModal();
    const payload = buildFencePayload(areaName);
    await submitToBackend(payload);
}

function cancelEdit() {
    window.parent.postMessage({ type: 'fenceCancel' }, '*');
}
