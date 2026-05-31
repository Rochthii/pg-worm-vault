import { syncAuditLogsToWorm, verifyWormLedgerIntegrity, loadWormLedger, saveWormLedger } from './worm-vault';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function runDemo() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ ERROR: Please configure DATABASE_URL inside a .env file.');
        process.exit(1);
    }

    console.log('============================================================');
    console.log('🛡️ WORM VAULT CRYPTOGRAPHIC INTEGRITY PLAYGROUND');
    console.log('============================================================\n');

    const client = new Client({ connectionString });
    await client.connect();

    try {
        // 1. Clean and insert fresh mock audit logs for verification demo
        console.log('[Step 1] Initializing fresh audit logs in database...');
        await client.query('TRUNCATE TABLE public.audit_logs CASCADE');
        
        await client.query(`
            INSERT INTO public.audit_logs (tenant_id, user_email, action, severity, ip_address) 
            VALUES 
            ('55555555-5555-5555-5555-555555555555', 'admin@organization.com', 'user_login', 'info', '192.168.1.10'),
            ('55555555-5555-5555-5555-555555555555', 'admin@organization.com', 'update_billing', 'high', '192.168.1.10'),
            ('55555555-5555-5555-5555-555555555555', 'attacker@evil.com', 'unauthorized_rls_bypass_attempt', 'critical', '198.51.100.42')
        `);
        console.log('✅ Generated 3 security operational logs in database.\n');

        // 2. Perform SHA-256 Chaining Synchronization
        console.log('[Step 2] Synchronizing logs to cryptographic ledger...');
        const syncRes = await syncAuditLogsToWorm();
        console.log(`✅ Synced ${syncRes.syncedCount} blocks. Ledger contains ${syncRes.totalBlocks} cryptographically chained entries.\n`);

        // 3. Verify System Integrity (Secure State)
        console.log('[Step 3] Running integrity verification audit on untouched ledger...');
        const initialAudit = await verifyWormLedgerIntegrity();
        console.log(`🔒 Verification Status: [${initialAudit.status}]`);
        console.log(`   Is Valid Ledger Chain: ${initialAudit.isValid}`);
        console.log(`   Tampered Block Count : ${initialAudit.tamperedBlockIndices.length}\n`);

        // 4. Simulate Database Tampering Hack (Bypassing database triggers)
        console.log('[Step 4] SIMULATING MALICIOUS LEDGER TAMPERING (HACK)...');
        console.log('         (Altering block action content inside local storage JSON directly...)');
        
        const ledger = await loadWormLedger();
        if (ledger.length >= 2) {
            // Deliberately modify action in Block index 2 without recalculating hash links
            ledger[1].action = 'maliciously_injected_action_bypassing_database';
            await saveWormLedger(ledger);
            console.log('⚠️ Ledger file modified on disk directly.');
        } else {
            console.log('❌ Error: Ledger has insufficient blocks.');
        }
        console.log('');

        // 5. Detect and Contain Hack (Broken State)
        console.log('[Step 5] Running secondary integrity verification audit after hack...');
        const postAudit = await verifyWormLedgerIntegrity();
        console.log(`🚨 Verification Status: [${postAudit.status}]`);
        console.log(`   Is Valid Ledger Chain: ${postAudit.isValid}`);
        console.log(`   Detected Tampered Block Indices:`, postAudit.tamperedBlockIndices);
        console.log(`   Detected Mismatched Db UUIDs   :`, postAudit.mismatchedDbLogs);
        console.log('\n============================================================');
        console.log('💡 VERIFICATION EFFICACY RESULT:');
        if (!postAudit.isValid && postAudit.status === 'TAMPERED') {
            console.log('✅ SUCCESS: System successfully detected cryptographic chain breakage!');
            console.log('   The cryptographic ledger is robust against log tampering.');
        } else {
            console.log('❌ FAILURE: Tamper attempts were not caught.');
        }
        console.log('============================================================');

    } finally {
        await client.end();
    }
}

runDemo().catch(console.error);
