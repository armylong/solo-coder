import { Auth } from '/static/_common/auth.js';

let config = null;
let scene, camera, renderer;
let nameSpheres = [];
let sphereGroup;
let stars = [];

let selectedPrize = null;
let selectedMode = null;
let selectedTime = 5;
let isLotteryRunning = false;
let usedParticipantIds = new Set();
let winners = [];

let currentRotationSpeed = 0.003;
const idleRotationSpeed = 0.003;
const maxRotationSpeed = 0.06;
const spinUpAcceleration = 0.0008;
const spinDownDeceleration = 0.0004;

let estimatedSpinUpTime = 0;
let estimatedSpinDownTime = 0;

const state = {
    idle: 'idle',
    spinningUp: 'spinningUp',
    spinning: 'spinning',
    spinningDown: 'spinningDown',
    stopped: 'stopped'
};
let currentState = state.idle;

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;

let audioContext = null;
let bgOscillator1 = null;
let bgOscillator2 = null;
let bgOscillator3 = null;
let bgGain1 = null;
let bgGain2 = null;
let bgGain3 = null;
let festiveOscillators = [];
let festiveGains = [];
let drumInterval = null;

let autoStopTimeout = null;

function getElements() {
    return {
        bannerTitle: document.getElementById('bannerTitle'),
        prizePanel: document.getElementById('prizePanel'),
        prizeList: document.getElementById('prizeList'),
        winnersList: document.getElementById('winnersList'),
        modeDropdown: document.getElementById('modeDropdown'),
        modeMenu: document.getElementById('modeMenu'),
        selectedModeSpan: document.getElementById('selectedMode'),
        autoTimeGroup: document.getElementById('autoTimeGroup'),
        timeDropdown: document.getElementById('timeDropdown'),
        timeMenu: document.getElementById('timeMenu'),
        selectedTimeSpan: document.getElementById('selectedTime'),
        actionBtn: document.getElementById('actionBtn'),
        btnText: document.getElementById('btnText'),
        timerDisplay: document.getElementById('timerDisplay'),
        timerValue: document.getElementById('timerValue'),
        winnerModal: document.getElementById('winnerModal'),
        modalPrize: document.getElementById('modalPrize'),
        modalName: document.getElementById('modalName'),
        modalPhone: document.getElementById('modalPhone'),
        closeModal: document.getElementById('closeModal')
    };
}

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        return config;
    } catch (error) {
        console.error('加载配置文件失败:', error);
        config = {
            bannerText: "2024年度公司年会抽奖盛典",
            prizes: [
                { id: "special", name: "特等奖", count: 1, description: "价值50000元豪华礼包" },
                { id: "first", name: "一等奖", count: 2, description: "价值10000元礼包" },
                { id: "second", name: "二等奖", count: 5, description: "价值5000元礼包" },
                { id: "third", name: "三等奖", count: 10, description: "价值2000元礼包" },
                { id: "fourth", name: "四等奖", count: 15, description: "价值1000元礼包" },
                { id: "fifth", name: "五等奖", count: 20, description: "价值500元礼包" },
                { id: "sixth", name: "六等奖", count: 25, description: "价值200元礼包" },
                { id: "happy", name: "欢乐奖", count: 22, description: "精美纪念品一份" }
            ],
            participants: Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                name: `测试人员${i + 1}`,
                phone: `138${String(10000000 + i).slice(-8)}`
            }))
        };
        return config;
    }
}

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (!bgOscillator1) {
        startBackgroundMusic();
    }
}

function startBackgroundMusic() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    bgOscillator1 = audioContext.createOscillator();
    bgGain1 = audioContext.createGain();
    bgOscillator1.type = 'sine';
    bgOscillator1.frequency.setValueAtTime(165, now);
    bgGain1.gain.setValueAtTime(0.02, now);
    bgOscillator1.connect(bgGain1);
    bgGain1.connect(audioContext.destination);
    bgOscillator1.start(now);
    
    bgOscillator2 = audioContext.createOscillator();
    bgGain2 = audioContext.createGain();
    bgOscillator2.type = 'triangle';
    bgOscillator2.frequency.setValueAtTime(220, now);
    bgGain2.gain.setValueAtTime(0.015, now);
    bgOscillator2.connect(bgGain2);
    bgGain2.connect(audioContext.destination);
    bgOscillator2.start(now);
    
    bgOscillator3 = audioContext.createOscillator();
    bgGain3 = audioContext.createGain();
    bgOscillator3.type = 'sine';
    bgOscillator3.frequency.setValueAtTime(277, now);
    bgGain3.gain.setValueAtTime(0.01, now);
    bgOscillator3.connect(bgGain3);
    bgGain3.connect(audioContext.destination);
    bgOscillator3.start(now);
    
    animateBackgroundMusic();
}

