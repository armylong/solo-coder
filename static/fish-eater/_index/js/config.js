export const GAME_STATES = {
    IDLE: 'idle',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

export const PLAYER_CONFIG = {
    START_SIZE: 25,
    MAX_SIZE: 200,
    GROWTH_RATE: 1.0,
    SPEED: 3.5,
    INITIAL_HP: 100,
    HP_DECREASE_PER_HIT: 25,
    INVINCIBLE_TIME: 1500
};

export const AI_FISH_CONFIG = {
    MIN_SIZE: 10,
    MAX_SIZE: 200,
    BASE_SPEED: 0.6,
    SPAWN_INTERVAL: 3000,
    MAX_COUNT: 12
};

export const COLORS = {
    BACKGROUND_TOP: '#4FC3F7',
    BACKGROUND_MIDDLE: '#29B6F6',
    BACKGROUND_BOTTOM: '#03A9F4',
    PLAYER_FISH: '#FF6B6B',
    PLAYER_FISH_LIGHT: '#FF8A8A',
    EYE_WHITE: '#FFFFFF',
    EYE_PUPIL: '#333333',
    UI_BACKGROUND: 'rgba(0, 0, 0, 0.5)',
    UI_TEXT: '#FFFFFF',
    BUTTON_BG: '#4CAF50',
    BUTTON_HOVER: '#45A049',
    SCORE_TEXT: '#FFD700'
};

export const FISH_SPECIES = [
    { 
        id: 'minnow', 
        name: '鱼苗', 
        minSize: 8, 
        maxSize: 15, 
        color: '#81C784', 
        colorLight: '#A5D6A7',
        colorDark: '#4CAF50',
        shape: 'small'
    },
    { 
        id: 'sardine', 
        name: '沙丁鱼', 
        minSize: 13, 
        maxSize: 22, 
        color: '#66BB6A', 
        colorLight: '#81C784',
        colorDark: '#43A047',
        shape: 'small'
    },
    { 
        id: 'anchovy', 
        name: '凤尾鱼', 
        minSize: 18, 
        maxSize: 28, 
        color: '#4DB6AC', 
        colorLight: '#80CBC4',
        colorDark: '#26A69A',
        shape: 'small'
    },
    { 
        id: 'goldfish', 
        name: '金鱼', 
        minSize: 24, 
        maxSize: 38, 
        color: '#FFB74D', 
        colorLight: '#FFCC80',
        colorDark: '#FF9800',
        shape: 'medium'
    },
    { 
        id: 'trout', 
        name: '鳟鱼', 
        minSize: 33, 
        maxSize: 48, 
        color: '#4FC3F7', 
        colorLight: '#81D4FA',
        colorDark: '#03A9F4',
        shape: 'medium'
    },
    { 
        id: 'carp', 
        name: '鲤鱼', 
        minSize: 42, 
        maxSize: 58, 
        color: '#BA68C8', 
        colorLight: '#CE93D8',
        colorDark: '#9C27B0',
        shape: 'medium'
    },
    { 
        id: 'bass', 
        name: '鲈鱼', 
        minSize: 52, 
        maxSize: 70, 
        color: '#F06292', 
        colorLight: '#F48FB1',
        colorDark: '#E91E63',
        shape: 'large'
    },
    { 
        id: 'salmon', 
        name: '三文鱼', 
        minSize: 63, 
        maxSize: 82, 
        color: '#FF8A65', 
        colorLight: '#FFAB91',
        colorDark: '#FF5722',
        shape: 'large'
    },
    { 
        id: 'tuna', 
        name: '金枪鱼', 
        minSize: 75, 
        maxSize: 98, 
        color: '#7986CB', 
        colorLight: '#9FA8DA',
        colorDark: '#5C6BC0',
        shape: 'large'
    },
    { 
        id: 'marlin', 
        name: '马林鱼', 
        minSize: 90, 
        maxSize: 120, 
        color: '#4DD0E1', 
        colorLight: '#80DEEA',
        colorDark: '#00BCD4',
        shape: 'huge'
    },
    { 
        id: 'swordfish', 
        name: '剑鱼', 
        minSize: 110, 
        maxSize: 145, 
        color: '#90A4AE', 
        colorLight: '#B0BEC5',
        colorDark: '#607D8B',
        shape: 'huge'
    },
    { 
        id: 'shark', 
        name: '鲨鱼', 
        minSize: 135, 
        maxSize: 175, 
        color: '#78909C', 
        colorLight: '#90A4AE',
        colorDark: '#546E7A',
        shape: 'huge'
    },
    { 
        id: 'orca', 
        name: '虎鲸', 
        minSize: 165, 
        maxSize: 200, 
        color: '#455A64', 
        colorLight: '#607D8B',
        colorDark: '#37474F',
        shape: 'giant'
    },
    { 
        id: 'whale', 
        name: '鲸鱼', 
        minSize: 190, 
        maxSize: 250, 
        color: '#5C6BC0', 
        colorLight: '#7986CB',
        colorDark: '#3F51B5',
        shape: 'giant'
    }
];

export const LEVELS = [
    { level: 1, minSize: 20, maxSize: 28, species: 'sardine' },
    { level: 2, minSize: 28, maxSize: 38, species: 'goldfish' },
    { level: 3, minSize: 38, maxSize: 50, species: 'trout' },
    { level: 4, minSize: 50, maxSize: 65, species: 'carp' },
    { level: 5, minSize: 65, maxSize: 82, species: 'bass' },
    { level: 6, minSize: 82, maxSize: 102, species: 'salmon' },
    { level: 7, minSize: 102, maxSize: 125, species: 'tuna' },
    { level: 8, minSize: 125, maxSize: 152, species: 'marlin' },
    { level: 9, minSize: 152, maxSize: 182, species: 'swordfish' },
    { level: 10, minSize: 182, maxSize: 220, species: 'shark' },
    { level: 11, minSize: 220, maxSize: 250, species: 'orca' }
];

export const ANIMATION_CONFIG = {
    BUBBLE_SPEED: 0.3,
    BUBBLE_SPEED_MAX: 0.8,
    SEAWEED_SWAY_SPEED: 0.03,
    SEAWEED_SWAY_AMPLITUDE: 12
};

export const POWERUP_CONFIG = {
    SPAWN_INTERVAL: 15000,
    MAX_COUNT: 2,
    LIFETIME: 10000,
    BOUNCE_SPEED: 0.003,
    BOUNCE_AMPLITUDE: 8,
    SIZE: 25
};

export const POWERUP_TYPES = {
    SPEED: {
        id: 'speed',
        name: '加速',
        color: '#FFD700',
        colorLight: '#FFEB3B',
        duration: 8000,
        speedMultiplier: 1.5
    },
    SHIELD: {
        id: 'shield',
        name: '护盾',
        color: '#2196F3',
        colorLight: '#64B5F6',
        duration: null
    },
    SHRINK: {
        id: 'shrink',
        name: '缩小光线',
        color: '#9C27B0',
        colorLight: '#BA68C8',
        duration: 6000,
        shrinkRatio: 0.7
    }
};

export function getSpeciesById(id) {
    return FISH_SPECIES.find(s => s.id === id) || FISH_SPECIES[0];
}

export function getSpeciesBySize(size) {
    for (let i = FISH_SPECIES.length - 1; i >= 0; i--) {
        if (size >= FISH_SPECIES[i].minSize) {
            return FISH_SPECIES[i];
        }
    }
    return FISH_SPECIES[0];
}

export function getSpeciesForPlayer(level) {
    const levelConfig = LEVELS[level - 1];
    if (levelConfig) {
        return getSpeciesById(levelConfig.species);
    }
    return FISH_SPECIES[0];
}

export function getAvailableSpeciesForAI(playerSize) {
    const available = [];
    
    for (const species of FISH_SPECIES) {
        const avgSize = (species.minSize + species.maxSize) / 2;
        
        if (avgSize <= playerSize * 1.8 && avgSize >= playerSize * 0.3) {
            available.push(species);
        }
    }
    
    if (available.length === 0) {
        return FISH_SPECIES.slice(0, 5);
    }
    
    return available;
}
