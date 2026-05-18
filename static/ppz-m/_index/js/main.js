import { SessionData } from '/static/_common/session-data.js';
import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { renderTabNav, checkIsDriver } from '/static/ppz-m/_common/tab-nav.js';
import { parseGaodeData } from '/static/ppz-m/_index/js/gaode-map.js';

let selectedStart = null;
let selectedDest = null;
let currentStep = 1;
let pickerMode = 'start';
let pickerData = null;
let currentLocation = null;
let searchDebounceTimer = null;
let searchResults = [];

let timeType = 1;
let selectedDate = null;
let selectedHour = null;
let selectedMinute = null;
let timeFlex = 30;

let passengerCount = 0;
let isCharter = false;
let currentOrderId = null;
let matchingPollTimer = null;

var dateList = [];
var hourList = [];
var minuteList = [];

// 初始化页面
async function initPage() {
    const data = await SessionData.fetch(['ppz_user']);
    renderTabNav('ride', checkIsDriver(data.ppz_user));

    generateDateList();

    document.getElementById('startText').addEventListener('click', function() {
        openAddressPicker('start');
    });
    document.getElementById('destText').addEventListener('click', function() {
        openAddressPicker('dest');
    });
    document.getElementById('btnNext').addEventListener('click', function() {
        goToStep(2);
    });
    document.getElementById('btnNext2').addEventListener('click', function() {
        goToStep(3);
    });
    document.getElementById('btnPrev2').addEventListener('click', function() {
        goToStep(1);
    });
    document.getElementById('btnPrev3').addEventListener('click', function() {
        goToStep(2);
    });
    document.getElementById('btnSubmit').addEventListener('click', function() {
        submitOrder();
    });

    document.getElementById('addressPickerOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeAddressPicker();
    });
    document.getElementById('mapSelectBtn').addEventListener('click', function() {
        openMapPicker();
    });

    var searchInput = document.getElementById('addressSearchInput');
    var searchClearBtn = document.getElementById('searchClearBtn');

    searchInput.addEventListener('input', function(e) {
        var value = e.target.value.trim();
        searchClearBtn.classList.toggle('hidden', !value);

        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }

        if (value.length > 0) {
            searchDebounceTimer = setTimeout(function() {
                searchAddress(value);
            }, 300);
        } else {
            renderPickerList();
        }
    });

    searchClearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchClearBtn.classList.add('hidden');
        searchResults = [];
        renderPickerList();
        searchInput.focus();
    });

    window.addEventListener('message', handleMapPickerMessage);
    window.addEventListener('pageshow', handlePageShow);

    document.getElementById('timeTypeRow').addEventListener('click', openTimeTypePicker);
    document.getElementById('timeRow').addEventListener('click', openTimePicker);
    document.getElementById('timeFlexRow').addEventListener('click', openTimeFlexPicker);

    document.getElementById('timePickerOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeTimePicker();
    });
    document.getElementById('timePickerConfirm').addEventListener('click', confirmTimePicker);

    document.getElementById('timeTypeOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeTimeTypePicker();
    });
    initTimeTypeOptions();

    document.getElementById('timeFlexOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeTimeFlexPicker();
    });
    initTimeFlexOptions();

    document.getElementById('charterRow').addEventListener('click', toggleCharter);

    initPassengerOptions();

    document.getElementById('matchingList').addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-cancel');
        if (btn) {
            var orderId = parseInt(btn.dataset.orderId);
            if (orderId) cancelOrder(orderId);
        }
    });

    tryGetCurrentLocation();

    loadHomePage();
}

// 生成可选日期列表
function generateDateList() {
    dateList = [];
    var now = new Date();
    var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (var i = 0; i < 7; i++) {
        var d = new Date(now);
        d.setDate(d.getDate() + i);

        var label = '';
        if (i === 0) label = '今天';
        else if (i === 1) label = '明天';
        else if (i === 2) label = '后天';
        else label = weekDays[d.getDay()];

        dateList.push({
            label: label,
            date: d.getFullYear() + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate()),
            month: (d.getMonth() + 1),
            day: d.getDate()
        });
    }
}

function padZero(n) {
    return n < 10 ? '0' + n : '' + n;
}

