import { Auth } from '/static/_common/auth.js';

let scene, camera, renderer;
let earth, earthClouds, stars;
let isDragging = false;
let isZoomDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0.4, y: 0 };
let currentRotation = { x: 0.4, y: 0 };
let targetZoom = 0.85;
let currentZoom = 0.85;
let autoRotate = true;

const EARTH_RADIUS = 2;
const CLOUD_RADIUS = 2.05;
const STAR_COUNT = 5000;
const AUTO_ROTATE_SPEED = 0.001;
const DRAG_SENSITIVITY = 0.005;
const ZOOM_SPEED = 0.1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 5;

const initialState = {
    targetRotation: { x: 0.4, y: 0 },
    currentRotation: { x: 0.4, y: 0 },
    targetZoom: 0.85,
    currentZoom: 0.85,
    autoRotate: true
};

let sliderTrack = null;
let sliderThumb = null;
let sliderFill = null;
let sliderTrackHeight = 180;

const permutation = [];

function initNoise() {
    const p = [];
    for (let i = 0; i < 256; i++) {
        p[i] = i;
    }
    
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
        permutation[i] = p[i & 255];
    }
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = fade(x);
    const v = fade(y);
    
    const A = permutation[X] + Y;
    const B = permutation[X + 1] + Y;
    
    return lerp(
        lerp(grad(permutation[A], x, y), grad(permutation[B], x - 1, y), u),
        lerp(grad(permutation[A + 1], x, y - 1), grad(permutation[B + 1], x - 1, y - 1), u),
        v
    );
}

function fbm(x, y, octaves = 6) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
        value += amplitude * noise2D(x * frequency, y * frequency);
        amplitude *= 0.5;
        frequency *= 2;
    }
    
    return value;
}

