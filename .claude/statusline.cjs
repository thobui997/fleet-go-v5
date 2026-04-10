#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input);
    const model = data.model.display_name;
    const dir = path.basename(data.workspace.current_dir);
    const pct = Math.floor(data.context_window?.used_percentage || 0);
    const contextSize = data.context_window?.context_window_size || 0;
    const durationMs = data.cost?.total_duration_ms || 0;

    const CYAN = '\x1b[36m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', GRAY = '\x1b[90m', RESET = '\x1b[0m';

    const barColor = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;
    const filled = Math.floor(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    const formatCtx = (n) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
        if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
        return `${n}`;
    };

    const formatRateLimit = (pct, resetsAt) => {
        const color = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;
        if (!resetsAt) return `${color}${Math.floor(pct)}%${RESET}`;
        const secsLeft = resetsAt - Math.floor(Date.now() / 1000);
        if (secsLeft <= 0) return `${color}${Math.floor(pct)}%${RESET}`;
        const h = Math.floor(secsLeft / 3600);
        const m = Math.floor((secsLeft % 3600) / 60);
        const timeStr = h > 0 ? `${h}h${m}m` : `${m}m`;
        return `${color}${Math.floor(pct)}%${RESET}${GRAY}(${timeStr})${RESET}`;
    };

    let branch = '';
    try {
        branch = execSync('git branch --show-current', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        branch = branch ? ` | 🌿 ${branch}` : '';
    } catch {}

    // Rate limit (chỉ có với Claude.ai Pro/Max)
    let rateLimitStr = '';
    const fiveH = data.rate_limits?.five_hour;
    const sevenD = data.rate_limits?.seven_day;
    if (fiveH || sevenD) {
        const parts = [];
        if (fiveH) parts.push(`5h: ${formatRateLimit(fiveH.used_percentage, fiveH.resets_at)}`);
        if (sevenD) parts.push(`7d: ${formatRateLimit(sevenD.used_percentage, sevenD.resets_at)}`);
        rateLimitStr = ` | 🚦 ${parts.join(' ')}`;
    }

    console.log(`${CYAN}[${model}]${RESET} 📁 ${dir}${branch}`);
    console.log(` ${pct}% ${barColor}${bar}${RESET} ${CYAN}${formatCtx(contextSize)}${RESET} | ⏱️ ${mins}m ${secs}s${rateLimitStr}`);
});