// 切换步骤
function goToStep(step) {
    if (step === currentStep) return;

    var oldStep = document.getElementById('step' + currentStep);
    var newStep = document.getElementById('step' + step);
    var goingForward = step > currentStep;

    var outClass = goingForward ? 'slide-out-left' : 'slide-out-right';
    var inFromClass = goingForward ? 'slide-in-from-right' : 'slide-in-from-left';

    newStep.classList.remove('hidden');
    newStep.classList.add(inFromClass);

    newStep.offsetHeight;

    requestAnimationFrame(function() {
        oldStep.classList.add(outClass);
        newStep.classList.remove(inFromClass);
        newStep.classList.add('slide-in-active');
    });

    setTimeout(function() {
        oldStep.classList.remove('slide-out-left', 'slide-out-right');
        oldStep.classList.add('hidden');
        newStep.classList.remove('slide-in-from-right', 'slide-in-from-left', 'slide-in-active');
    }, 360);

    currentStep = step;
}

// 页面恢复可见时刷新状态
function handlePageShow() {
    var pendingKey = 'ppz_pending_address';
    var pending = localStorage.getItem(pendingKey);
    if (!pending) return;

    localStorage.removeItem(pendingKey);

    try {
        var data = JSON.parse(pending);
        var gaodeInfo = parseGaodeData(data.gaode_data);
        var selected = {
            name: gaodeInfo.name || '',
            gaode_data: data.gaode_data
        };

        if (data.picker_mode === 'start') {
            selectedStart = selected;
        } else {
            selectedDest = selected;
        }

        updateCard();
    } catch (e) {
        console.error('解析待选地址失败:', e);
    }
}

// 尝试获取当前位置
function tryGetCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function(pos) {
        currentLocation = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude
        };
    }, function() {
        currentLocation = null;
    }, { enableHighAccuracy: true, timeout: 5000 });
}

function updateCard() {
    var startText = document.getElementById('startText');
    var destText = document.getElementById('destText');
    var btnNext = document.getElementById('btnNext');

    if (selectedStart) {
        startText.textContent = selectedStart.name || '出发地';
        startText.classList.add('selected');
    } else {
        startText.textContent = '从哪出发？';
        startText.classList.remove('selected');
    }

    if (selectedDest) {
        destText.textContent = selectedDest.name || '目的地';
        destText.classList.add('selected');
    } else {
        destText.textContent = '要去哪？';
        destText.classList.remove('selected');
    }

    if (selectedStart && selectedDest) {
        btnNext.disabled = false;
    } else {
        btnNext.disabled = true;
    }
}

async function openAddressPicker(mode) {
    pickerMode = mode;

    var title = document.getElementById('addressPickerTitle');
    title.textContent = mode === 'start' ? '选择出发地' : '选择目的地';

    var searchInput = document.getElementById('addressSearchInput');
    searchInput.value = '';
    document.getElementById('searchClearBtn').classList.add('hidden');
    searchResults = [];

    document.getElementById('addressPickerOverlay').classList.add('show');

    if (!pickerData) {
        await loadPickerData();
    } else {
        renderPickerList();
    }
}

function closeAddressPicker() {
    document.getElementById('addressPickerOverlay').classList.remove('show');
}

async function loadPickerData() {
    showLoading();
    try {
        var result = await Auth.fetchApi('/ppz', 'getAddressPickerData', {});
        pickerData = result.data;
        renderPickerList();
    } catch (error) {
        console.error('获取地址数据失败:', error);
        showToast('获取地址数据失败', { type: 'error' });
    } finally {
        hideLoading();
    }
}