const continentsMask = [
    { name: 'NorthAmerica', points: [
        { lon: -170, lat: 65 }, { lon: -160, lat: 60 }, { lon: -150, lat: 58 },
        { lon: -140, lat: 60 }, { lon: -130, lat: 55 }, { lon: -125, lat: 50 },
        { lon: -124, lat: 40 }, { lon: -120, lat: 34 }, { lon: -115, lat: 32 },
        { lon: -110, lat: 25 }, { lon: -105, lat: 20 }, { lon: -100, lat: 15 },
        { lon: -90, lat: 15 }, { lon: -80, lat: 25 }, { lon: -70, lat: 40 },
        { lon: -65, lat: 45 }, { lon: -60, lat: 50 }, { lon: -55, lat: 48 },
        { lon: -52, lat: 45 }, { lon: -55, lat: 50 }, { lon: -60, lat: 55 },
        { lon: -70, lat: 60 }, { lon: -80, lat: 65 }, { lon: -100, lat: 70 },
        { lon: -120, lat: 72 }, { lon: -140, lat: 70 }, { lon: -160, lat: 68 },
        { lon: -170, lat: 65 }
    ]},
    { name: 'SouthAmerica', points: [
        { lon: -80, lat: 8 }, { lon: -75, lat: 5 }, { lon: -70, lat: 0 },
        { lon: -68, lat: -10 }, { lon: -70, lat: -20 }, { lon: -72, lat: -30 },
        { lon: -70, lat: -40 }, { lon: -68, lat: -45 }, { lon: -65, lat: -50 },
        { lon: -62, lat: -54 }, { lon: -60, lat: -56 }, { lon: -58, lat: -54 },
        { lon: -55, lat: -50 }, { lon: -52, lat: -40 }, { lon: -50, lat: -30 },
        { lon: -48, lat: -20 }, { lon: -45, lat: -10 }, { lon: -42, lat: -5 },
        { lon: -40, lat: 0 }, { lon: -45, lat: 5 }, { lon: -50, lat: 8 },
        { lon: -55, lat: 10 }, { lon: -60, lat: 8 }, { lon: -70, lat: 8 },
        { lon: -80, lat: 8 }
    ]},
    { name: 'Europe', points: [
        { lon: -10, lat: 36 }, { lon: 0, lat: 36 }, { lon: 5, lat: 40 },
        { lon: 10, lat: 43 }, { lon: 12, lat: 45 }, { lon: 15, lat: 47 },
        { lon: 20, lat: 50 }, { lon: 25, lat: 55 }, { lon: 30, lat: 60 },
        { lon: 28, lat: 65 }, { lon: 20, lat: 70 }, { lon: 10, lat: 70 },
        { lon: 5, lat: 65 }, { lon: 0, lat: 60 }, { lon: -5, lat: 55 },
        { lon: -8, lat: 50 }, { lon: -10, lat: 45 }, { lon: -10, lat: 36 }
    ]},
    { name: 'Africa', points: [
        { lon: -17, lat: 15 }, { lon: -15, lat: 10 }, { lon: -12, lat: 6 },
        { lon: -10, lat: 0 }, { lon: -8, lat: -5 }, { lon: -10, lat: -10 },
        { lon: -13, lat: -18 }, { lon: -15, lat: -25 }, { lon: -13, lat: -30 },
        { lon: -10, lat: -34 }, { lon: -8, lat: -35 }, { lon: 0, lat: -35 },
        { lon: 10, lat: -30 }, { lon: 15, lat: -25 }, { lon: 20, lat: -20 },
        { lon: 25, lat: -15 }, { lon: 30, lat: -10 }, { lon: 32, lat: -5 },
        { lon: 35, lat: 0 }, { lon: 36, lat: 5 }, { lon: 34, lat: 10 },
        { lon: 32, lat: 15 }, { lon: 28, lat: 20 }, { lon: 25, lat: 25 },
        { lon: 20, lat: 30 }, { lon: 15, lat: 32 }, { lon: 10, lat: 35 },
        { lon: 5, lat: 37 }, { lon: 0, lat: 35 }, { lon: -5, lat: 30 },
        { lon: -10, lat: 25 }, { lon: -15, lat: 20 }, { lon: -17, lat: 15 }
    ]},
    { name: 'Asia', points: [
        { lon: 25, lat: 35 }, { lon: 30, lat: 40 }, { lon: 35, lat: 45 },
        { lon: 40, lat: 50 }, { lon: 45, lat: 55 }, { lon: 50, lat: 60 },
        { lon: 55, lat: 65 }, { lon: 60, lat: 70 }, { lon: 70, lat: 75 },
        { lon: 80, lat: 78 }, { lon: 100, lat: 75 }, { lon: 120, lat: 70 },
        { lon: 140, lat: 65 }, { lon: 150, lat: 60 }, { lon: 170, lat: 55 },
        { lon: 180, lat: 50 }, { lon: 175, lat: 45 }, { lon: 170, lat: 40 },
        { lon: 160, lat: 35 }, { lon: 150, lat: 30 }, { lon: 145, lat: 25 },
        { lon: 140, lat: 20 }, { lon: 135, lat: 15 }, { lon: 130, lat: 10 },
        { lon: 120, lat: 5 }, { lon: 110, lat: 0 }, { lon: 105, lat: -5 },
        { lon: 105, lat: -7 }, { lon: 103, lat: -6 }, { lon: 101, lat: -3 },
        { lon: 100, lat: 0 }, { lon: 98, lat: 3 }, { lon: 96, lat: 5 },
        { lon: 95, lat: 8 }, { lon: 94, lat: 10 }, { lon: 92, lat: 12 },
        { lon: 90, lat: 15 }, { lon: 85, lat: 20 }, { lon: 80, lat: 25 },
        { lon: 75, lat: 28 }, { lon: 70, lat: 30 }, { lon: 65, lat: 32 },
        { lon: 60, lat: 35 }, { lon: 55, lat: 38 }, { lon: 50, lat: 40 },
        { lon: 45, lat: 42 }, { lon: 40, lat: 40 }, { lon: 35, lat: 38 },
        { lon: 30, lat: 35 }, { lon: 25, lat: 35 }
    ]},
    { name: 'Australia', points: [
        { lon: 115, lat: -20 }, { lon: 120, lat: -18 }, { lon: 125, lat: -16 },
        { lon: 130, lat: -15 }, { lon: 135, lat: -14 }, { lon: 140, lat: -16 },
        { lon: 145, lat: -20 }, { lon: 150, lat: -25 }, { lon: 152, lat: -30 },
        { lon: 150, lat: -35 }, { lon: 146, lat: -38 }, { lon: 142, lat: -39 },
        { lon: 138, lat: -38 }, { lon: 134, lat: -35 }, { lon: 130, lat: -32 },
        { lon: 126, lat: -30 }, { lon: 122, lat: -28 }, { lon: 118, lat: -25 },
        { lon: 115, lat: -22 }, { lon: 115, lat: -20 }
    ]},
    { name: 'Greenland', points: [
        { lon: -45, lat: 60 }, { lon: -40, lat: 62 }, { lon: -35, lat: 65 },
        { lon: -30, lat: 70 }, { lon: -25, lat: 75 }, { lon: -20, lat: 78 },
        { lon: -15, lat: 80 }, { lon: -10, lat: 82 }, { lon: -5, lat: 83 },
        { lon: 0, lat: 84 }, { lon: 10, lat: 83 }, { lon: 15, lat: 81 },
        { lon: 20, lat: 78 }, { lon: 25, lat: 75 }, { lon: 30, lat: 72 },
        { lon: 28, lat: 70 }, { lon: 20, lat: 68 }, { lon: 10, lat: 66 },
        { lon: 0, lat: 65 }, { lon: -10, lat: 64 }, { lon: -20, lat: 63 },
        { lon: -30, lat: 62 }, { lon: -40, lat: 61 }, { lon: -45, lat: 60 }
    ]}
];