function animateBackgroundMusic() {
    if (!audioContext || !bgOscillator1) return;
    
    const now = audioContext.currentTime;
    const time = now % 2;
    
    const freq1 = 165 + Math.sin(time * Math.PI) * 10;
    const freq2 = 220 + Math.sin(time * Math.PI + 0.5) * 15;
    const freq3 = 277 + Math.sin(time * Math.PI + 1) * 12;
    
    bgOscillator1.frequency.setValueAtTime(freq1, now);
    if (bgOscillator2) bgOscillator2.frequency.setValueAtTime(freq2, now);
    if (bgOscillator3) bgOscillator3.frequency.setValueAtTime(freq3, now);
    
    requestAnimationFrame(animateBackgroundMusic);
}

function startFestiveMusic() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 880.00];
    const types = ['sine', 'triangle', 'square'];
    
    festiveOscillators = [];
    festiveGains = [];
    
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = types[i % types.length];
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.05, now + 0.1);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now);
        
        festiveOscillators.push(osc);
        festiveGains.push(gain);
    });
    
    startDrumBeat();
}

function startDrumBeat() {
    if (!audioContext) return;
    
    let beatIndex = 0;
    drumInterval = setInterval(() => {
        const now = audioContext.currentTime;
        
        if (beatIndex % 2 === 0) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }
        
        if (beatIndex % 4 === 2) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        
        beatIndex++;
    }, 250);
}

function updateFestiveVolume() {
    if (!audioContext || festiveGains.length === 0) return;
    
    const speedRatio = currentRotationSpeed / maxRotationSpeed;
    const volume = 0.03 + speedRatio * 0.12;
    const now = audioContext.currentTime;
    
    festiveGains.forEach((gain, i) => {
        const wobble = Math.sin(now * 8 + i * 0.5) * 0.3 + 0.7;
        gain.gain.setValueAtTime(Math.min(volume * wobble, 0.15), now);
    });
    
    if (festiveOscillators.length > 0) {
        const baseFreq = 523.25;
        const freqVariation = 50 * speedRatio;
        festiveOscillators.forEach((osc, i) => {
            const freq = baseFreq * Math.pow(2, i / 4) + Math.sin(now * 10 + i) * freqVariation;
            osc.frequency.setValueAtTime(freq, now);
        });
    }
}

function stopFestiveMusic() {
    if (drumInterval) {
        clearInterval(drumInterval);
        drumInterval = null;
    }
    
    festiveOscillators.forEach(osc => {
        try {
            osc.stop();
            osc.disconnect();
        } catch (e) {}
    });
    festiveOscillators = [];
    
    festiveGains.forEach(gain => {
        try {
            gain.disconnect();
        } catch (e) {}
    });
    festiveGains = [];
}

function playWinSound() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    
    arpeggio.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.6);
    });
    
    setTimeout(() => {
        const chordFreqs = [523.25, 659.25, 783.99];
        chordFreqs.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioContext.currentTime);
            gain.gain.setValueAtTime(0.15, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 1.6);
        });
    }, arpeggio.length * 120 + 200);
}

function calculateEstimatedTimes() {
    const speedDiff = maxRotationSpeed - idleRotationSpeed;
    estimatedSpinUpTime = speedDiff / spinUpAcceleration;
    
    const stopDiff = maxRotationSpeed - 0;
    estimatedSpinDownTime = stopDiff / spinDownDeceleration;
    
    console.log('加速时间:', estimatedSpinUpTime, '帧');
    console.log('减速时间:', estimatedSpinDownTime, '帧');
}