function renderPickerList() {
    var listEl = document.getElementById('addressPickerList');

    if (searchResults.length > 0) {
        renderSearchResults(listEl);
        return;
    }

    if (!pickerData) {
        listEl.innerHTML = '<div class="address-item-empty">加载中...</div>';
        return;
    }

    var html = '';

    if (pickerMode === 'start') {
        html += renderMyLocation();
    }

    var recentList = pickerMode === 'start' ? pickerData.recent_start : pickerData.recent_dest;
    if (recentList && recentList.length > 0) {
        html += '<div class="address-section-title">最近使用</div>';
        recentList.forEach(function(item, index) {
            var gaodeInfo = parseGaodeData(item.gaode_data);
            var name = gaodeInfo.name || '未知地点';
            var detail = gaodeInfo.address || '';
            var distance = calcDistance(gaodeInfo);
            html += renderAddressItem('📍', name, detail, distance, 'recent_' + index, item);
        });
    }

    if (pickerData.saved_list && pickerData.saved_list.length > 0) {
        html += '<div class="address-section-title">常用地址</div>';
        pickerData.saved_list.forEach(function(item, index) {
            var gaodeInfo = parseGaodeData(item.gaode_data);
            var name = item.remark || gaodeInfo.name || '未命名地址';
            var detail = gaodeInfo.address || '';
            var distance = calcDistance(gaodeInfo);
            html += renderAddressItem('📍', name, detail, distance, 'saved_' + index, item);
        });
    }

    if (!recentList?.length && !pickerData.saved_list?.length && pickerMode !== 'start') {
        html += '<div class="address-item-empty">暂无地址，请搜索或从地图选择</div>';
    }

    listEl.innerHTML = html;
    bindAddressItemEvents();
}

function renderMyLocation() {
    if (!currentLocation) return '';
    var distance = formatDistance(0);
    return renderAddressItem('📍', '我的当前位置', '', distance, 'my_location', null);
}

function renderAddressItem(icon, name, detail, distance, id, data) {
    var dataAttr = data ? ' data-has-data="true"' : '';
    return '<div class="address-item" data-id="' + id + '"' + dataAttr + '>' +
        '<span class="address-item-icon">' + icon + '</span>' +
        '<div class="address-item-content">' +
            '<div class="address-item-name">' + escapeHtml(name) + '</div>' +
            (detail ? '<div class="address-item-detail">' + escapeHtml(detail) + '</div>' : '') +
        '</div>' +
        (distance ? '<span class="address-item-distance">' + distance + '</span>' : '') +
    '</div>';
}

function bindAddressItemEvents() {
    var items = document.querySelectorAll('.address-item');
    items.forEach(function(item) {
        item.addEventListener('click', function() {
            var id = this.dataset.id;
            onAddressItemSelect(id);
        });
    });
}

function onAddressItemSelect(id) {
    if (id === 'my_location') {
        selectMyLocation();
        return;
    }

    var data = null;
    if (id.startsWith('recent_')) {
        var recentList = pickerMode === 'start' ? pickerData.recent_start : pickerData.recent_dest;
        var index = parseInt(id.replace('recent_', ''));
        data = recentList[index];
    } else if (id.startsWith('saved_')) {
        var index = parseInt(id.replace('saved_', ''));
        data = pickerData.saved_list[index];
    } else if (id.startsWith('search_')) {
        var index = parseInt(id.replace('search_', ''));
        data = searchResults[index];
    }

    if (!data) return;

    var gaodeInfo = parseGaodeData(data.gaode_data);
    var selected = {
        name: gaodeInfo.name || '',
        gaode_data: data.gaode_data
    };

    if (pickerMode === 'start') {
        selectedStart = selected;
    } else {
        selectedDest = selected;
    }

    closeAddressPicker();
    updateCard();
}

// 选择当前位置
async function selectMyLocation() {
    if (!currentLocation) {
        showToast('无法获取当前位置', { type: 'error' });
        return;
    }

    closeAddressPicker();
    showLoading();

    var gaodeData = {
        formatted_address: '',
        lng: currentLocation.lng,
        lat: currentLocation.lat,
        province: '',
        city: '',
        district: '',
        township: '',
        adcode: '',
        aoi_name: ''
    };

    try {
        var result = await Auth.fetchApi('/gaode', 'gaodeProxy', {
            api: 'regeo',
            query: {
                location: currentLocation.lng + ',' + currentLocation.lat,
                extensions: 'base'
            }
        });

        var data = result.data;
        if (data && data.status === '1' && data.regeocode) {
            var regeo = data.regeocode;
            var addrComp = regeo.addressComponent || {};
            gaodeData.formatted_address = regeo.formatted_address || '';
            gaodeData.province = addrComp.province || '';
            gaodeData.city = (typeof addrComp.city === 'string' ? addrComp.city : '') || addrComp.province || '';
            gaodeData.district = addrComp.district || '';
            gaodeData.township = addrComp.township || '';
            gaodeData.adcode = addrComp.adcode || '';
            gaodeData.aoi_name = addrComp.township || addrComp.district || '';
        }
    } catch (error) {
        console.warn('逆地理编码失败，使用经纬度:', error);
    }

    selectedStart = {
        name: gaodeData.aoi_name || '我的当前位置',
        gaode_data: gaodeData
    };

    hideLoading();
    updateCard();
}