function latLonToUV(lat, lon, width, height) {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
}

function pointInPolygon(x, y, polygon, width, height) {
    let inside = false;
    const n = polygon.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const pi = latLonToUV(polygon[i].lat, polygon[i].lon, width, height);
        const pj = latLonToUV(polygon[j].lat, polygon[j].lon, width, height);
        
        if (((pi.y > y) !== (pj.y > y)) &&
            (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y) + pi.x)) {
            inside = !inside;
        }
    }
    
    return inside;
}

function isLand(x, y, width, height) {
    for (const continent of continentsMask) {
        if (pointInPolygon(x, y, continent.points, width, height)) {
            return true;
        }
    }
    return false;
}

const textureConfig = {
    useExternalTextures: false,
    
    earthTextureUrl: '',
    normalTextureUrl: '',
    specularTextureUrl: '',
    cloudTextureUrl: ''
};

function init() {
    initNoise();
    createScene();
    createStars();
    createLights();
    initSlider();
    bindEvents();
    
    loadTextures();
    
    animate();
}

function loadTextures() {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = '';
    
    if (textureConfig.useExternalTextures && textureConfig.earthTextureUrl) {
        let loadedCount = 0;
        const totalToLoad = 4;
        
        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount >= totalToLoad) {
                console.log('All textures loaded successfully');
            }
        }
        
        loader.load(
            textureConfig.earthTextureUrl,
            function(earthTex) {
                earthTex.wrapS = THREE.ClampToEdgeWrapping;
                earthTex.wrapT = THREE.ClampToEdgeWrapping;
                
                let normalTex = null;
                let specularTex = null;
                
                if (textureConfig.normalTextureUrl) {
                    loader.load(
                        textureConfig.normalTextureUrl,
                        function(nTex) {
                            nTex.wrapS = THREE.ClampToEdgeWrapping;
                            nTex.wrapT = THREE.ClampToEdgeWrapping;
                            normalTex = nTex;
                            checkAllLoaded();
                        },
                        undefined,
                        function() { checkAllLoaded(); }
                    );
                } else {
                    checkAllLoaded();
                }
                
                if (textureConfig.specularTextureUrl) {
                    loader.load(
                        textureConfig.specularTextureUrl,
                        function(sTex) {
                            sTex.wrapS = THREE.ClampToEdgeWrapping;
                            sTex.wrapT = THREE.ClampToEdgeWrapping;
                            specularTex = sTex;
                            checkAllLoaded();
                        },
                        undefined,
                        function() { checkAllLoaded(); }
                    );
                } else {
                    checkAllLoaded();
                }
                
                createEarthWithTextures(earthTex, normalTex, specularTex);
                checkAllLoaded();
            },
            undefined,
            function() {
                console.log('Failed to load external earth texture, using procedural texture');
                createEarthProcedural();
                createCloudsProcedural();
            }
        );
        
        if (textureConfig.cloudTextureUrl) {
            loader.load(
                textureConfig.cloudTextureUrl,
                function(cloudTex) {
                    cloudTex.wrapS = THREE.RepeatWrapping;
                    cloudTex.wrapT = THREE.ClampToEdgeWrapping;
                    createCloudsWithTexture(cloudTex);
                },
                undefined,
                function() {
                    createCloudsProcedural();
                }
            );
        } else {
            createCloudsProcedural();
        }
    } else {
        createEarthProcedural();
        createCloudsProcedural();
    }
}