function init() {
    loadConfig().then(() => {
        initScene();
        initUI();
        initDropdowns();
        initEventListeners();
        calculateEstimatedTimes();
        animate();
    });
    
    document.addEventListener('click', initAudio, { once: true, passive: true });
}

function initScene() {
    const el = getElements();
    
    const canvas = document.getElementById('sphereCanvas');
    const container = canvas.parentElement;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 12;
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    
    createNameSpheres();
    createStarfield();
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffd700, 1, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);
    
    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.5, 100);
    pointLight2.position.set(-10, 5, 5);
    scene.add(pointLight2);
    
    window.addEventListener('resize', onWindowResize);
}

function createNameSpheres() {
    const participants = config.participants;
    const n = participants.length;
    const phi = Math.PI * (3 - Math.sqrt(5));
    
    nameSpheres = [];
    
    for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        
        const scale = 4.0;
        
        const nameGroup = new THREE.Group();
        nameGroup.position.set(x * scale, y * scale, z * scale);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        const participant = participants[i];
        
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 28px Microsoft YaHei, PingFang SC, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.5, '#ffec8b');
        gradient.addColorStop(1, '#daa520');
        
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        context.fillStyle = gradient;
        context.fillText(participant.name, canvas.width / 2, canvas.height / 2);
        
        context.shadowColor = 'rgba(255, 215, 0, 0.8)';
        context.shadowBlur = 8;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.fillStyle = gradient;
        context.fillText(participant.name, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.6, 0.45, 1);
        
        nameGroup.add(sprite);
        nameGroup.userData = { participant: participant, index: i };
        
        sphereGroup.add(nameGroup);
        nameSpheres.push(nameGroup);
    }
}

