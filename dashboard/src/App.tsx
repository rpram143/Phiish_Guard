import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Search, Globe, ChevronRight } from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Layers {
    linguistic: number;
    visual: number;
    behavioral: number;
}

interface Scan {
    id: number;
    url: string;
    score: number;
    risk: 'PHISHING' | 'SUSPICIOUS' | 'SAFE';
    time: string;
    layers: Layers;
}

interface Stats {
    total: number;
    threats: number;
    suspicious: number;
}

type WsStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

const LS_API_BASE_KEY = 'phishguard_api_base';
const DEFAULT_API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:8000';

function safeUrl(value: string) {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function getWsUrl(apiBase: string) {
    const u = safeUrl(apiBase);
    if (!u) return null;
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws/scans`;
}

function getApiBaseFromStorage() {
    const saved = localStorage.getItem(LS_API_BASE_KEY);
    return saved?.trim() || DEFAULT_API_BASE;
}

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'red' | 'yellow' | 'emerald'
}> = ({ title, value, icon, color }) => {
    const colorMap = {
        blue: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
        red: 'text-red-500 border-red-500/20 bg-red-500/5',
        yellow: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
        emerald: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
    };

    return (
        <div className={`p-6 rounded-2xl border ${colorMap[color]} backdrop-blur-sm transition-transform hover:scale-[1.02]`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-current">
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [apiBase, setApiBase] = useState<string>(() => getApiBaseFromStorage());
    const [apiInput, setApiInput] = useState<string>(() => getApiBaseFromStorage());
    const [wsStatus, setWsStatus] = useState<WsStatus>('DISCONNECTED');
    const [lastError, setLastError] = useState<string>('');

    const [scans, setScans] = useState<Scan[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, threats: 0, suspicious: 0 });
    const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);

    const scansApiUrl = useMemo(() => `${apiBase.replace(/\/$/, '')}/api/v1/scans`, [apiBase]);
    const statsApiUrl = useMemo(() => `${apiBase.replace(/\/$/, '')}/api/v1/stats`, [apiBase]);
    const wsUrl = useMemo(() => getWsUrl(apiBase), [apiBase]);
    const extensionScanUrl = useMemo(() => `${apiBase.replace(/\/$/, '')}/api/v1/scan`, [apiBase]);

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                setLastError('');

                // Fetch Scans
                const scansRes = await fetch(`${scansApiUrl}?limit=25`);
                if (!scansRes.ok) throw new Error(`Failed to fetch scans (${scansRes.status})`);
                const scansData = await scansRes.json();

                // Fetch Stats
                const statsRes = await fetch(statsApiUrl);
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    if (!cancelled) setStats(statsData);
                }

                if (cancelled) return;
                setScans(scansData);
                if (scansData.length > 0) setSelectedScan((prev) => prev || scansData[0]);

            } catch (error: any) {
                console.error('Failed to fetch data:', error);
                if (!cancelled) setLastError(error?.message || 'Failed to fetch dashboard data');
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [scansApiUrl, statsApiUrl]);

    useEffect(() => {
        function cleanup() {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (wsRef.current) {
                try { wsRef.current.close(); } catch { }
                wsRef.current = null;
            }
        }

        function connect() {
            cleanup();

            if (!wsUrl) {
                setWsStatus('DISCONNECTED');
                setLastError('Invalid API base URL (cannot derive WebSocket URL).');
                return;
            }

            setWsStatus('CONNECTING');

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => setWsStatus('CONNECTED');
            ws.onerror = () => setWsStatus('DISCONNECTED');
            ws.onclose = () => {
                setWsStatus('DISCONNECTED');
                reconnectTimerRef.current = window.setTimeout(connect, 1500);
            };

            ws.onmessage = (event) => {
                try {
                    const newScan: Scan = JSON.parse(event.data);
                    setScans((prev) => [newScan, ...prev.filter((s) => s.id !== newScan.id)].slice(0, 25));
                    setSelectedScan((prev) => prev || newScan);
                    setStats((prev) => ({
                        total: prev.total + 1,
                        threats: prev.threats + (newScan.risk === 'PHISHING' ? 1 : 0),
                        suspicious: prev.suspicious + (newScan.risk === 'SUSPICIOUS' ? 1 : 0)
                    }));
                } catch { }
            };
        }

        connect();
        return () => cleanup();
    }, [wsUrl]);

    // Chart data derived from selected scan or fallback
    const chartData = selectedScan ? [
        { name: 'Linguistic', score: selectedScan.layers.linguistic },
        { name: 'Visual', score: selectedScan.layers.visual },
        { name: 'Behavioral', score: selectedScan.layers.behavioral }
    ] : [];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 w-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">PhishGuard <span className="text-blue-500">AI</span></h1>
                            <p className="text-slate-400 text-sm">Real-time Threat Intelligence Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-700">
                            <div className={`w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : wsStatus === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium">Backend: {apiBase} ({wsStatus})</span>
                        </div>
                    </div>
                </header>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                        <div className="lg:col-span-2">
                            <div className="text-slate-300 text-sm font-semibold mb-2">API base URL</div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={apiInput}
                                    onChange={(e) => setApiInput(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-blue-500"
                                    placeholder="http://192.168.56.1:8000"
                                />
                                <button
                                    onClick={() => {
                                        const next = apiInput.trim() || DEFAULT_API_BASE;
                                        localStorage.setItem(LS_API_BASE_KEY, next);
                                        setApiBase(next);
                                        setApiInput(next);
                                    }}
                                    className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500"
                                >
                                    Save
                                </button>
                            </div>
                            {lastError ? <div className="mt-3 text-sm text-red-400">{lastError}</div> : null}
                        </div>
                        <div>
                            <div className="text-slate-300 text-sm font-semibold mb-2">Extension “Backend API URL”</div>
                            <div className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-xs break-all">
                                {extensionScanUrl}
                            </div>
                            <div className="mt-2 text-slate-500 text-xs">
                                Paste this into the extension popup to point the VM at the backend.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Total Scanned" value={stats.total} icon={<Globe className="w-5 h-5" />} color="blue" />
                    <StatCard title="Threats Blocked" value={stats.threats} icon={<Shield className="w-5 h-5" />} color="red" />
                    <StatCard title="Suspicious" value={stats.suspicious} icon={<AlertTriangle className="w-5 h-5" />} color="yellow" />
                    <StatCard title="Accuracy Rate" value="99.4%" icon={<Activity className="w-5 h-5" />} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Search className="w-5 h-5 text-blue-500" />
                                Live Scan Feed
                            </h2>
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {scans.map((scan) => (
                                        <motion.div
                                            key={scan.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => setSelectedScan(scan)}
                                            className={`group border rounded-xl p-4 transition-all cursor-pointer ${selectedScan?.id === scan.id
                                                ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className={`p-2 rounded-lg ${scan.risk === 'PHISHING' ? 'bg-red-500/10 text-red-500' :
                                                        scan.risk === 'SUSPICIOUS' ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        {scan.risk === 'PHISHING' ? <Shield className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="font-medium text-slate-200 truncate">{scan.url}</p>
                                                        <p className="text-xs text-slate-500">{scan.time} • Analyzed by Llama-3 AI</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className={`text-lg font-bold ${scan.risk === 'PHISHING' ? 'text-red-500' :
                                                            scan.risk === 'SUSPICIOUS' ? 'text-yellow-500' :
                                                                'text-emerald-500'
                                                            }`}>
                                                            {scan.score}%
                                                        </p>
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Risk Score</p>
                                                    </div>
                                                    <ChevronRight className={`w-5 h-5 transition-colors ${selectedScan?.id === scan.id ? 'text-blue-500' : 'text-slate-600 group-hover:text-slate-400'
                                                        }`} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Analytics & Charts */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                Threat Breakdown
                            </h2>
                            {selectedScan ? (
                                <>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                                <YAxis stroke="#64748b" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#cbd5e1' }}
                                                />
                                                <Bar dataKey="score">
                                                    {chartData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899'][index]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-400">Analysis for {selectedScan.risk}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedScan.score > 70 ? 'bg-red-500/10 text-red-500' :
                                                selectedScan.score > 40 ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {selectedScan.score > 70 ? 'HIGH RISK' : selectedScan.score > 40 ? 'MODERATE' : 'LOW RISK'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            Llama-3 AI identified pattern match with known phishing campaigns and URI anomalies consistent with active spoofing.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-500 italic text-sm">
                                    Select a scan to see detailed analysis
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