function createEarthWithTextures(mapTexture, normalTexture, specularTexture) {
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    
    const materialParams = {
        map: mapTexture,
        specular: new THREE.Color(0x333333),
        shininess: 25
    };
    
    if (normalTexture) {
        materialParams.normalMap = normalTexture;
        materialParams.normalScale = new THREE.Vector2(0.5, 0.5);
    }
    
    if (specularTexture) {
        materialParams.specularMap = specularTexture;
    }
    
    const earthMaterial = new THREE.MeshPhongMaterial(materialParams);
    
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);
}

function createCloudsWithTexture(cloudTexture) {
    const cloudGeometry = new THREE.SphereGeometry(CLOUD_RADIUS, 64, 64);
    
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.FrontSide
    });

    earthClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(earthClouds);
}

function createScene() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
}

function createEarthProcedural() {
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    createEarthTexture(ctx, canvas.width, canvas.height);
    
    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.wrapS = THREE.ClampToEdgeWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 2048;
    normalCanvas.height = 1024;
    const normalCtx = normalCanvas.getContext('2d');
    createNormalMap(normalCtx, normalCanvas.width, normalCanvas.height);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    
    const specularCanvas = document.createElement('canvas');
    specularCanvas.width = 2048;
    specularCanvas.height = 1024;
    const specularCtx = specularCanvas.getContext('2d');
    createSpecularMap(specularCtx, specularCanvas.width, specularCanvas.height);
    const specularTexture = new THREE.CanvasTexture(specularCanvas);
    
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(0.5, 0.5),
        specularMap: specularTexture,
        specular: new THREE.Color(0x333333),
        shininess: 25
    });

    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);
}

function createEarthTexture(ctx, width, height) {
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#1a4a7a');
    oceanGradient.addColorStop(0.2, '#0d3a6a');
    oceanGradient.addColorStop(0.5, '#0a2a5a');
    oceanGradient.addColorStop(0.8, '#0d3a6a');
    oceanGradient.addColorStop(1, '#1a4a7a');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);
    
    addOceanNoise(ctx, width, height);
    drawContinentsWithNoise(ctx, width, height);
    addPolarIce(ctx, width, height);
}

function addOceanNoise(ctx, width, height) {
    ctx.save();
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            const noiseVal = fbm(x / 200, y / 200, 4);
            const variation = Math.floor(noiseVal * 15);
            
            data[idx] = Math.max(0, Math.min(255, data[idx] + variation));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + variation));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + variation * 2));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
}