// 搜索地址
async function searchAddress(keyword) {
    if (!keyword) return;

    try {
        var query = {
            keywords: keyword,
            offset: '20',
            page: '1'
        };

        if (currentLocation) {
            query.location = currentLocation.lng + ',' + currentLocation.lat;
            query.sortrule = 'distance';
        }

        var result = await Auth.fetchApi('/gaode', 'gaodeProxy', {
            api: 'searchPoi',
            query: query
        });

        var data = result.data;
        if (data && data.status === '1' && data.pois) {
            searchResults = data.pois.map(function(poi) {
                var loc = poi.location ? poi.location.split(',') : [];
                return {
                    gaode_data: {
                        formatted_address: (poi.pname || '') + (poi.cityname || '') + (poi.adname || '') + (poi.address || ''),
                        lng: loc.length === 2 ? parseFloat(loc[0]) : 0,
                        lat: loc.length === 2 ? parseFloat(loc[1]) : 0,
                        province: poi.pname || '',
                        city: poi.cityname || '',
                        district: poi.adname || '',
                        township: '',
                        adcode: poi.adcode || '',
                        aoi_name: poi.name || ''
                    }
                };
            });
            renderSearchResults(document.getElementById('addressPickerList'));
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showToast('搜索失败', { type: 'error' });
    }
}

function renderSearchResults(listEl) {
    if (searchResults.length === 0) {
        listEl.innerHTML = '<div class="address-item-empty">未找到相关地址</div>';
        return;
    }

    var html = '<div class="address-section-title">搜索结果 (' + searchResults.length + ')</div>';
    searchResults.forEach(function(item, index) {
        var gaodeInfo = parseGaodeData(item.gaode_data);
        var name = gaodeInfo.name || '未知地点';
        var detail = gaodeInfo.address || '';
        var distance = calcDistance(gaodeInfo);
        html += renderAddressItem('📍', name, detail, distance, 'search_' + index, item);
    });

    listEl.innerHTML = html;
    bindAddressItemEvents();
}

// 打开地图选点
function openMapPicker() {
    closeAddressPicker();

    setTimeout(function() {
        window.location.href = '/static/ppz-m/address-map/index.html?picker_mode=' + pickerMode;
    }, 300);
}

// 处理地图选点消息
function handleMapPickerMessage(event) {
    if (event.data.type === 'addressSelected') {
        var result = event.data.data;
        var gaodeInfo = parseGaodeData(result.gaode_data);
        var selected = {
            name: gaodeInfo.name || '',
            gaode_data: result.gaode_data
        };

        if (pickerMode === 'start') {
            selectedStart = selected;
        } else {
            selectedDest = selected;
        }

        updateCard();
    }
}

function calcDistance(gaodeInfo) {
    if (!currentLocation || !gaodeInfo || !gaodeInfo.location) return '';
    var lng = gaodeInfo.location.lng;
    var lat = gaodeInfo.location.lat;
    var d = getDistance(currentLocation.lat, currentLocation.lng, lat, lng);
    return formatDistance(d);
}

function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(meters) {
    if (meters < 1000) {
        return Math.round(meters) + 'm';
    }
    return (meters / 1000).toFixed(1) + 'km';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 打开出发时间类型选择
function openTimeTypePicker() {
    document.getElementById('timeTypeOverlay').classList.add('show');
}

function closeTimeTypePicker() {
    document.getElementById('timeTypeOverlay').classList.remove('show');
}

// 初始化时间类型选项
function initTimeTypeOptions() {
    var options = document.querySelectorAll('#timeTypeOptions .picker-option');
    options.forEach(function(opt) {
        opt.addEventListener('click', function() {
            options.forEach(function(o) { o.classList.remove('selected'); });
            this.classList.add('selected');

            timeType = parseInt(this.dataset.value);
            updateTimeTypeDisplay();
            closeTimeTypePicker();
        });
    });
}

// 更新时间类型显示
function updateTimeTypeDisplay() {
    var label = document.getElementById('timeTypeLabel');
    var timeText = document.getElementById('timeText');
    var timeFlexText = document.getElementById('timeFlexText');
    var timePickerTitle = document.getElementById('timePickerTitle');

    if (timeType === 1) {
        label.textContent = '按时出发';
        timePickerTitle.textContent = '选择出发时间';
        timeFlexText.textContent = '最多等' + formatFlex(timeFlex);
    } else {
        label.textContent = '按时到达';
        timePickerTitle.textContent = '选择到达时间';
        timeFlexText.textContent = '可提前' + formatFlex(timeFlex);
    }

    if (selectedDate && selectedHour !== null) {
        timeText.textContent = dateList[selectedDate].label + ' ' + padZero(selectedHour) + ':' + padZero(selectedMinute);
        timeText.classList.add('selected');
    }
}

// 打开时间选择器
function openTimePicker() {
    buildTimeWheels();
    document.getElementById('timePickerOverlay').classList.add('show');

    setTimeout(function() {
        scrollToSelected();
    }, 50);
}

function closeTimePicker() {
    document.getElementById('timePickerOverlay').classList.remove('show');
}

// 构建时间滚轮
function buildTimeWheels() {
    var wheelDate = document.getElementById('wheelDate');
    var wheelHour = document.getElementById('wheelHour');
    var wheelMinute = document.getElementById('wheelMinute');

    var dateHtml = '';
    dateList.forEach(function(item, i) {
        dateHtml += '<div class="picker-wheel-item" data-index="' + i + '">' + item.label + '</div>';
    });
    wheelDate.innerHTML = dateHtml;

    var hourHtml = '';
    for (var h = 0; h < 24; h++) {
        hourHtml += '<div class="picker-wheel-item" data-index="' + h + '">' + padZero(h) + '</div>';
    }
    wheelHour.innerHTML = hourHtml;

    var minuteHtml = '';
    for (var m = 0; m < 60; m++) {
        minuteHtml += '<div class="picker-wheel-item" data-index="' + m + '">' + padZero(m) + '</div>';
    }
    wheelMinute.innerHTML = minuteHtml;

    setupWheelScroll(wheelDate);
    setupWheelScroll(wheelHour);
    setupWheelScroll(wheelMinute);
}

function setupWheelScroll(wheel) {
    var itemHeight = 44;
    var visibleItems = 5;
    var paddingTop = (visibleItems - 1) / 2 * itemHeight;

    wheel.style.paddingTop = paddingTop + 'px';
    wheel.style.paddingBottom = paddingTop + 'px';

    wheel.addEventListener('scroll', function() {
        var scrollTop = wheel.scrollTop;
        var centerIndex = Math.round(scrollTop / itemHeight);
        var items = wheel.querySelectorAll('.picker-wheel-item');
        items.forEach(function(item, i) {
            item.classList.toggle('center', i === centerIndex);
        });
    });

    wheel.addEventListener('scrollend', function() {
        snapWheel(wheel);
    });

    wheel.addEventListener('click', function(e) {
        var item = e.target.closest('.picker-wheel-item');
        if (!item) return;
        var index = parseInt(item.dataset.index);
        if (isNaN(index)) return;
        wheel.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
        var items = wheel.querySelectorAll('.picker-wheel-item');
        items.forEach(function(el, i) {
            el.classList.toggle('center', i === index);
        });
    });
}

function snapWheel(wheel) {
    var itemHeight = 44;
    var scrollTop = wheel.scrollTop;
    var targetIndex = Math.round(scrollTop / itemHeight);
    var targetScroll = targetIndex * itemHeight;

    if (Math.abs(scrollTop - targetScroll) > 1) {
        wheel.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }

    var items = wheel.querySelectorAll('.picker-wheel-item');
    items.forEach(function(item, i) {
        item.classList.toggle('center', i === targetIndex);
    });
}

function scrollToSelected() {
    var itemHeight = 44;

    var dateIdx = selectedDate !== null ? selectedDate : 0;
    var hourIdx = selectedHour !== null ? selectedHour : new Date().getHours();
    var minuteIdx = selectedMinute !== null ? selectedMinute : 0;

    document.getElementById('wheelDate').scrollTop = dateIdx * itemHeight;
    document.getElementById('wheelHour').scrollTop = hourIdx * itemHeight;
    document.getElementById('wheelMinute').scrollTop = minuteIdx * itemHeight;

    highlightCenter('wheelDate', dateIdx);
    highlightCenter('wheelHour', hourIdx);
    highlightCenter('wheelMinute', minuteIdx);
}

function highlightCenter(wheelId, centerIndex) {
    var items = document.getElementById(wheelId).querySelectorAll('.picker-wheel-item');
    items.forEach(function(item, i) {
        item.classList.toggle('center', i === centerIndex);
    });
}

// 确认时间选择
function confirmTimePicker() {
    var itemHeight = 44;

    var wheelDate = document.getElementById('wheelDate');
    var wheelHour = document.getElementById('wheelHour');
    var wheelMinute = document.getElementById('wheelMinute');

    selectedDate = Math.round(wheelDate.scrollTop / itemHeight);
    selectedHour = Math.round(wheelHour.scrollTop / itemHeight);
    selectedMinute = Math.round(wheelMinute.scrollTop / itemHeight);

    if (selectedDate < 0) selectedDate = 0;
    if (selectedDate >= dateList.length) selectedDate = dateList.length - 1;
    if (selectedHour < 0) selectedHour = 0;
    if (selectedHour > 23) selectedHour = 23;
    if (selectedMinute < 0) selectedMinute = 0;
    if (selectedMinute > 59) selectedMinute = 59;

    var timeText = document.getElementById('timeText');
    timeText.textContent = dateList[selectedDate].label + ' ' + padZero(selectedHour) + ':' + padZero(selectedMinute);
    timeText.classList.add('selected');

    updateStep2Button();
    closeTimePicker();
}

// 打开弹性时间选择
function openTimeFlexPicker() {
    var title = document.getElementById('timeFlexTitle');
    title.textContent = timeType === 1 ? '最多等多久' : '最多提前多久';

    var options = document.querySelectorAll('#timeFlexOptions .picker-option');
    options.forEach(function(opt) {
        opt.classList.toggle('selected', parseInt(opt.dataset.value) === timeFlex);
    });

    document.getElementById('timeFlexOverlay').classList.add('show');
}

function closeTimeFlexPicker() {
    document.getElementById('timeFlexOverlay').classList.remove('show');
}

function initTimeFlexOptions() {
    var options = document.querySelectorAll('#timeFlexOptions .picker-option');
    options.forEach(function(opt) {
        opt.addEventListener('click', function() {
            options.forEach(function(o) { o.classList.remove('selected'); });
            this.classList.add('selected');

            timeFlex = parseInt(this.dataset.value);
            updateTimeTypeDisplay();
            closeTimeFlexPicker();
        });
    });
}

// 格式化弹性时间
function formatFlex(minutes) {
    if (minutes < 60) return minutes + '分钟';
    if (minutes % 60 === 0) return (minutes / 60) + '小时';
    return Math.floor(minutes / 60) + '小时' + (minutes % 60) + '分钟';
}

function updateStep2Button() {
    var btnNext2 = document.getElementById('btnNext2');
    btnNext2.disabled = !(selectedDate !== null && selectedHour !== null && selectedMinute !== null);
}

function initPassengerOptions() {
    var options = document.querySelectorAll('.passenger-option');
    options.forEach(function(opt) {
        opt.addEventListener('click', function() {
            options.forEach(function(o) { o.classList.remove('selected'); });
            this.classList.add('selected');

            passengerCount = parseInt(this.dataset.count);
            updateSubmitButton();
        });
    });
}

// 切换包车模式
function toggleCharter() {
    isCharter = !isCharter;
    var checkbox = document.getElementById('charterCheckbox');
    checkbox.classList.toggle('checked', isCharter);
}

function updateSubmitButton() {
    var btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = passengerCount === 0;
}

// 提交订单
async function submitOrder() {
    if (!selectedStart || !selectedDest) {
        showToast('请先选择出发地和目的地', { type: 'error' });
        return;
    }

    if (selectedDate === null || selectedHour === null || selectedMinute === null) {
        showToast('请选择出发时间', { type: 'error' });
        return;
    }

    if (passengerCount === 0) {
        showToast('请选择乘车人数', { type: 'error' });
        return;
    }

    showLoading();
    try {
        var orderData = {
            start_gaode_data: JSON.stringify(selectedStart.gaode_data),
            dest_gaode_data: JSON.stringify(selectedDest.gaode_data),
            depart_time: dateList[selectedDate].date + ' ' + padZero(selectedHour) + ':' + padZero(selectedMinute),
            time_type: timeType,
            time_flex: timeFlex,
            passenger_count: passengerCount,
            is_charter: isCharter ? 1 : 0
        };

        var result = await Auth.fetchApi('/ppz', 'createOrder', orderData);

        if (result.code === 0) {
            currentOrderId = result.data.order_id;
            showMatchingStatus();
            resetFormFields();
        } else {
            showToast(result.msg || '提交失败', { type: 'error' });
        }
    } catch (error) {
        console.error('提交订单失败:', error);
        showToast('提交失败，请重试', { type: 'error' });
    } finally {
        hideLoading();
    }
}

// 加载首页数据
async function loadHomePage() {
    await Promise.all([loadMatchingOrders(), loadMyTrips()]);
}

// 加载匹配中的订单
async function loadMatchingOrders() {
    try {
        var result = await Auth.fetchApi('/ppz', 'getMatchingOrders', {});
        if (result.code === 0) {
            renderMatchingOrders(result.data.list || []);
        }
    } catch (error) {
        console.error('获取匹配中订单失败:', error);
    }
}

// 加载我的行程
async function loadMyTrips() {
    try {
        var result = await Auth.fetchApi('/ppz', 'getMyTrips', {});
        if (result.code === 0) {
            renderMyTrips(result.data.list || []);
        }
    } catch (error) {
        console.error('获取行程列表失败:', error);
    }
}

// 格式化订单时间显示
function formatOrderTime(order) {
    var time = order.depart_time || '';
    var parts = time.split(' ');
    var datePart = parts[0] || '';
    var timePart = parts[1] || time;

    var monthDay = '';
    if (datePart) {
        var dp = datePart.split('-');
        if (dp.length === 3) {
            monthDay = parseInt(dp[1]) + '月' + parseInt(dp[2]) + '日 ';
        }
    }

    var typeStr = order.time_type === 2 ? '到达' : '出发';
    var flexStr = '';
    if (order.time_flex > 0) {
        if (order.time_type === 2) {
            flexStr = ' 可提前' + formatFlex(order.time_flex);
        } else {
            flexStr = ' 最多等' + formatFlex(order.time_flex);
        }
    }
    return monthDay + timePart + typeStr + flexStr;
}

// 渲染匹配中的订单
function renderMatchingOrders(list) {
    var section = document.getElementById('matchingSection');
    var container = document.getElementById('matchingList');

    if (list.length === 0) {
        section.classList.add('hidden');
        stopMatchingPoll();
        return;
    }

    section.classList.remove('hidden');
    startMatchingPoll();

    var html = '';
    list.forEach(function(order) {
        var startName = order.start_gaode_data ? order.start_gaode_data.aoi_name : '出发地';
        var destName = order.dest_gaode_data ? order.dest_gaode_data.aoi_name : '目的地';
        var passengerStr = order.passenger_count + '人';
        if (order.is_charter) passengerStr += ' 包车';

        var timeStr = formatOrderTime(order);

        html += '<div class="order-card order-card-matching">' +
            '<div class="order-card-body">' +
                '<div class="status-route">' +
                    '<span class="status-route-icon">📍</span>' +
                    '<span class="status-route-text">' + escapeHtml(startName) + '</span>' +
                    '<span class="status-route-arrow">→</span>' +
                    '<span class="status-route-icon">🏁</span>' +
                    '<span class="status-route-text">' + escapeHtml(destName) + '</span>' +
                '</div>' +
                '<div class="status-info">' +
                    '<span class="status-info-icon">🕐</span>' +
                    '<span class="status-info-text">' + timeStr + '</span>' +
                    '<span class="status-info-sep">·</span>' +
                    '<span class="status-info-icon">👤</span>' +
                    '<span class="status-info-text">' + passengerStr + '</span>' +
                '</div>' +
                '<div class="status-progress">' +
                    '<span class="status-progress-icon">🔄</span>' +
                    '<span class="status-progress-text">正在匹配司机...</span>' +
                    '<button class="btn-cancel-inline" data-order-id="' + order.order_id + '">取消</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    });

    container.innerHTML = html;
}

// 渲染我的行程
function renderMyTrips(list) {
    var container = document.getElementById('tripList');

    if (list.length === 0) {
        container.innerHTML = '<div class="trip-empty">暂无行程，快去下单吧 🚗</div>';
        return;
    }

    var html = '';
    list.forEach(function(trip) {
        var statusText = '';
        if (trip.status === 1) statusText = '准备中';
        else if (trip.status === 2) statusText = '行程中';

        var ordersHtml = '';
        (trip.orders || []).forEach(function(order) {
            var startName = order.start_gaode_data ? order.start_gaode_data.aoi_name : '出发地';
            var destName = order.dest_gaode_data ? order.dest_gaode_data.aoi_name : '目的地';
            var passengerStr = order.passenger_count + '人';
            if (order.is_charter) passengerStr += ' 包车';

            ordersHtml += '<div class="trip-order-item">' +
                '<span class="status-route-icon">📍</span>' +
                '<span class="status-route-text">' + escapeHtml(startName) + '</span>' +
                '<span class="status-route-arrow">→</span>' +
                '<span class="status-route-icon">🏁</span>' +
                '<span class="status-route-text">' + escapeHtml(destName) + '</span>' +
                '<span class="status-info-sep">·</span>' +
                '<span class="status-info-text">' + passengerStr + '</span>' +
            '</div>';
        });

        html += '<div class="order-card trip-card">' +
            '<div class="order-card-body">' +
                '<div class="trip-status-bar">' +
                    '<span class="trip-status-text">' + statusText + '</span>' +
                '</div>' +
                ordersHtml +
            '</div>' +
        '</div>';
    });

    container.innerHTML = html;
}

// 开始轮询匹配中订单
function startMatchingPoll() {
    if (matchingPollTimer) return;
    matchingPollTimer = setInterval(loadMatchingOrders, 5000);
}

// 停止轮询
function stopMatchingPoll() {
    if (matchingPollTimer) {
        clearInterval(matchingPollTimer);
        matchingPollTimer = null;
    }
}

// 取消订单
async function cancelOrder(orderId) {
    showLoading();
    try {
        var result = await Auth.fetchApi('/ppz', 'cancelOrder', { order_id: orderId });
        if (result.code === 0) {
            showToast('已取消订单', { type: 'success' });
            loadMatchingOrders();
            loadMyTrips();
        } else {
            showToast(result.msg || '取消失败', { type: 'error' });
        }
    } catch (error) {
        console.error('取消订单失败:', error);
        showToast('取消失败，请重试', { type: 'error' });
    } finally {
        hideLoading();
    }
}

// 提交订单后刷新匹配列表和行程列表
function showMatchingStatus() {
    loadMatchingOrders();
    loadMyTrips();
}

// 重置表单字段
function resetFormFields() {
    selectedStart = null;
    selectedDest = null;
    selectedDate = null;
    selectedHour = null;
    selectedMinute = null;
    timeFlex = 30;
    timeType = 1;
    passengerCount = 0;
    isCharter = false;
    currentStep = 1;

    document.getElementById('step1').classList.remove('hidden', 'slide-out-left', 'slide-out-right', 'slide-in-from-right', 'slide-in-from-left', 'slide-in-active');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step2').classList.remove('slide-out-left', 'slide-out-right', 'slide-in-from-right', 'slide-in-from-left', 'slide-in-active');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step3').classList.remove('slide-out-left', 'slide-out-right', 'slide-in-from-right', 'slide-in-from-left', 'slide-in-active');

    updateCard();

    document.getElementById('timeTypeLabel').textContent = '按时出发';
    document.getElementById('timeText').textContent = '选择出发时间';
    document.getElementById('timeText').classList.remove('selected');
    document.getElementById('timeFlexText').textContent = '最多等30分钟';

    document.querySelectorAll('.passenger-option').forEach(function(o) { o.classList.remove('selected'); });
    document.getElementById('charterCheckbox').classList.remove('checked');

    document.getElementById('btnNext2').disabled = true;
    document.getElementById('btnSubmit').disabled = true;
}

document.addEventListener('DOMContentLoaded', initPage);
