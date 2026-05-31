import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

export interface WormBlock {
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

export interface VerificationResult {
    isValid: boolean;
    totalBlocks: number;
    tamperedBlockIndices: number[];
    mismatchedDbLogs: string[]; // UUIDs of logs modified or missing in DB
    lastSyncedIndex: number;
    lastSyncedAt: string | null;
    status: 'SECURE' | 'TAMPERED' | 'OUT_OF_SYNC';
}

const FILE_NAME = 'immutable_ledger.json';
const VAULT_DIR = path.join(process.cwd(), 'storage', 'worm_vault');
const LEDGER_PATH = path.join(VAULT_DIR, FILE_NAME);
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Ensure local directory exists for vault storage
function ensureVaultDir() {
    try {
        if (!fs.existsSync(VAULT_DIR)) {
            fs.mkdirSync(VAULT_DIR, { recursive: true });
        }
    } catch {}
}

// Calculate block hash
export function calculateBlockHash(block: Omit<WormBlock, 'hash'>): string {
    const dataString = [
        block.index,
        block.id,
        block.tenant_id || 'null',
        block.user_email || 'null',
        block.action,
        block.table_name || 'null',
        block.record_id || 'null',
        block.severity || 'info',
        block.timestamp,
        block.prev_hash
    ].join('|');
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Load ledger from physical local storage
export async function loadWormLedger(): Promise<WormBlock[]> {
    try {
        ensureVaultDir();
        if (fs.existsSync(LEDGER_PATH)) {
            const fileContent = fs.readFileSync(LEDGER_PATH, 'utf-8');
            return JSON.parse(fileContent) as WormBlock[];
        }
    } catch (localErr) {
        console.error('[WORM Vault] Error reading local ledger fallback:', localErr);
    }
    return [];
}

// Write ledger to physical local storage with read-only restriction (0o444)
export async function saveWormLedger(ledger: WormBlock[]) {
    const ledgerJSON = JSON.stringify(ledger, null, 2);
    try {
        ensureVaultDir();
        if (fs.existsSync(LEDGER_PATH)) {
            try {
                fs.chmodSync(LEDGER_PATH, 0o666); // Make temporary writeable to overwrite
            } catch {}
        }
        
        fs.writeFileSync(LEDGER_PATH, ledgerJSON, 'utf-8');
        
        try {
            fs.chmodSync(LEDGER_PATH, 0o444); // Lockdown file as read-only physical protection
            console.log('[WORM Vault] Saved ledger to local storage and locked permissions to READ-ONLY (0o444)');
        } catch {}
    } catch (localErr: any) {
        console.error('[WORM Vault] Local write failed:', localErr.message);
    }
}

// Initialize Postgres Client
async function getDbClient(): Promise<Client> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    return client;
}

// Sync Postgres Audit Logs to WORM vault
export async function syncAuditLogsToWorm(): Promise<{ syncedCount: number; totalBlocks: number }> {
    const client = await getDbClient();
    const ledger = await loadWormLedger();
    
    try {
        // Fetch logs from DB sorted by created_at ascending
        const res = await client.query('SELECT * FROM public.audit_logs ORDER BY created_at ASC');
        const dbLogs = res.rows || [];
        
        let syncedCount = 0;
        const ledgerLogIds = new Set(ledger.map(b => b.id));
        
        for (const log of dbLogs) {
            if (!ledgerLogIds.has(log.id)) {
                const index = ledger.length + 1;
                const prev_hash = ledger.length > 0 ? ledger[ledger.length - 1].hash : GENESIS_HASH;
                
                const newBlock: Omit<WormBlock, 'hash'> = {
                    index,
                    id: log.id,
                    tenant_id: log.tenant_id,
                    user_email: log.user_email,
                    action: log.action,
                    table_name: log.table_name,
                    record_id: log.record_id,
                    severity: log.severity || 'info',
                    timestamp: new Date(log.created_at).toISOString(),
                    prev_hash
                };
                
                const hash = calculateBlockHash(newBlock);
                ledger.push({ ...newBlock, hash });
                syncedCount++;
            }
        }
        
        if (syncedCount > 0) {
            await saveWormLedger(ledger);
        }
        
        return {
            syncedCount,
            totalBlocks: ledger.length
        };
    } finally {
        await client.end();
    }
}

// Perform a cryptographically verified security audit on the logs
export async function verifyWormLedgerIntegrity(): Promise<VerificationResult> {
    const ledger = await loadWormLedger();
    const result: VerificationResult = {
        isValid: true,
        totalBlocks: ledger.length,
        tamperedBlockIndices: [],
        mismatchedDbLogs: [],
        lastSyncedIndex: ledger.length,
        lastSyncedAt: ledger.length > 0 ? ledger[ledger.length - 1].timestamp : null,
        status: 'SECURE'
    };
    
    // 1. Verify cryptographic hash chain inside the ledger
    let expectedPrevHash = GENESIS_HASH;
    for (let i = 0; i < ledger.length; i++) {
        const block = ledger[i];
        
        // Check hash chain linkage
        if (block.prev_hash !== expectedPrevHash) {
            result.isValid = false;
            result.tamperedBlockIndices.push(block.index);
        }
        
        // Re-compute and verify the block hash
        const computedHash = calculateBlockHash({
            index: block.index,
            id: block.id,
            tenant_id: block.tenant_id,
            user_email: block.user_email,
            action: block.action,
            table_name: block.table_name,
            record_id: block.record_id,
            severity: block.severity,
            timestamp: block.timestamp,
            prev_hash: block.prev_hash
        });
        
        if (block.hash !== computedHash) {
            result.isValid = false;
            if (!result.tamperedBlockIndices.includes(block.index)) {
                result.tamperedBlockIndices.push(block.index);
            }
        }
        
        expectedPrevHash = block.hash;
    }
    
    // 2. Cross-verify against active Database audit logs
    const client = await getDbClient();
    try {
        const res = await client.query('SELECT id, tenant_id, user_email, action, table_name, record_id, severity, created_at FROM public.audit_logs ORDER BY created_at ASC');
        const dbLogs = res.rows || [];
        
        const dbLogsMap = new Map<string, any>(dbLogs.map((l: any) => [l.id, l]));
        
        for (const block of ledger) {
            const dbLog = dbLogsMap.get(block.id);
            
            if (!dbLog) {
                // Log was deleted from DB (Bypassed triggers!)
                result.isValid = false;
                result.mismatchedDbLogs.push(block.id);
                continue;
            }
            
            // Verify database fields match what is written inside immutable WORM block
            const fieldsMatch = 
                dbLog.action === block.action &&
                (dbLog.tenant_id || null) === (block.tenant_id || null) &&
                (dbLog.user_email || null) === (block.user_email || null) &&
                (dbLog.table_name || null) === (block.table_name || null) &&
                (dbLog.record_id || null) === (block.record_id || null) &&
                (dbLog.severity || 'info') === (block.severity || 'info');
                
            if (!fieldsMatch) {
                // Log fields were modified in Database (Bypassed triggers!)
                result.isValid = false;
                result.mismatchedDbLogs.push(block.id);
            }
        }
        
        // Determine overall status
        if (!result.isValid) {
            result.status = 'TAMPERED';
        } else {
            const dbLogIds = new Set<string>(dbLogs.map((l: any) => l.id));
            const ledgerLogIds = new Set<string>(ledger.map(b => b.id));
            
            // Check if DB has new logs that are not synced yet
            const hasUnsynced = Array.from(dbLogIds).some((id: string) => !ledgerLogIds.has(id));
            if (hasUnsynced) {
                result.status = 'OUT_OF_SYNC';
            } else {
                result.status = 'SECURE';
            }
        }
    } finally {
        await client.end();
    }
    
    return result;
}
