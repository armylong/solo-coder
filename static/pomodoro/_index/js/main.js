class PomodoroTimer {
    constructor() {
        this.settings = {
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            soundEnabled: true
        };
        
        this.currentMode = 'focus';
        this.timeLeft = this.settings.focusDuration * 60;
        this.totalTime = this.timeLeft;
        this.isRunning = false;
        this.timerInterval = null;
        this.pomodoroCount = 0;
        this.todayPomodoros = 0;
        this.totalFocusMinutes = 0;
        this.tasks = [];
        this.audioContext = null;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.updateDisplay();
        this.updateProgressRing();
        this.renderTasks();
        this.updateStats();
    }

    loadFromStorage() {
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem('pomodoroDate');
        
        if (savedDate !== today) {
            localStorage.setItem('pomodoroDate', today);
            this.todayPomodoros = 0;
            this.totalFocusMinutes = 0;
            this.tasks = [];
            this.pomodoroCount = 0;
        } else {
            const savedPomodoros = localStorage.getItem('todayPomodoros');
            const savedFocusTime = localStorage.getItem('totalFocusTime');
            const savedCount = localStorage.getItem('pomodoroCount');
            
            if (savedPomodoros) this.todayPomodoros = parseInt(savedPomodoros);
            if (savedFocusTime) this.totalFocusMinutes = parseInt(savedFocusTime);
            if (savedCount) this.pomodoroCount = parseInt(savedCount);
        }

        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }

        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }

        this.timeLeft = this.settings.focusDuration * 60;
        this.totalTime = this.timeLeft;
    }

    saveToStorage() {
        localStorage.setItem('todayPomodoros', this.todayPomodoros.toString());
        localStorage.setItem('totalFocusTime', this.totalFocusMinutes.toString());
        localStorage.setItem('pomodoroCount', this.pomodoroCount.toString());
        localStorage.setItem('pomodoroSettings', JSON.stringify(this.settings));
        localStorage.setItem('pomodoroTasks', JSON.stringify(this.tasks));
    }

    bindEvents() {
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        document.getElementById('startPauseBtn').addEventListener('click', () => {
            this.toggleTimer();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetTimer();
        });

        document.getElementById('skipBtn').addEventListener('click', () => {
            this.skipPhase();
        });

        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.addTask();
        });

        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.mode === mode) {
                tab.classList.add('active');
            }
        });

        switch (mode) {
            case 'focus':
                this.timeLeft = this.settings.focusDuration * 60;
                break;
            case 'shortBreak':
                this.timeLeft = this.settings.shortBreakDuration * 60;
                break;
            case 'longBreak':
                this.timeLeft = this.settings.longBreakDuration * 60;
                break;
        }

        this.totalTime = this.timeLeft;
        this.updateModeColor();
        this.updateDisplay();
        this.updateProgressRing();
        
        if (this.isRunning) {
            this.pauseTimer();
        }
    }

    updateModeColor() {
        const progressRing = document.querySelector('.progress-ring-circle');
        const startBtn = document.getElementById('startPauseBtn');
        
        let color;
        switch (this.currentMode) {
            case 'focus':
                color = '#ef4444';
                break;
            case 'shortBreak':
                color = '#10b981';
                break;
            case 'longBreak':
                color = '#3b82f6';
                break;
        }
        
        progressRing.style.stroke = color;
        startBtn.style.backgroundColor = color;
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        document.getElementById('startPauseBtn').textContent = '⏸️ 暂停';
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgressRing();

            if (this.timeLeft <= 0) {
                this.completePhase();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        document.getElementById('startPauseBtn').textContent = '▶️ 开始';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetTimer() {
        this.pauseTimer();
        
        switch (this.currentMode) {
            case 'focus':
                this.timeLeft = this.settings.focusDuration * 60;
                break;
            case 'shortBreak':
                this.timeLeft = this.settings.shortBreakDuration * 60;
                break;
            case 'longBreak':
                this.timeLeft = this.settings.longBreakDuration * 60;
                break;
        }
        
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateProgressRing();
    }

    skipPhase() {
        this.completePhase();
    }

    completePhase() {
        this.pauseTimer();
        this.playSound();

        if (this.currentMode === 'focus') {
            this.pomodoroCount++;
            this.todayPomodoros++;
            this.totalFocusMinutes += this.settings.focusDuration;
            this.saveToStorage();
            this.updateStats();

            if (this.pomodoroCount % this.settings.longBreakInterval === 0) {
                this.switchMode('longBreak');
            } else {
                this.switchMode('shortBreak');
            }
        } else {
            this.switchMode('focus');
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timeLeft').textContent = timeString;
    }

    updateProgressRing() {
        const progressRing = document.querySelector('.progress-ring-circle');
        const circumference = 2 * Math.PI * 90;
        const progress = this.timeLeft / this.totalTime;
        const offset = circumference * (1 - progress);
        progressRing.style.strokeDashoffset = offset;
    }

    updateStats() {
        document.getElementById('todayPomodoros').textContent = this.todayPomodoros;
        document.getElementById('totalFocusTime').textContent = `${this.totalFocusMinutes}分钟`;
    }

    addTask() {
        const input = document.getElementById('taskInput');
        const text = input.value.trim();
        
        if (!text) return;

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            pomodoros: 0
        };

        this.tasks.push(task);
        this.saveToStorage();
        this.renderTasks();
        input.value = '';
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveToStorage();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToStorage();
        this.renderTasks();
    }

    addTaskPomodoro(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.pomodoros++;
            this.saveToStorage();
            this.renderTasks();
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        this.tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-pomodoro">
                    <span>🍅 ${task.pomodoros}</span>
                    <button class="add-pomodoro-btn" data-id="${task.id}">+</button>
                </div>
                <button class="delete-task-btn" data-id="${task.id}">×</button>
            `;
            taskList.appendChild(taskItem);
        });

        taskList.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleTask(parseInt(e.target.dataset.id));
            });
        });

        taskList.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteTask(parseInt(e.target.dataset.id));
            });
        });

        taskList.querySelectorAll('.add-pomodoro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.addTaskPomodoro(parseInt(e.target.dataset.id));
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openSettings() {
        document.getElementById('focusDuration').value = this.settings.focusDuration;
        document.getElementById('shortBreakDuration').value = this.settings.shortBreakDuration;
        document.getElementById('longBreakDuration').value = this.settings.longBreakDuration;
        document.getElementById('longBreakInterval').value = this.settings.longBreakInterval;
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        
        document.getElementById('settingsModal').classList.add('show');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('show');
    }

    saveSettings() {
        const focusDuration = parseInt(document.getElementById('focusDuration').value);
        const shortBreakDuration = parseInt(document.getElementById('shortBreakDuration').value);
        const longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
        const longBreakInterval = parseInt(document.getElementById('longBreakInterval').value);
        const soundEnabled = document.getElementById('soundEnabled').checked;

        this.settings = {
            focusDuration: Math.max(1, Math.min(60, focusDuration)),
            shortBreakDuration: Math.max(1, Math.min(30, shortBreakDuration)),
            longBreakDuration: Math.max(1, Math.min(60, longBreakDuration)),
            longBreakInterval: Math.max(2, Math.min(8, longBreakInterval)),
            soundEnabled: soundEnabled
        };

        this.saveToStorage();
        this.closeSettings();
        this.resetTimer();
    }

    playSound() {
        if (!this.settings.soundEnabled) return;

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);

            setTimeout(() => {
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();

                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);

                osc2.frequency.setValueAtTime(1000, this.audioContext.currentTime);
                osc2.type = 'sine';

                gain2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.5);
            }, 300);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});