function drawContinentsWithNoise(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const land = isLand(x, y, width, height);
            
            if (land) {
                const idx = (y * width + x) * 4;
                
                const lat = 90 - (y / height) * 180;
                const absLat = Math.abs(lat);
                
                const noiseVal = fbm(x / 150, y / 150, 6);
                const detailNoise = fbm(x / 50, y / 50, 4);
                
                let r, g, b;
                
                if (absLat > 72) {
                    r = 200 + Math.floor(noiseVal * 20);
                    g = 210 + Math.floor(noiseVal * 20);
                    b = 220 + Math.floor(noiseVal * 20);
                } else if (absLat > 60) {
                    const blend = (absLat - 60) / 12;
                    r = Math.floor(lerp(60 + noiseVal * 20, 200, blend));
                    g = Math.floor(lerp(100 + noiseVal * 20, 210, blend));
                    b = Math.floor(lerp(60 + noiseVal * 15, 220, blend));
                } else {
                    const lon = (x / width) * 360 - 180;
                    
                    const isDesert = isDesertRegion(lat, lon);
                    const isRainforest = isRainforestRegion(lat, lon);
                    const isMountain = isMountainRegion(lat, lon);
                    
                    if (isMountain && noiseVal > 0.2) {
                        if (noiseVal > 0.4) {
                            r = 210 + Math.floor(noiseVal * 20);
                            g = 215 + Math.floor(noiseVal * 15);
                            b = 220 + Math.floor(noiseVal * 15);
                        } else {
                            r = 120 + Math.floor(noiseVal * 40);
                            g = 110 + Math.floor(noiseVal * 30);
                            b = 100 + Math.floor(noiseVal * 20);
                        }
                    } else if (isDesert) {
                        r = 180 + Math.floor(noiseVal * 40) + Math.floor(detailNoise * 20);
                        g = 150 + Math.floor(noiseVal * 30) + Math.floor(detailNoise * 15);
                        b = 100 + Math.floor(noiseVal * 20);
                    } else if (isRainforest) {
                        r = 20 + Math.floor(noiseVal * 30);
                        g = 80 + Math.floor(noiseVal * 40);
                        b = 20 + Math.floor(noiseVal * 20);
                    } else {
                        const baseGreen = 70 + Math.floor(noiseVal * 40);
                        const latFactor = 1 - Math.abs(lat) / 60;
                        
                        r = Math.floor(30 + noiseVal * 30 + (1 - latFactor) * 30);
                        g = Math.floor(baseGreen * latFactor + 60 * (1 - latFactor));
                        b = Math.floor(25 + noiseVal * 15);
                    }
                }
                
                data[idx] = Math.max(0, Math.min(255, r));
                data[idx + 1] = Math.max(0, Math.min(255, g));
                data[idx + 2] = Math.max(0, Math.min(255, b));
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function isDesertRegion(lat, lon) {
    if (lat > 15 && lat < 30 && lon > -15 && lon < 35) return true;
    if (lat > 20 && lat < 35 && lon > 50 && lon < 75) return true;
    if (lat > 18 && lat < 35 && lon > -115 && lon < -105) return true;
    if (lat > -30 && lat < -18 && lon > 115 && lon < 145) return true;
    if (lat > 20 && lat < 30 && lon > -5 && lon < 50) return true;
    return false;
}

function isRainforestRegion(lat, lon) {
    if (lat > -10 && lat < 10 && lon > -80 && lon < -50) return true;
    if (lat > -15 && lat < 10 && lon > 5 && lon < 30) return true;
    if (lat > 0 && lat < 15 && lon > 90 && lon < 110) return true;
    if (lat > -35 && lat < -10 && lon > 140 && lon < 155) return true;
    return false;
}

function isMountainRegion(lat, lon) {
    if (lat > 27 && lat < 38 && lon > 73 && lon < 88) return true;
    if (lat > 35 && lat < 50 && lon > 5 && lon < 15) return true;
    if (lat > 10 && lat < 55 && lon > -125 && lon < -115) return true;
    if (lat > -55 && lat < 10 && lon > -80 && lon < -65) return true;
    if (lat > 30 && lat < 50 && lon > 40 && lon < 60) return true;
    return false;
}

function addPolarIce(ctx, width, height) {
    ctx.save();
    
    const northGradient = ctx.createLinearGradient(0, 0, 0, height * 0.15);
    northGradient.addColorStop(0, 'rgba(230, 240, 250, 0.9)');
    northGradient.addColorStop(0.5, 'rgba(220, 235, 250, 0.5)');
    northGradient.addColorStop(1, 'rgba(210, 225, 245, 0)');
    ctx.fillStyle = northGradient;
    ctx.fillRect(0, 0, width, height * 0.15);
    
    const southGradient = ctx.createLinearGradient(0, height * 0.85, 0, height);
    southGradient.addColorStop(0, 'rgba(210, 225, 245, 0)');
    southGradient.addColorStop(0.5, 'rgba(220, 235, 250, 0.5)');
    southGradient.addColorStop(1, 'rgba(230, 240, 250, 0.9)');
    ctx.fillStyle = southGradient;
    ctx.fillRect(0, height * 0.85, width, height * 0.15);
    
    ctx.restore();
}

function createNormalMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            const land = isLand(x, y, width, height);
            
            if (land) {
                const noiseVal = fbm(x / 100, y / 100, 4);
                const nx = fbm((x + 1) / 100, y / 100, 4) - fbm((x - 1) / 100, y / 100, 4);
                const ny = fbm(x / 100, (y + 1) / 100, 4) - fbm(x / 100, (y - 1) / 100, 4);
                
                const length = Math.sqrt(nx * nx + ny * ny + 1);
                const r = Math.floor(((nx / length) + 1) * 127.5);
                const g = Math.floor(((ny / length) + 1) * 127.5);
                const b = Math.floor((1 / length) * 255);
                
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            } else {
                data[idx] = 128;
                data[idx + 1] = 128;
                data[idx + 2] = 255;
                data[idx + 3] = 255;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function createSpecularMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const land = isLand(x, y, width, height);
            
            if (land) {
                const val = 30 + Math.floor(Math.random() * 20);
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
            } else {
                const val = 180 + Math.floor(Math.random() * 50);
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
            }
            data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function createCloudsProcedural() {
    const cloudGeometry = new THREE.SphereGeometry(CLOUD_RADIUS, 64, 64);
    
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 2048;
    cloudCanvas.height = 1024;
    const cloudCtx = cloudCanvas.getContext('2d');
    
    createCloudTexture(cloudCtx, cloudCanvas.width, cloudCanvas.height);
    
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
    cloudTexture.needsUpdate = true;
    
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.FrontSide
    });

    earthClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(earthClouds);
}

function createCloudTexture(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            const lat = 90 - (y / height) * 180;
            const latFactor = Math.cos((lat * Math.PI) / 180);
            
            let cloudValue = 0;
            
            const largeScale = fbm(x / 300, y / 200, 3);
            const mediumScale = fbm(x / 150, y / 100, 4);
            const smallScale = fbm(x / 80, y / 60, 3);
            
            cloudValue = largeScale * 0.5 + mediumScale * 0.3 + smallScale * 0.2;
            cloudValue += 0.3;
            cloudValue *= latFactor * 0.7 + 0.3;
            
            const band1 = Math.exp(-Math.pow((lat - 50) / 20, 2));
            const band2 = Math.exp(-Math.pow((lat + 50) / 20, 2));
            const band3 = Math.exp(-Math.pow((lat - 0) / 30, 2));
            cloudValue += (band1 + band2 + band3) * 0.3;
            
            cloudValue = Math.max(0, Math.min(1, cloudValue));
            
            const threshold = 0.4;
            if (cloudValue > threshold) {
                const alpha = Math.floor(((cloudValue - threshold) / (1 - threshold)) * 220);
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = alpha;
            } else {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
                data[idx + 3] = 0;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const starSizes = [];

    for (let i = 0; i < STAR_COUNT; i++) {
        const radius = 50 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starVertices.push(x, y, z);
        
        const color = new THREE.Color();
        color.setHSL(0.1 + Math.random() * 0.2, 0.5 + Math.random() * 0.5, 0.8 + Math.random() * 0.2);
        starColors.push(color.r, color.g, color.b);
        
        starSizes.push(Math.random() * 2 + 0.5);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function createLights() {
    const ambientLight = new THREE.AmbientLight(0x222233, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 50;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-3, -1, -3);
    scene.add(fillLight);
}

function initSlider() {
    sliderThumb = document.getElementById('zoomSliderThumb');
    sliderFill = document.getElementById('zoomSliderFill');
    sliderTrack = document.querySelector('.zoom-slider-track');
    
    if (sliderTrack) {
        sliderTrackHeight = sliderTrack.clientHeight;
    }
    
    updateSliderPosition();
}

function updateSliderPosition() {
    if (!sliderThumb || !sliderFill) return;
    
    const normalizedZoom = (currentZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
    const thumbPosition = sliderTrackHeight - normalizedZoom * sliderTrackHeight;
    const fillHeight = normalizedZoom * sliderTrackHeight;
    
    sliderThumb.style.top = `${thumbPosition - 12}px`;
    sliderFill.style.height = `${fillHeight}px`;
}

function bindEvents() {
    const container = document.getElementById('canvasContainer');
    
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onMouseWheel);
    
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', resetView);
    
    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup', onGlobalMouseUp);
    
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', onGlobalTouchEnd);
    
    window.addEventListener('resize', onWindowResize);
}

function onMouseDown(event) {
    isDragging = true;
    autoRotate = false;
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
    
    targetRotation.y += deltaMove.x * DRAG_SENSITIVITY;
    targetRotation.x += deltaMove.y * DRAG_SENSITIVITY;
    
    targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.x));
    
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
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom + delta));
    
    updateSliderPosition();
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        event.preventDefault();
        isDragging = true;
        autoRotate = false;
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
    
    targetRotation.y += deltaMove.x * DRAG_SENSITIVITY;
    targetRotation.x += deltaMove.y * DRAG_SENSITIVITY;
    
    targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.x));
    
    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onTouchEnd() {
    isDragging = false;
}

