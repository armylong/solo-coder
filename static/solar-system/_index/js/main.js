import { Auth } from '/static/_common/auth.js';

let scene, camera, renderer;
let sun, planets = [], orbits = [], satellites = [];
let stars;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraTheta = Math.PI / 4;
let cameraPhi = Math.PI / 4;
let cameraRadius = 150;
let targetTheta = Math.PI / 4;
let targetPhi = Math.PI / 4;
let targetRadius = 150;
let isPaused = false;
let raycaster, mouse;
let allMeshes = [];

let lookAtTarget = new THREE.Vector3(0, 0, 0);
let targetLookAt = new THREE.Vector3(0, 0, 0);
let isFocusing = false;
let trackingObject = null;

const initialState = {
    theta: Math.PI / 4,
    phi: Math.PI / 4,
    radius: 150
};

const STAR_COUNT = 10000;
const DRAG_SENSITIVITY = 0.005;
const ZOOM_SPEED = 5;
const MIN_ZOOM = 3;
const MAX_ZOOM = 500;

const planetData = [
    {
        name: '水星',
        englishName: 'Mercury',
        color: 0xb5b5b5,
        radius: 0.8,
        orbitRadius: 25,
        orbitSpeed: 0.04,
        rotationSpeed: 0.002,
        tilt: 0.03,
        description: '距离太阳最近的行星，表面温度极端变化。',
        mass: '3.30 × 10²³ kg',
        diameter: '4,879 km',
        orbitalPeriod: '88地球日',
        satellites: []
    },
    {
        name: '金星',
        englishName: 'Venus',
        color: 0xffc649,
        radius: 1.2,
        orbitRadius: 35,
        orbitSpeed: 0.015,
        rotationSpeed: 0.001,
        tilt: 177.4,
        description: '太阳系中最热的行星，拥有浓厚的大气层。',
        mass: '4.87 × 10²⁴ kg',
        diameter: '12,104 km',
        orbitalPeriod: '225地球日',
        satellites: []
    },
    {
        name: '地球',
        englishName: 'Earth',
        color: 0x6b93d6,
        radius: 1.3,
        orbitRadius: 50,
        orbitSpeed: 0.01,
        rotationSpeed: 0.02,
        tilt: 23.5,
        description: '我们的家园，太阳系中唯一已知有生命的行星。',
        mass: '5.97 × 10²⁴ kg',
        diameter: '12,742 km',
        orbitalPeriod: '365.25地球日',
        satellites: [
            { name: '月球', color: 0xaaaaaa, radius: 0.3, orbitRadius: 3.5, orbitSpeed: 0.05 }
        ]
    },
    {
        name: '火星',
        englishName: 'Mars',
        color: 0xc1440e,
        radius: 0.9,
        orbitRadius: 70,
        orbitSpeed: 0.008,
        rotationSpeed: 0.018,
        tilt: 25.2,
        description: '红色星球，可能曾经存在液态水。',
        mass: '6.42 × 10²³ kg',
        diameter: '6,779 km',
        orbitalPeriod: '687地球日',
        satellites: [
            { name: '火卫一', color: 0x8b7355, radius: 0.1, orbitRadius: 2, orbitSpeed: 0.15 },
            { name: '火卫二', color: 0x9b8765, radius: 0.08, orbitRadius: 2.8, orbitSpeed: 0.08 }
        ]
    },
    {
        name: '木星',
        englishName: 'Jupiter',
        color: 0xd8ca9d,
        radius: 5,
        orbitRadius: 110,
        orbitSpeed: 0.004,
        rotationSpeed: 0.04,
        tilt: 3.1,
        description: '太阳系最大的行星，拥有著名的大红斑。',
        mass: '1.90 × 10²⁷ kg',
        diameter: '139,820 km',
        orbitalPeriod: '11.86地球年',
        satellites: [
            { name: '木卫一', color: 0xffdbac, radius: 0.25, orbitRadius: 8, orbitSpeed: 0.06 },
            { name: '木卫二', color: 0xf5f5dc, radius: 0.22, orbitRadius: 9.5, orbitSpeed: 0.05 },
            { name: '木卫三', color: 0xd3d3d3, radius: 0.32, orbitRadius: 11, orbitSpeed: 0.04 },
            { name: '木卫四', color: 0x8b8682, radius: 0.28, orbitRadius: 13, orbitSpeed: 0.035 }
        ]
    },
    {
        name: '土星',
        englishName: 'Saturn',
        color: 0xfad5a5,
        radius: 4.2,
        orbitRadius: 155,
        orbitSpeed: 0.003,
        rotationSpeed: 0.038,
        tilt: 26.7,
        hasRing: true,
        description: '拥有壮观环系统的气态巨行星。',
        mass: '5.68 × 10²⁶ kg',
        diameter: '116,460 km',
        orbitalPeriod: '29.46地球年',
        satellites: [
            { name: '土卫六', color: 0xffa500, radius: 0.35, orbitRadius: 10, orbitSpeed: 0.04 },
            { name: '土卫五', color: 0xffffff, radius: 0.18, orbitRadius: 8, orbitSpeed: 0.05 },
            { name: '土卫四', color: 0xe0e0e0, radius: 0.15, orbitRadius: 7, orbitSpeed: 0.06 }
        ]
    },
    {
        name: '天王星',
        englishName: 'Uranus',
        color: 0x4fd0e7,
        radius: 2.5,
        orbitRadius: 195,
        orbitSpeed: 0.002,
        rotationSpeed: 0.03,
        tilt: 97.8,
        description: '侧躺着公转的冰巨星，呈淡蓝绿色。',
        mass: '8.68 × 10²⁵ kg',
        diameter: '50,724 km',
        orbitalPeriod: '84地球年',
        satellites: [
            { name: '天卫五', color: 0xb8b8b8, radius: 0.12, orbitRadius: 4.5, orbitSpeed: 0.07 },
            { name: '天卫一', color: 0xc8c8c8, radius: 0.15, orbitRadius: 5.5, orbitSpeed: 0.06 }
        ]
    },
    {
        name: '海王星',
        englishName: 'Neptune',
        color: 0x4b70dd,
        radius: 2.4,
        orbitRadius: 235,
        orbitSpeed: 0.001,
        rotationSpeed: 0.032,
        tilt: 28.3,
        description: '太阳系最外层的行星，拥有最强的风暴。',
        mass: '1.02 × 10²⁶ kg',
        diameter: '49,244 km',
        orbitalPeriod: '164.8地球年',
        satellites: [
            { name: '海卫一', color: 0xe8e8e8, radius: 0.18, orbitRadius: 5, orbitSpeed: 0.06 }
        ]
    }
];

