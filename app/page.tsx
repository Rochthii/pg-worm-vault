'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, 
    RefreshCw, 
    AlertTriangle, 
    Database, 
    CheckCircle2, 
    Lock, 
    Trash2, 
    Terminal, 
    ExternalLink, 
    Key, 
    HelpCircle,
    Copy,
    Check
} from 'lucide-react';

interface WormBlock {
    index: number;
    id: string;
    tenant_id: string | null;
    user_email: string | null;
    action: string;
    table_name: string | null;
    record_id: string | null;
    severity: string;
    timestamp: string;
    prev_hash: string;
    hash: string;
}

interface VerificationResult {
    isValid: boolean;
    totalBlocks: number;
    tamperedBlockIndices: number[];
    mismatchedDbLogs: string[];
    lastSyncedIndex: number;
    lastSyncedAt: string | null;
    status: 'SECURE' | 'TAMPERED' | 'OUT_OF_SYNC';
}

export default function WormVaultExplorer() {
    const [ledger, setLedger] = useState<WormBlock[]>([]);
    const [audit, setAudit] = useState<VerificationResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
    
    // Form states for simulated tampering
    const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(2);
    const [tamperedAction, setTamperedAction] = useState<string>('deliberately_modified_critical_donation_log');
    
    // Copy tooltips
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // Fetch initial ledger and verification state
    const fetchStatus = async (showMsg = false) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/worm');
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
                setAudit(data.audit);
                if (showMsg) {
                    showBanner('Successfully fetched cryptographic ledger and verified chain integrity.', 'success');
                }
            } else {
                showBanner(data.error || 'Failed to fetch ledger.', 'error');
            }
        } catch (e: any) {
            showBanner(e.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const showBanner = (text: string, type: 'success' | 'error' | 'warning') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 6000);
    };

    // Execute Synchronize logs
    const handleSync = async () => {
        setActionLoading('sync');
        try {
            const res = await fetch('/api/worm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync' })
            });
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
                setAudit(data.audit);
                showBanner(data.message, 'success');
            } else {
                showBanner(data.error || 'Failed to synchronize.', 'error');
            }
        } catch (e: any) {
            showBanner(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Execute simulated tampering
    const handleTamper = async () => {
        if (!selectedBlockIndex || selectedBlockIndex <= 0 || selectedBlockIndex > ledger.length) {
            showBanner('Please select a valid block index to tamper.', 'error');
            return;
        }
        setActionLoading('tamper');
        try {
            const res = await fetch('/api/worm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'tamper',
                    blockIndex: selectedBlockIndex,
                    newActionValue: tamperedAction
                })
            });
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
                setAudit(data.audit);
                showBanner(data.message, 'warning');
            } else {
                showBanner(data.error || 'Failed to simulate tampering.', 'error');
            }
        } catch (e: any) {
            showBanner(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Execute Database and Ledger Reset
    const handleReset = async () => {
        if (!confirm('This will wipe all current audit logs, recreate the default seeds, and synchronize a fresh ledger chain. Proceed?')) {
            return;
        }
        setActionLoading('reset');
        try {
            const res = await fetch('/api/worm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset' })
            });
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
                setAudit(data.audit);
                showBanner(data.message, 'success');
            } else {
                showBanner(data.error || 'Failed to reset environment.', 'error');
            }
        } catch (e: any) {
            showBanner(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(id);
        setTimeout(() => setCopiedText(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-6 md:p-12 relative overflow-hidden">
            {/* Background grid & neon glow effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
            <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 glow-green">
                                <Shield className="h-7 w-7 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black font-outfit tracking-tight text-white flex items-center gap-2">
                                    PG-WORM-VAULT <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-normal">v1.0.0</span>
                                </h1>
                                <p className="text-xs text-slate-400 font-medium">Database-Enforced Immutability & Cryptographic Ledger Explorer</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button
                            onClick={() => fetchStatus(true)}
                            disabled={isLoading}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Audit Integrity
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={actionLoading !== null}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-950/40 border border-red-900/50 hover:bg-red-900/30 text-red-400 transition-all flex items-center gap-2"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Reset Lab
                        </button>
                    </div>
                </div>

                {/* Status Banner Message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`p-4 rounded-xl border flex items-start gap-3 shadow-xl ${
                                message.type === 'success' 
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                                    : message.type === 'error'
                                    ? 'bg-red-950/30 border-red-500/30 text-red-300'
                                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                            }`}
                        >
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm font-medium">{message.text}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Security Status Box */}
                    <div className="lg:col-span-1 glass-panel rounded-2xl p-6 glow-green relative overflow-hidden flex flex-col justify-between">
                        {audit?.status === 'TAMPERED' && (
                            <div className="absolute inset-0 bg-red-600/5 glow-red pointer-events-none" />
                        )}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security Vault Status</span>
                                <Database className="h-4 w-4 text-slate-500" />
                            </div>

                            <div className="space-y-2">
                                {isLoading ? (
                                    <div className="h-10 w-48 bg-slate-800 animate-pulse rounded-lg" />
                                ) : audit?.status === 'SECURE' ? (
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-emerald-500 animate-ping absolute" />
                                        <div className="h-4 w-4 rounded-full bg-emerald-500 relative" />
                                        <span className="text-3xl font-black font-outfit text-emerald-400 tracking-tight glow-green">
                                            🔒 SECURE
                                        </span>
                                    </div>
                                ) : audit?.status === 'TAMPERED' ? (
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-red-500 animate-ping absolute" />
                                        <div className="h-4 w-4 rounded-full bg-red-500 relative" />
                                        <span className="text-3xl font-black font-outfit text-red-500 tracking-tight glow-red animate-pulse">
                                            🚨 COMPROMISED
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-amber-500 animate-ping absolute" />
                                        <div className="h-4 w-4 rounded-full bg-amber-500 relative" />
                                        <span className="text-3xl font-black font-outfit text-amber-500 tracking-tight glow-amber">
                                            ⚠️ OUT OF SYNC
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    {audit?.status === 'SECURE' 
                                        ? 'Physical database and ledger are fully synchronized. Hashing integrity is completely intact.'
                                        : audit?.status === 'TAMPERED'
                                        ? 'ALERT: Disk logs or database tuples have been altered bypassing the database engine. Trust is broken.'
                                        : 'Database contains logs that are not yet committed to the immutable cryptographic ledger.'}
                                </p>
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-5 mt-6">
                            <div className="bg-slate-900/40 border border-slate-800/50 p-3.5 rounded-xl">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ledger Blocks</span>
                                <span className="text-2xl font-black font-outfit text-white">{ledger.length}</span>
                            </div>
                            <div className="bg-slate-900/40 border border-slate-800/50 p-3.5 rounded-xl">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Violations Count</span>
                                <span className={`text-2xl font-black font-outfit ${audit?.tamperedBlockIndices.length ? 'text-red-400' : 'text-slate-400'}`}>
                                    {audit?.tamperedBlockIndices.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Simulation Console Card */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security Simulation Console</span>
                                <Terminal className="h-4 w-4 text-slate-500" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                                <div className="space-y-3.5">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <ExternalLink className="h-4 w-4 text-emerald-400" />
                                        1. Synchronize Ledger
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                        Trigger event-driven ingestion. Scans active database tuples, computes crypto SHA-256 hash chaining, and locks them into immutable files.
                                    </p>
                                    <button
                                        onClick={handleSync}
                                        disabled={actionLoading !== null}
                                        className="w-full py-2.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-[#020617] transition-all flex items-center justify-center gap-2 glow-green disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${actionLoading === 'sync' ? 'animate-spin' : ''}`} />
                                        Trigger WORM Sync
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4 text-red-400" />
                                        2. Simulate Disk Tampering (Hack)
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                        Simulate an attacker accessing raw disk logs, modifying action payloads bypassing RLS database engines.
                                    </p>
                                    
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Block Index</label>
                                            <select
                                                value={selectedBlockIndex}
                                                onChange={(e) => setSelectedBlockIndex(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white focus:outline-none"
                                            >
                                                {ledger.map(b => (
                                                    <option key={b.index} value={b.index}>Block #{b.index}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-2/3">
                                            <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">New Injected Action</label>
                                            <input
                                                type="text"
                                                value={tamperedAction}
                                                onChange={(e) => setTamperedAction(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-900/50"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTamper}
                                        disabled={actionLoading !== null || ledger.length === 0}
                                        className="w-full py-2.5 text-xs font-semibold rounded-xl bg-red-950 border border-red-900/50 hover:bg-red-900/40 text-red-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Execute In-Disk Tampering
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Block Chain Explorer */}
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-black font-outfit text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-emerald-400" />
                                CRYPTOGRAPHIC LEDGER CHAIN EXPLORER
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">Verify blockchain linkage using real-time SHA-256 validation</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin" />
                        </div>
                    ) : ledger.length === 0 ? (
                        <div className="text-center py-16 space-y-4 bg-slate-950/20 rounded-xl border border-slate-800/50 border-dashed">
                            <Database className="h-12 w-12 text-slate-600 mx-auto" />
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-slate-300">WORM Ledger Empty</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Trigger log synchronization to ingestion Postgres audit logs and compute initial cryptographic blocks.
                                </p>
                            </div>
                            <button
                                onClick={handleSync}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
                            >
                                Ingest Baseline Seeds
                            </button>
                        </div>
                    ) : (
                        /* Horizontal scroll chain wrapper */
                        <div className="overflow-x-auto pb-4 pt-2 px-1 flex gap-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 scrollbar-thumb-rounded">
                            {ledger.map((block) => {
                                const isTampered = audit?.tamperedBlockIndices.includes(block.index);
                                return (
                                    <div key={block.index} className="flex items-center shrink-0">
                                        <div 
                                            className={`w-[320px] rounded-xl border p-5 relative overflow-hidden transition-all duration-300 ${
                                                isTampered 
                                                    ? 'bg-red-950/20 border-red-500/40 glow-red' 
                                                    : 'bg-slate-950/30 border-slate-800/80 hover:border-slate-700/80'
                                            }`}
                                        >
                                            {/* Block Header */}
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                        isTampered 
                                                            ? 'bg-red-950 border border-red-800 text-red-400' 
                                                            : 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                                                    }`}>
                                                        {isTampered ? '[TAMPERED]' : `BLOCK #${block.index}`}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {new Date(block.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            {/* Block Payloads */}
                                            <div className="space-y-2.5 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-medium">Actor:</span>
                                                    <span className="font-semibold text-slate-200 font-mono truncate max-w-[200px]" title={block.user_email || ''}>
                                                        {block.user_email || 'guest@anonymous'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 font-medium">Action:</span>
                                                    <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                                                        isTampered ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-slate-900/50 text-emerald-400'
                                                    }`}>
                                                        {block.action}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-medium">Severity:</span>
                                                    <span className={`font-bold capitalize ${
                                                        block.severity === 'critical' ? 'text-red-400' : block.severity === 'high' ? 'text-amber-400' : 'text-slate-300'
                                                    }`}>
                                                        {block.severity}
                                                    </span>
                                                </div>

                                                {/* Cryptographic Linkage */}
                                                <div className="border-t border-slate-800/80 pt-3 mt-3 space-y-2 font-mono text-[9px] leading-relaxed">
                                                    <div className="space-y-1 relative">
                                                        <div className="flex justify-between text-slate-500">
                                                            <span>PREV HASH:</span>
                                                            <button 
                                                                onClick={() => handleCopy(block.prev_hash, `p-${block.index}`)}
                                                                className="hover:text-emerald-400 transition"
                                                            >
                                                                {copiedText === `p-${block.index}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                            </button>
                                                        </div>
                                                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/60 text-slate-400 truncate max-w-full font-bold select-all">
                                                            {block.prev_hash}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 relative">
                                                        <div className="flex justify-between text-slate-500">
                                                            <span>BLOCK HASH:</span>
                                                            <button 
                                                                onClick={() => handleCopy(block.hash, `h-${block.index}`)}
                                                                className="hover:text-emerald-400 transition"
                                                            >
                                                                {copiedText === `h-${block.index}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                            </button>
                                                        </div>
                                                        <div className={`p-1.5 rounded border truncate max-w-full font-bold select-all ${
                                                            isTampered 
                                                                ? 'bg-red-950/40 border-red-900/50 text-red-400' 
                                                                : 'bg-slate-900/60 border-slate-800/60 text-emerald-400'
                                                        }`}>
                                                            {block.hash}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Link chain indicator arrow */}
                                        {block.index < ledger.length && (
                                            <div className="px-2 font-bold text-slate-700 select-none flex items-center">
                                                ──►
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