function onGlobalMouseMove(event) {
    if (!isZoomDragging) {
        const target = event.target;
        if (target === sliderThumb || target === sliderTrack) {
            if (event.type === 'mousedown' || event.buttons === 1) {
                startZoomDrag(event);
            }
        }
    }
    
    if (isZoomDragging) {
        handleZoomDrag(event.clientY);
    }
}

function onGlobalMouseUp() {
    if (isZoomDragging) {
        isZoomDragging = false;
    }
}

function onGlobalTouchMove(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (target === sliderThumb || target === sliderTrack) {
            if (!isZoomDragging) {
                startZoomDragTouch(touch);
            }
        }
    }
    
    if (isZoomDragging && event.touches.length === 1) {
        event.preventDefault();
        handleZoomDrag(event.touches[0].clientY);
    }
}

function onGlobalTouchEnd() {
    if (isZoomDragging) {
        isZoomDragging = false;
    }
}

function startZoomDrag(event) {
    isZoomDragging = true;
    handleZoomDrag(event.clientY);
}

function startZoomDragTouch(touch) {
    isZoomDragging = true;
    handleZoomDrag(touch.clientY);
}

function handleZoomDrag(clientY) {
    if (!sliderTrack) return;
    
    const trackRect = sliderTrack.getBoundingClientRect();
    const trackTop = trackRect.top;
    
    let relativeY = clientY - trackTop;
    relativeY = Math.max(0, Math.min(sliderTrackHeight, relativeY));
    
    const normalizedZoom = 1 - (relativeY / sliderTrackHeight);
    targetZoom = MIN_ZOOM + normalizedZoom * (MAX_ZOOM - MIN_ZOOM);
    
    updateSliderPosition();
}