function createStarfield() {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
        const radius = 80 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        const colorChoice = Math.random();
        if (colorChoice < 0.5) {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.9;
            colors[i * 3 + 2] = 0.6;
        } else if (colorChoice < 0.75) {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.7;
            colors[i * 3 + 2] = 0.7;
        } else {
            colors[i * 3] = 0.7;
            colors[i * 3 + 1] = 0.8;
            colors[i * 3 + 2] = 1;
        }
        
        sizes[i] = 0.3 + Math.random() * 0.7;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });
    
    const starfield = new THREE.Points(geometry, material);
    scene.add(starfield);
    stars.push(starfield);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateNameOrientations() {
    const cameraWorldPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPosition);
    
    nameSpheres.forEach(nameGroup => {
        if (nameGroup.visible) {
            const worldPosition = new THREE.Vector3();
            nameGroup.getWorldPosition(worldPosition);
            
            const toCamera = new THREE.Vector3();
            toCamera.subVectors(cameraWorldPosition, worldPosition).normalize();
            
            nameGroup.lookAt(
                worldPosition.x + toCamera.x,
                worldPosition.y + toCamera.y,
                worldPosition.z + toCamera.z
            );
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    if (currentState === state.idle) {
        sphereGroup.rotation.x += idleRotationSpeed * 0.5;
        sphereGroup.rotation.y += idleRotationSpeed;
        currentRotationSpeed = idleRotationSpeed;
    } else if (currentState === state.spinningUp) {
        if (currentRotationSpeed < maxRotationSpeed) {
            currentRotationSpeed += spinUpAcceleration;
            if (currentRotationSpeed >= maxRotationSpeed) {
                currentRotationSpeed = maxRotationSpeed;
                currentState = state.spinning;
            }
        }
        sphereGroup.rotation.x += currentRotationSpeed * 0.5;
        sphereGroup.rotation.y += currentRotationSpeed;
        updateFestiveVolume();
    } else if (currentState === state.spinning) {
        sphereGroup.rotation.x += currentRotationSpeed * 0.5;
        sphereGroup.rotation.y += currentRotationSpeed;
        updateFestiveVolume();
    } else if (currentState === state.spinningDown) {
        if (currentRotationSpeed > 0) {
            currentRotationSpeed -= spinDownDeceleration;
            if (currentRotationSpeed <= 0) {
                currentRotationSpeed = 0;
                currentState = state.stopped;
                stopTimer();
                setTimeout(() => {
                    selectWinner();
                }, 1000);
            }
        }
        sphereGroup.rotation.x += currentRotationSpeed * 0.5;
        sphereGroup.rotation.y += currentRotationSpeed;
        updateFestiveVolume();
    } else if (currentState === state.stopped) {
        if (currentRotationSpeed > 0) {
            currentRotationSpeed = 0;
        }
    }
    
    updateNameOrientations();
    
    stars.forEach((star, index) => {
        star.rotation.y += 0.0001 * (index + 1);
        star.rotation.x += 0.00005 * (index + 1);
    });
    
    renderer.render(scene, camera);
}

function initUI() {
    const el = getElements();
    
    el.bannerTitle.textContent = config.bannerText;
    
    renderPrizeList();
    
    for (let i = 1; i <= 60; i++) {
        const option = document.createElement('div');
        option.className = 'dropdown-item';
        option.dataset.value = i;
        option.textContent = `${i}秒`;
        if (i === 5) option.classList.add('selected');
        el.timeMenu.appendChild(option);
    }
    
    updateButtonState();
}

function renderPrizeList() {
    const el = getElements();
    el.prizeList.innerHTML = '';
    
    config.prizes.forEach(prize => {
        const wonCount = winners.filter(w => w.prizeId === prize.id).length;
        const remaining = prize.count - wonCount;
        
        const prizeItem = document.createElement('div');
        prizeItem.className = 'prize-item';
        prizeItem.dataset.prizeId = prize.id;
        prizeItem.innerHTML = `
            <div class="prize-name">${prize.name}</div>
            <div class="prize-count">剩余: ${remaining}/${prize.count}</div>
        `;
        
        el.prizeList.appendChild(prizeItem);
    });
}

function initDropdowns() {
    const el = getElements();
    
    [el.modeDropdown, el.timeDropdown].forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (isLotteryRunning) return;
            
            e.stopPropagation();
            const menu = dropdown === el.modeDropdown ? el.modeMenu : el.timeMenu;
            const isOpen = menu.classList.contains('show');
            
            document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                m.classList.remove('show');
            });
            
            if (!isOpen) {
                menu.classList.add('show');
                dropdown.classList.add('active');
            } else {
                dropdown.classList.remove('active');
            }
        });
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    });
    
    el.modeMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (isLotteryRunning) return;
            
            e.stopPropagation();
            const value = item.dataset.value;
            selectedMode = value;
            
            el.modeMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            el.selectedModeSpan.textContent = item.textContent;
            
            el.modeMenu.classList.remove('show');
            el.modeDropdown.classList.remove('active');
            
            if (value === 'auto') {
                el.autoTimeGroup.style.display = 'block';
            } else {
                el.autoTimeGroup.style.display = 'none';
            }
            
            updateButtonState();
        });
    });
    
    el.timeMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (isLotteryRunning) return;
            
            e.stopPropagation();
            const value = parseInt(item.dataset.value);
            selectedTime = value;
            
            el.timeMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            el.selectedTimeSpan.textContent = item.textContent;
            
            el.timeMenu.classList.remove('show');
            el.timeDropdown.classList.remove('active');
            
            updateButtonState();
        });
    });
}

function initEventListeners() {
    const el = getElements();
    
    el.prizeList.addEventListener('click', (e) => {
        if (isLotteryRunning) return;
        
        const prizeItem = e.target.closest('.prize-item');
        if (!prizeItem) return;
        
        const prizeId = prizeItem.dataset.prizeId;
        const prize = config.prizes.find(p => p.id === prizeId);
        
        if (!prize) return;
        
        const wonCount = winners.filter(w => w.prizeId === prizeId).length;
        if (wonCount >= prize.count) {
            alert('该奖项已抽完！');
            return;
        }
        
        document.querySelectorAll('.prize-item').forEach(item => {
            item.classList.remove('selected');
        });
        prizeItem.classList.add('selected');
        
        selectedPrize = prize;
        updateButtonState();
    });
    
    el.actionBtn.addEventListener('click', handleAction);
    
    el.closeModal.addEventListener('click', closeModal);
    el.winnerModal.addEventListener('click', (e) => {
        if (e.target === el.winnerModal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && el.winnerModal.classList.contains('show')) {
            closeModal();
        }
    });
}