function init() {
    createScene();
    createLights();
    createStars();
    createSun();
    createPlanets();
    createOrbits();
    setupRaycaster();
    bindEvents();
    
    animate();
}

function createScene() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
}

function updateCameraPosition() {
    const offsetX = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    const offsetY = cameraRadius * Math.cos(cameraPhi);
    const offsetZ = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    
    camera.position.x = lookAtTarget.x + offsetX;
    camera.position.y = lookAtTarget.y + offsetY;
    camera.position.z = lookAtTarget.z + offsetZ;
    camera.lookAt(lookAtTarget);
}

function createLights() {
    const ambientLight = new THREE.AmbientLight(0x333333, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
}

function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];

    for (let i = 0; i < STAR_COUNT; i++) {
        const radius = 400 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        starVertices.push(x, y, z);
        
        const color = new THREE.Color();
        color.setHSL(0.1 + Math.random() * 0.2, 0.3 + Math.random() * 0.3, 0.7 + Math.random() * 0.3);
        starColors.push(color.r, color.g, color.b);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function createSun() {
    const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#ffdd00');
    gradient.addColorStop(0.4, '#ffaa00');
    gradient.addColorStop(0.6, '#ff8800');
    gradient.addColorStop(0.8, '#ff6600');
    gradient.addColorStop(1, '#cc4400');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 30 + 5;
        const alpha = Math.random() * 0.3;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
        ctx.fill();
    }
    
    const sunTexture = new THREE.CanvasTexture(canvas);
    
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: sunTexture
    });

    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = {
        name: '太阳',
        englishName: 'Sun',
        description: '太阳系的中心恒星，提供光和热能。',
        mass: '1.99 × 10³⁰ kg',
        diameter: '1,392,700 km',
        isSun: true
    };
    scene.add(sun);
    allMeshes.push(sun);

    const glowGeometry = new THREE.SphereGeometry(13, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(sunGlow);
}

