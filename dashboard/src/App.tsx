import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Search, 
  Globe, 
  ChevronRight,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShieldCheck,
  History,
  Zap,
  Lock,
  ExternalLink,
  Cpu
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Layers {
    linguistic: number;
    linguistic_details?: string;
    visual: number;
    visual_details?: string;
    behavioral: number;
    behavioral_details?: string;
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
    try {
        const u = new URL(apiBase);
        const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${u.host}/ws/scans`;
    } catch {
        // Fallback for relative or malformed URLs
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        return `${proto}//${host}:8000/ws/scans`;
    }
}

function getApiBaseFromStorage() {
    const saved = localStorage.getItem(LS_API_BASE_KEY);
    if (saved?.trim()) return saved.trim();

    // Default discovery: use the current window host at port 8000
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
}

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: 'blue' | 'red' | 'yellow' | 'emerald'
}> = ({ title, value, icon, trend, color }) => {
    const colorMap = {
        blue: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
        red: 'from-red-500/10 to-transparent border-red-500/20 text-red-400',
        yellow: 'from-yellow-500/10 to-transparent border-yellow-500/20 text-yellow-400',
        emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400'
    };

    return (
        <div className={`relative overflow-hidden bg-slate-900/50 backdrop-blur-md border rounded-2xl p-5 transition-all hover:scale-[1.02] hover:bg-slate-900/80 ${colorMap[color]}`}>
            <div className="absolute top-0 right-0 p-3 opacity-10">
                {React.cloneElement(icon as React.ReactElement, { size: 48 })}
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl bg-slate-950/50 border border-white/5 ${colorMap[color]}`}>
                    {icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
            </div>
            <div className="flex items-end justify-between">
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                {trend && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 ${colorMap[color]}`}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [apiBase, setApiBase] = useState<string>(() => getApiBaseFromStorage());
    const [apiInput, setApiInput] = useState<string>(() => getApiBaseFromStorage());
    const [wsStatus, setWsStatus] = useState<WsStatus>('DISCONNECTED');
    const [lastError, setLastError] = useState<string>('');
    const [activeTab, setActiveTab] = useState('overview');

    const [scans, setScans] = useState<Scan[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, threats: 0, suspicious: 0 });
    const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);

    const scansApiUrl = useMemo(() => `${apiBase.replace(/\/$/, '')}/api/v1/scans`, [apiBase]);
    const statsApiUrl = useMemo(() => `${apiBase.replace(/\/$/, '')}/api/v1/stats`, [apiBase]);
    const wsUrl = useMemo(() => getWsUrl(apiBase), [apiBase]);

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLastError('');
                const [scansRes, statsRes] = await Promise.all([
                    fetch(`${scansApiUrl}?limit=50`),
                    fetch(statsApiUrl)
                ]);

                if (!scansRes.ok) throw new Error(`Scans API Offline`);
                const scansData = await scansRes.json();
                
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    if (!cancelled) setStats(statsData);
                }

                if (!cancelled) {
                    setScans(scansData);
                    if (scansData.length > 0) setSelectedScan((prev) => prev || scansData[0]);
                }
            } catch (error: any) {
                if (!cancelled) setLastError(error?.message || 'Connection failed');
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [scansApiUrl, statsApiUrl]);

    useEffect(() => {
        function cleanup() {
            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) { try { wsRef.current.close(); } catch { } }
        }

        function connect() {
            cleanup();
            if (!wsUrl) return;
            setWsStatus('CONNECTING');
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onopen = () => setWsStatus('CONNECTED');
            ws.onclose = () => {
                setWsStatus('DISCONNECTED');
                reconnectTimerRef.current = window.setTimeout(connect, 3000);
            };
            ws.onmessage = (event) => {
                try {
                    const newScan: Scan = JSON.parse(event.data);
                    setScans((prev) => [newScan, ...prev.filter((s) => s.id !== newScan.id)].slice(0, 50));
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

    const chartData = selectedScan ? [
        { name: 'LING', score: selectedScan.layers.linguistic },
        { name: 'VISUAL', score: selectedScan.layers.visual },
        { name: 'BEHAV', score: selectedScan.layers.behavioral }
    ] : [];

    return (
        <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl hidden lg:flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/40">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">PhishGuard <span className="text-blue-500">PRO</span></h1>
                    </div>
                    
                    <nav className="space-y-1">
                        {[
                            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                            { id: 'scans', icon: History, label: 'Scan History' },
                            { id: 'security', icon: ShieldCheck, label: 'Security' },
                            { id: 'settings', icon: SettingsIcon, label: 'Settings' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
                            >
                                <item.icon size={18} />
                                <span className="text-sm font-semibold">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-800/50">
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">System Engine</span>
                        </div>
                        <p className="text-xs font-medium text-slate-300">Llama-3.3 Vision</p>
                        <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-3/4 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
                        <div className="h-4 w-[1px] bg-slate-800"></div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">{wsStatus}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400">{apiBase}</span>
                            <span className="text-[10px] text-slate-600 font-mono">NODE_HACKATHON_01</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white/10 shadow-lg shadow-blue-500/20">
                            RA
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard title="Global Analysis" value={stats.total} icon={<Globe className="w-5 h-5" />} trend="+12.5%" color="blue" />
                                <StatCard title="Neutralized" value={stats.threats} icon={<Lock className="w-5 h-5" />} trend="Critical" color="red" />
                                <StatCard title="Suspicious" value={stats.suspicious} icon={<AlertTriangle className="w-5 h-5" />} trend="Warning" color="yellow" />
                                <StatCard title="Neural Confidence" value="99.8%" icon={<Zap className="w-5 h-5" />} trend="Optimal" color="emerald" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Feed */}
                                <div className="lg:col-span-7 space-y-6">
                                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-6 backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-xl font-bold flex items-center gap-3">
                                                <Search className="w-5 h-5 text-blue-500" />
                                                Live Intercepts
                                            </h3>
                                            <button className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest">Refresh logs</button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {scans.length === 0 ? (
                                                    <div className="py-20 text-center text-slate-500 italic">Listening for incoming threats...</div>
                                                ) : scans.slice(0, 10).map((scan) => (
                                                    <motion.div
                                                        key={scan.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onClick={() => setSelectedScan(scan)}
                                                        className={`group relative overflow-hidden p-4 rounded-2xl transition-all cursor-pointer border ${selectedScan?.id === scan.id
                                                            ? 'bg-blue-600/10 border-blue-500/50'
                                                            : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-700 hover:bg-slate-950/60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-4 min-w-0">
                                                                <div className={`p-2.5 rounded-xl ${scan.risk === 'PHISHING' ? 'bg-red-500/10 text-red-500' :
                                                                    scan.risk === 'SUSPICIOUS' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                        'bg-emerald-500/10 text-emerald-500'
                                                                    }`}>
                                                                    {scan.risk === 'PHISHING' ? <Shield size={20} /> : <ShieldCheck size={20} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-sm text-slate-100 truncate">{scan.url}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter">{scan.time}</span>
                                                                        <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                                        <span className="text-[10px] font-bold text-blue-500/70 uppercase">Heuristic Analysis</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 shrink-0">
                                                                <div className="text-right">
                                                                    <p className={`text-lg font-black tracking-tighter ${scan.risk === 'PHISHING' ? 'text-red-500' :
                                                                        scan.risk === 'SUSPICIOUS' ? 'text-yellow-400' :
                                                                            'text-emerald-400'
                                                                        }`}>
                                                                        {scan.score.toFixed(1)}%
                                                                    </p>
                                                                </div>
                                                                <ChevronRight size={16} className={`transition-transform ${selectedScan?.id === scan.id ? 'text-blue-500 rotate-90' : 'text-slate-700'}`} />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Analysis Panel */}
                                <div className="lg:col-span-5 space-y-6">
                                    <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 backdrop-blur-md sticky top-24">
                                        <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                                            <Activity className="w-5 h-5 text-blue-500" />
                                            Forensic Details
                                        </h3>

                                        {selectedScan ? (
                                            <div className="space-y-8">
                                                <div className="h-56 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chartData}>
                                                            <defs>
                                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                            <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                                            <YAxis hide domain={[0, 100]} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                                                            />
                                                            <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Risk Level</span>
                                                            <span className={`text-sm font-black ${selectedScan.risk === 'PHISHING' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                {selectedScan.risk} DETECTED
                                                            </span>
                                                        </div>
                                                        <a href={selectedScan.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                            <ExternalLink size={14} className="text-slate-400" />
                                                        </a>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { key: 'Ling', val: selectedScan.layers.linguistic },
                                                            { key: 'Vis', val: selectedScan.layers.visual },
                                                            { key: 'Beh', val: selectedScan.layers.behavioral }
                                                        ].map((layer) => (
                                                            <div key={layer.key} className="bg-slate-950/30 border border-slate-800/50 p-3 rounded-xl text-center">
                                                                <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">{layer.key}</span>
                                                                <span className={`text-xs font-bold ${layer.val > 70 ? 'text-red-500' : layer.val > 30 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                                                    {layer.val}%
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Zap size={14} className="text-blue-500" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Forensic Briefing</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {[
                                                                { score: selectedScan.layers.linguistic, details: selectedScan.layers.linguistic_details },
                                                                { score: selectedScan.layers.visual, details: selectedScan.layers.visual_details },
                                                                { score: selectedScan.layers.behavioral, details: selectedScan.layers.behavioral_details }
                                                            ].map((layer, lIdx) => (
                                                                (layer.score > 0 || (layer.details && layer.details.length > 0)) && (
                                                                    (layer.details || "").split('|').map((finding, fIdx) => (
                                                                        finding.trim().length > 0 && (
                                                                            <div key={`${lIdx}-${fIdx}`} className="flex items-start gap-2">
                                                                                <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${layer.score > 70 ? 'bg-red-500' : layer.score > 30 ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                                                                <p className="text-[11px] leading-relaxed text-slate-300 italic">
                                                                                    {finding.trim()}
                                                                                </p>
                                                                            </div>
                                                                        )
                                                                    ))
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4">
                                                <div className="p-4 rounded-full bg-slate-950/50 border border-slate-800/50">
                                                    <Activity size={32} />
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-widest">Select intercept to analyze</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'scans' && (
                        <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <History className="w-6 h-6 text-blue-500" />
                                    Forensic Scan History
                                </h3>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search by URL or Threat Level..." 
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-y-3">
                                    <thead>
                                        <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <th className="px-6 py-2">ID</th>
                                            <th className="px-6 py-2">Target URL</th>
                                            <th className="px-6 py-2">Risk Level</th>
                                            <th className="px-6 py-2">Risk Score</th>
                                            <th className="px-6 py-2">Timestamp</th>
                                            <th className="px-6 py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-4">
                                        {scans.map((scan) => (
                                            <tr key={scan.id} className="bg-slate-950/40 hover:bg-slate-900/50 border border-slate-800/50 transition-all group">
                                                <td className="px-6 py-4 rounded-l-2xl text-xs font-mono text-slate-500">#{scan.id}</td>
                                                <td className="px-6 py-4 max-w-xs truncate font-semibold text-sm text-slate-200">{scan.url}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                                                        scan.risk === 'PHISHING' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        scan.risk === 'SUSPICIOUS' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                        {scan.risk}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${
                                                                scan.score > 70 ? 'bg-red-500' : scan.score > 30 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                            }`} style={{ width: `${scan.score}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold font-mono">{scan.score.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">{scan.time}</td>
                                                <td className="px-6 py-4 rounded-r-2xl">
                                                    <button onClick={() => { setSelectedScan(scan); setActiveTab('overview'); }} className="text-blue-500 hover:text-blue-400 transition-colors">
                                                        <Search size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-sm">
                                    <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                                        <Zap className="w-6 h-6 text-yellow-500" />
                                        Threat Intelligence Center
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Top Targeted Brands</h4>
                                            <div className="space-y-4">
                                                {[
                                                    { name: 'PayPal Inc.', hits: 124, color: 'bg-blue-500' },
                                                    { name: 'Google Cloud', hits: 89, color: 'bg-emerald-500' },
                                                    { name: 'Microsoft Office', hits: 76, color: 'bg-orange-500' },
                                                    { name: 'Generic Webmail', hits: 45, color: 'bg-slate-500' }
                                                ].map((brand) => (
                                                    <div key={brand.name} className="space-y-1">
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span>{brand.name}</span>
                                                            <span className="text-slate-500">{brand.hits} attempts</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full ${brand.color}`} style={{ width: `${(brand.hits / 150) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Common Malicious TLDs</h4>
                                            <div className="space-y-4">
                                                {[
                                                    { name: '.xyz', risk: '92%' },
                                                    { name: '.top', risk: '88%' },
                                                    { name: '.work', risk: '84%' },
                                                    { name: '.tk', risk: '79%' }
                                                ].map((tld) => (
                                                    <div key={tld.name} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                                        <span className="font-mono text-sm font-bold">{tld.name}</span>
                                                        <span className="text-xs font-bold text-red-500">{tld.risk} Malicious</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20">
                                    <ShieldCheck className="w-12 h-12 mb-6 opacity-80" />
                                    <h3 className="text-2xl font-bold mb-4">Security Posture: Optimal</h3>
                                    <p className="text-blue-100 text-sm leading-relaxed mb-6">
                                        Our neural engine is currently monitoring browser traffic in real-time. No critical vulnerabilities detected in the active VM environment.
                                    </p>
                                    <ul className="space-y-3 text-xs font-bold">
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-200" /> Layer 1: Linguistic AI Active</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-200" /> Layer 2: Visual Forensic Active</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-200" /> Layer 3: Behavioral Heuristic Active</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-sm">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                                <SettingsIcon className="w-6 h-6 text-slate-400" />
                                System Configuration
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Backend Gateway URL</label>
                                    <div className="flex gap-3">
                                        <input
                                            value={apiInput}
                                            onChange={(e) => setApiInput(e.target.value)}
                                            className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                const next = apiInput.trim() || DEFAULT_API_BASE;
                                                localStorage.setItem(LS_API_BASE_KEY, next);
                                                setApiBase(next);
                                                setApiInput(next);
                                            }}
                                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-800/50">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Threat Detection Sensitivity</label>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                                            <div>
                                                <p className="text-sm font-bold">Aggressive Blocking</p>
                                                <p className="text-[10px] text-slate-500">Flags low-certainty suspicious sites.</p>
                                            </div>
                                            <div className="w-10 h-6 bg-blue-600 rounded-full relative">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                                            <div>
                                                <p className="text-sm font-bold">Visual Comparison</p>
                                                <p className="text-[10px] text-slate-500">Enable perceptual hashing for brand clones.</p>
                                            </div>
                                            <div className="w-10 h-6 bg-blue-600 rounded-full relative">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