function updateButtonState() {
    const el = getElements();
    
    const canStart = selectedPrize !== null && selectedMode !== null;
    
    if (canStart) {
        el.actionBtn.classList.remove('disabled');
        if (selectedMode === 'manual') {
            if (currentState === state.spinningUp || currentState === state.spinning) {
                el.btnText.textContent = '开奖';
            } else {
                el.btnText.textContent = '开始';
            }
        } else {
            el.btnText.textContent = '开奖';
        }
    } else {
        el.actionBtn.classList.add('disabled');
        if (!selectedPrize) {
            el.btnText.textContent = '请选择奖项';
        } else if (!selectedMode) {
            el.btnText.textContent = '请选择开奖方式';
        }
    }
}

function handleAction() {
    const el = getElements();
    
    if (el.actionBtn.classList.contains('disabled')) {
        if (!selectedPrize) {
            alert('请先选择奖项！');
        } else if (!selectedMode) {
            alert('请先选择开奖方式！');
        }
        return;
    }
    
    initAudio();
    
    if (selectedMode === 'manual') {
        if (currentState === state.idle || currentState === state.stopped) {
            startLottery();
        } else if (currentState === state.spinningUp || currentState === state.spinning) {
            stopLottery();
        }
    } else {
        if (currentState === state.idle || currentState === state.stopped) {
            startLottery();
        }
    }
}

function setPrizePanelDisabled(disabled) {
    const el = getElements();
    if (disabled) {
        el.prizePanel.classList.add('disabled');
    } else {
        el.prizePanel.classList.remove('disabled');
    }
}

function startLottery() {
    const el = getElements();
    
    isLotteryRunning = true;
    currentState = state.spinningUp;
    currentRotationSpeed = idleRotationSpeed;
    
    startFestiveMusic();
    startTimer();
    
    el.timerDisplay.classList.add('show');
    el.actionBtn.classList.add('disabled');
    
    setPrizePanelDisabled(true);
    
    if (selectedMode === 'manual') {
        setTimeout(() => {
            if (currentState === state.spinningUp || currentState === state.spinning) {
                el.actionBtn.classList.remove('disabled');
                el.btnText.textContent = '开奖';
            }
        }, 2000);
    } else {
        const totalSpinTimeMs = selectedTime * 1000;
        
        const framesPerMs = 60 / 1000;
        const spinUpTimeMs = estimatedSpinUpTime / framesPerMs;
        const spinDownTimeMs = estimatedSpinDownTime / framesPerMs;
        
        const steadySpinTimeMs = totalSpinTimeMs - spinUpTimeMs - spinDownTimeMs;
        
        console.log('总时间:', totalSpinTimeMs, 'ms');
        console.log('加速时间:', spinUpTimeMs, 'ms');
        console.log('减速时间:', spinDownTimeMs, 'ms');
        console.log('匀速时间:', steadySpinTimeMs, 'ms');
        
        if (steadySpinTimeMs > 0) {
            autoStopTimeout = setTimeout(() => {
                if (currentState === state.spinningUp || currentState === state.spinning) {
                    stopLottery();
                }
            }, totalSpinTimeMs - spinDownTimeMs);
        } else {
            const stopTime = Math.max(1000, totalSpinTimeMs - spinDownTimeMs);
            autoStopTimeout = setTimeout(() => {
                if (currentState === state.spinningUp || currentState === state.spinning) {
                    stopLottery();
                }
            }, stopTime);
        }
    }
}

function stopLottery() {
    const el = getElements();
    
    if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        autoStopTimeout = null;
    }
    
    currentState = state.spinningDown;
    
    el.actionBtn.classList.add('disabled');
}

function startTimer() {
    const el = getElements();
    timerElapsed = 0;
    timerStartTime = performance.now();
    
    updateTimerDisplay();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timerElapsed = performance.now() - timerStartTime;
        updateTimerDisplay();
    }, 10);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (timerStartTime) {
        timerElapsed = performance.now() - timerStartTime;
        updateTimerDisplay();
    }
}