function createPlanets() {
    planetData.forEach((data, index) => {
        const orbitGroup = new THREE.Group();
        orbitGroup.userData = { orbitSpeed: data.orbitSpeed, angle: Math.random() * Math.PI * 2 };
        
        const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: data.color,
            shininess: 30
        });
        
        const planet = new THREE.Mesh(geometry, material);
        planet.userData = {
            name: data.name,
            englishName: data.englishName,
            description: data.description,
            mass: data.mass,
            diameter: data.diameter,
            orbitalPeriod: data.orbitalPeriod,
            rotationSpeed: data.rotationSpeed,
            tilt: data.tilt,
            isPlanet: true,
            satellites: data.satellites
        };
        
        planet.rotation.x = data.tilt * Math.PI / 180;
        orbitGroup.add(planet);
        planets.push({ mesh: planet, group: orbitGroup, data: data });
        allMeshes.push(planet);
        scene.add(orbitGroup);
        
        if (data.hasRing) {
            const innerRadius = data.radius * 1.4;
            const outerRadius = data.radius * 2.2;
            const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
            
            const ringCanvas = document.createElement('canvas');
            ringCanvas.width = 512;
            ringCanvas.height = 64;
            const ringCtx = ringCanvas.getContext('2d');
            
            const ringGradient = ringCtx.createLinearGradient(0, 0, ringCanvas.width, 0);
            ringGradient.addColorStop(0, '#8b7355');
            ringGradient.addColorStop(0.2, '#d4a574');
            ringGradient.addColorStop(0.4, '#c9a86c');
            ringGradient.addColorStop(0.6, '#b8956e');
            ringGradient.addColorStop(0.8, '#a0826d');
            ringGradient.addColorStop(1, '#8b7355');
            
            ringCtx.fillStyle = ringGradient;
            ringCtx.fillRect(0, 0, ringCanvas.width, ringCanvas.height);
            
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * ringCanvas.width;
                const y = Math.random() * ringCanvas.height;
                const size = Math.random() * 3 + 1;
                
                ringCtx.beginPath();
                ringCtx.arc(x, y, size, 0, Math.PI * 2);
                ringCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                ringCtx.fill();
            }
            
            const ringTexture = new THREE.CanvasTexture(ringCanvas);
            
            const ringMaterial = new THREE.MeshPhongMaterial({
                map: ringTexture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            planet.add(ring);
        }
        
        data.satellites.forEach((satData, satIndex) => {
            const satOrbitGroup = new THREE.Group();
            satOrbitGroup.userData = { orbitSpeed: satData.orbitSpeed, angle: Math.random() * Math.PI * 2 };
            
            const satGeometry = new THREE.SphereGeometry(satData.radius, 16, 16);
            const satMaterial = new THREE.MeshPhongMaterial({
                color: satData.color,
                shininess: 20
            });
            
            const satellite = new THREE.Mesh(satGeometry, satMaterial);
            satellite.userData = {
                name: satData.name,
                description: `${data.name}的卫星`,
                isSatellite: true,
                parentPlanet: data.name
            };
            
            satOrbitGroup.add(satellite);
            satellites.push({ mesh: satellite, group: satOrbitGroup, parent: planet, data: satData });
            allMeshes.push(satellite);
            planet.add(satOrbitGroup);
        });
    });
}

function createOrbits() {
    planetData.forEach((data, index) => {
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitPoints = [];
        const segments = 128;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            orbitPoints.push(
                Math.cos(angle) * data.orbitRadius,
                0,
                Math.sin(angle) * data.orbitRadius
            );
        }
        
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
        
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x444466,
            transparent: true,
            opacity: 0.5
        });
        
        const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
        orbits.push(orbit);
        scene.add(orbit);
    });
}

function setupRaycaster() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
}

function bindEvents() {
    const container = document.getElementById('canvasContainer');
    
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onMouseWheel);
    container.addEventListener('click', onPlanetClick);
    
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', togglePause);
    
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', resetView);
    
    window.addEventListener('resize', onWindowResize);
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };
    
    targetTheta += deltaMove.x * DRAG_SENSITIVITY;
    targetPhi -= deltaMove.y * DRAG_SENSITIVITY;
    
    targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, targetPhi));
    
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

function onMouseWheel(event) {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
    targetRadius = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetRadius + delta));
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        event.preventDefault();
        isDragging = true;
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
}

function onTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const deltaMove = {
        x: event.touches[0].clientX - previousMousePosition.x,
        y: event.touches[0].clientY - previousMousePosition.y
    };
    
    targetTheta += deltaMove.x * DRAG_SENSITIVITY;
    targetPhi -= deltaMove.y * DRAG_SENSITIVITY;
    
    targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, targetPhi));
    
    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onTouchEnd() {
    isDragging = false;
}

