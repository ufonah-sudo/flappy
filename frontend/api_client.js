// Замените на ваш URL Vercel после деплоя
const API_BASE = '/api'; 

export class ApiClient {
    constructor() {
        this.initData = Telegram.WebApp.initData;
    }

    async login(startParam) {
        const res = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: this.initData, startParam })
        });
        return res.json();
    }

    async spendCoin() {
        const res = await fetch(`${API_BASE}/coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: this.initData, action: 'spend' })
        });
        return res.json();
    }

    async buyCoins(amount) {
        const res = await fetch(`${API_BASE}/coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: this.initData, action: 'buy', amount })
        });
        return res.json();
    }

    async submitScore(score) {
        await fetch(`${API_BASE}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: this.initData, score })
        });
    }

    async getLeaderboard() {
        const res = await fetch(`${API_BASE}/scores`);
        return res.json();
    }
}