function updateTimerDisplay() {
    const el = getElements();
    
    const milliseconds = Math.floor(timerElapsed % 1000);
    const seconds = Math.floor((timerElapsed / 1000) % 60);
    const minutes = Math.floor(timerElapsed / 60000);
    
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(Math.floor(milliseconds / 10)).padStart(2, '0')}`;
    el.timerValue.textContent = formatted;
}

function findFrontWinner() {
    let closestParticipant = null;
    let minAngle = Infinity;
    
    const cameraWorldPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPosition);
    
    const sphereWorldPosition = new THREE.Vector3();
    sphereGroup.getWorldPosition(sphereWorldPosition);
    
    const sphereCenter = sphereWorldPosition.clone();
    
    let debugInfo = [];
    
    nameSpheres.forEach((nameGroup, index) => {
        if (usedParticipantIds.has(nameGroup.userData.participant.id)) {
            return;
        }
        
        const worldPosition = new THREE.Vector3();
        nameGroup.getWorldPosition(worldPosition);
        
        const toCamera = new THREE.Vector3();
        toCamera.subVectors(cameraWorldPosition, worldPosition);
        toCamera.normalize();
        
        const fromCenter = new THREE.Vector3();
        fromCenter.subVectors(worldPosition, sphereCenter);
        fromCenter.normalize();
        
        const dotProduct = fromCenter.dot(toCamera);
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
        
        const angleDegrees = angle * (180 / Math.PI);
        
        if (angleDegrees < minAngle) {
            minAngle = angleDegrees;
            closestParticipant = nameGroup.userData.participant;
            
            debugInfo.unshift({
                name: nameGroup.userData.participant.name,
                angle: angleDegrees.toFixed(2),
                dot: dotProduct.toFixed(4)
            });
        }
    });
    
    if (debugInfo.length > 0) {
        console.log('=== 正面检测 ===');
        console.log('最正面:', debugInfo[0]);
        if (debugInfo.length > 1) {
            console.log('第二:', debugInfo[1]);
        }
    }
    
    return closestParticipant;
}

function selectWinner() {
    const el = getElements();
    
    stopFestiveMusic();
    playWinSound();
    
    const winner = findFrontWinner();
    
    if (!winner) {
        alert('所有人员都已中奖！');
        resetLotteryState();
        return;
    }
    
    usedParticipantIds.add(winner.id);
    
    const winnerInfo = {
        ...winner,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        time: new Date().toLocaleTimeString()
    };
    
    winners.unshift(winnerInfo);
    
    showWinnerModal(winnerInfo);
    
    updateWinnersList();
    renderPrizeList();
    
    resetLotteryState();
}

function resetLotteryState() {
    const el = getElements();
    
    isLotteryRunning = false;
    currentState = state.stopped;
    
    el.timerDisplay.classList.remove('show');
    
    setPrizePanelDisabled(false);
    updateButtonState();
}

function showWinnerModal(winner) {
    const el = getElements();
    
    el.modalPrize.textContent = winner.prizeName;
    el.modalName.textContent = winner.name;
    el.modalPhone.textContent = winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    
    el.winnerModal.classList.add('show');
}

function closeModal() {
    const el = getElements();
    el.winnerModal.classList.remove('show');
    
    currentState = state.idle;
    currentRotationSpeed = idleRotationSpeed;
    
    updateButtonState();
}

function updateWinnersList() {
    const el = getElements();
    
    if (winners.length === 0) {
        el.winnersList.innerHTML = '<div class="winners-placeholder">暂无中奖者</div>';
        return;
    }
    
    el.winnersList.innerHTML = '';
    
    winners.forEach((winner, index) => {
        const winnerItem = document.createElement('div');
        winnerItem.className = 'winner-item';
        if (index === 0) {
            winnerItem.classList.add('highlight');
        }
        winnerItem.innerHTML = `
            <div class="winner-prize">${winner.prizeName}</div>
            <div class="winner-name">${winner.name}</div>
            <div class="winner-phone">${winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
        `;
        el.winnersList.appendChild(winnerItem);
    });
}

window.addEventListener('DOMContentLoaded', init);