document.addEventListener('DOMContentLoaded', function() {
    if (sliderThumb) {
        sliderThumb.addEventListener('mousedown', function(event) {
            event.preventDefault();
            event.stopPropagation();
            startZoomDrag(event);
        });
    }
    
    if (sliderTrack) {
        sliderTrack.addEventListener('mousedown', function(event) {
            event.preventDefault();
            event.stopPropagation();
            startZoomDrag(event);
        });
    }
    
    if (sliderThumb) {
        sliderThumb.addEventListener('touchstart', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.touches.length === 1) {
                startZoomDragTouch(event.touches[0]);
            }
        }, { passive: false });
    }
    
    if (sliderTrack) {
        sliderTrack.addEventListener('touchstart', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.touches.length === 1) {
                startZoomDragTouch(event.touches[0]);
            }
        }, { passive: false });
    }
});

function resetView() {
    targetRotation = { ...initialState.targetRotation };
    currentRotation = { ...initialState.currentRotation };
    targetZoom = initialState.targetZoom;
    currentZoom = initialState.currentZoom;
    autoRotate = initialState.autoRotate;
    
    updateSliderPosition();
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    
    if (sliderTrack) {
        sliderTrackHeight = sliderTrack.clientHeight;
        updateSliderPosition();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (autoRotate && !isDragging) {
        targetRotation.y += AUTO_ROTATE_SPEED;
    }
    
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
    currentZoom += (targetZoom - currentZoom) * 0.1;
    
    if (earth) {
        earth.rotation.x = currentRotation.x;
        earth.rotation.y = currentRotation.y;
    }
    
    if (earthClouds) {
        earthClouds.rotation.x = currentRotation.x;
        earthClouds.rotation.y = currentRotation.y + Date.now() * 0.00005;
    }
    
    if (stars) {
        stars.rotation.y = currentRotation.y * 0.1;
    }
    
    camera.position.z = 5 / currentZoom;
    camera.lookAt(0, 0, 0);
    
    updateSliderPosition();
    
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
