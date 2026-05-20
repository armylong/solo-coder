const STORAGE_KEY = 'fish_eater_leaderboard';
const MAX_ENTRIES = 10;

export class LeaderboardManager {
    constructor() {
        this.entries = this._loadFromStorage();
    }

    _loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        }
        return [];
    }

    _saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
        } catch (e) {
            console.error('Failed to save leaderboard:', e);
        }
    }

    addEntry(score, level) {
        const entry = {
            score,
            level,
            date: new Date().toISOString()
        };
        
        this.entries.push(entry);
        this.entries.sort((a, b) => b.score - a.score);
        this.entries = this.entries.slice(0, MAX_ENTRIES);
        
        this._saveToStorage();
        return this.entries.indexOf(entry);
    }

    getEntries() {
        return this.entries;
    }

    isHighScore(score) {
        if (this.entries.length < MAX_ENTRIES) {
            return true;
        }
        return score > this.entries[this.entries.length - 1].score;
    }
}