function onPlanetClick(event) {
    const container = document.getElementById('canvasContainer');
    const rect = container.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(allMeshes);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        updateInfoPanel(clickedObject.userData);
        
        const worldPosition = new THREE.Vector3();
        clickedObject.getWorldPosition(worldPosition);
        targetLookAt.copy(worldPosition);
        
        const geometry = clickedObject.geometry;
        let objectRadius = 1;
        if (geometry.parameters && geometry.parameters.radius) {
            objectRadius = geometry.parameters.radius;
        }
        
        let zoomDistance;
        if (clickedObject.userData.isSun) {
            zoomDistance = objectRadius * 6;
        } else if (clickedObject.userData.isPlanet) {
            zoomDistance = objectRadius * 12;
        } else if (clickedObject.userData.isSatellite) {
            zoomDistance = objectRadius * 20;
        } else {
            zoomDistance = 30;
        }
        
        targetRadius = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomDistance));
        isFocusing = true;
        trackingObject = clickedObject;
    }
}

function updateInfoPanel(data) {
    const infoPanel = document.getElementById('planetInfo');
    
    let html = `<h3>🪐 ${data.name}</h3>`;
    html += '<div class="planet-details">';
    
    if (data.isSun) {
        html += `<h4>☀️ ${data.englishName}</h4>`;
        html += `<p>${data.description}</p>`;
        html += `<p><strong>质量：</strong>${data.mass}</p>`;
        html += `<p><strong>直径：</strong>${data.diameter}</p>`;
    } else if (data.isPlanet) {
        html += `<h4>🌍 ${data.englishName}</h4>`;
        html += `<p>${data.description}</p>`;
        html += `<p><strong>质量：</strong>${data.mass}</p>`;
        html += `<p><strong>直径：</strong>${data.diameter}</p>`;
        html += `<p><strong>公转周期：</strong>${data.orbitalPeriod}</p>`;
        html += `<p><strong>自转轴倾角：</strong>${data.tilt}°</p>`;
        if (data.satellites && data.satellites.length > 0) {
            const satNames = data.satellites.map(s => s.name).join('、');
            html += `<p><strong>已知卫星：</strong>${satNames}</p>`;
        }
    } else if (data.isSatellite) {
        html += `<h4>🌙 ${data.name}</h4>`;
        html += `<p>${data.description}</p>`;
        html += `<p><strong>所属行星：</strong>${data.parentPlanet}</p>`;
    }
    
    html += '</div>';
    infoPanel.innerHTML = html;
}

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '▶️ 继续' : '⏸️ 暂停';
}

function resetView() {
    targetTheta = initialState.theta;
    targetPhi = initialState.phi;
    targetRadius = initialState.radius;
    targetLookAt.set(0, 0, 0);
    isFocusing = false;
    trackingObject = null;
    
    const infoPanel = document.getElementById('planetInfo');
    infoPanel.innerHTML = `
        <h3>🪐 行星信息</h3>
        <p class="info-text">点击任意行星查看详细信息</p>
    `;
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!isPaused) {
        sun.rotation.y += 0.002;
        
        planets.forEach((planet, index) => {
            const group = planet.group;
            const mesh = planet.mesh;
            const data = planet.data;
            
            group.userData.angle += data.orbitSpeed * 0.1;
            const angle = group.userData.angle;
            
            group.position.x = Math.cos(angle) * data.orbitRadius;
            group.position.z = Math.sin(angle) * data.orbitRadius;
            
            mesh.rotation.y += data.rotationSpeed * 0.1;
        });
        
        satellites.forEach((satellite) => {
            const group = satellite.group;
            const data = satellite.data;
            
            group.userData.angle += data.orbitSpeed * 0.1;
            const angle = group.userData.angle;
            
            group.position.x = Math.cos(angle) * data.orbitRadius;
            group.position.z = Math.sin(angle) * data.orbitRadius;
        });
    }
    
    if (trackingObject) {
        const worldPosition = new THREE.Vector3();
        trackingObject.getWorldPosition(worldPosition);
        targetLookAt.copy(worldPosition);
    }
    
    lookAtTarget.lerp(targetLookAt, 0.05);
    
    cameraTheta += (targetTheta - cameraTheta) * 0.1;
    cameraPhi += (targetPhi - cameraPhi) * 0.1;
    cameraRadius += (targetRadius - cameraRadius) * 0.1;
    
    updateCameraPosition();
    
    stars.rotation.y += 0.0001;
    
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);