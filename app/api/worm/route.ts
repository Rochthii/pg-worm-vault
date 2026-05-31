import { NextResponse } from 'next/server';
import { syncAuditLogsToWorm, verifyWormLedgerIntegrity, loadWormLedger, saveWormLedger } from '@/src/worm-vault';
import { Client } from 'pg';

// API GET: Load blocks ledger and verify cryptographic integrity
export async function GET() {
  try {
      const ledger = await loadWormLedger();
      const auditResult = await verifyWormLedgerIntegrity();
      
      return NextResponse.json({
          success: true,
          ledger,
          audit: auditResult
      });
  } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// API POST: Actions (sync, tamper, reset)
export async function POST(request: Request) {
  try {
      const body = await request.json();
      const { action, blockIndex, newActionValue } = body;

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
          return NextResponse.json({ success: false, error: 'DATABASE_URL env variable is missing.' }, { status: 400 });
      }

      if (action === 'sync') {
          // 1. Sync DB to WORM ledger
          const syncResult = await syncAuditLogsToWorm();
          const auditResult = await verifyWormLedgerIntegrity();
          const ledger = await loadWormLedger();

          return NextResponse.json({
              success: true,
              message: `Synced ${syncResult.syncedCount} new audit logs. Ledger contains ${syncResult.totalBlocks} entries.`,
              ledger,
              audit: auditResult
          });
      }

      if (action === 'tamper') {
          // 2. Simulate disk tampering hack
          const ledger = await loadWormLedger();
          if (blockIndex <= 0 || blockIndex > ledger.length) {
              return NextResponse.json({ success: false, error: 'Invalid block index.' }, { status: 400 });
          }

          // Break the cryptographic chain by editing action without updating hash links
          ledger[blockIndex - 1].action = newActionValue || 'UNAUTHORIZED_ALTERATION_BYPASSING_DB_ENGINE';
          
          await saveWormLedger(ledger);
          const auditResult = await verifyWormLedgerIntegrity();

          return NextResponse.json({
              success: true,
              message: `DELIBERATELY HACKED Block #${blockIndex}. Cryptographic chain integrity is broken.`,
              ledger,
              audit: auditResult
          });
      }

      if (action === 'reset') {
          // 3. Reset database and ledger to initial clean state
          const client = new Client({ connectionString });
          await client.connect();

          try {
              // Clear database logs and insert fresh seeds
              await client.query('TRUNCATE TABLE public.audit_logs CASCADE');
              await client.query(`
                  INSERT INTO public.audit_logs (tenant_id, user_email, action, severity, ip_address) 
                  VALUES 
                  ('55555555-5555-5555-5555-555555555555', 'admin@phuly-temple.org', 'user_login', 'info', '192.168.1.10'),
                  ('55555555-5555-5555-5555-555555555555', 'admin@phuly-temple.org', 'update_billing', 'high', '192.168.1.10'),
                  ('55555555-5555-5555-5555-555555555555', 'attacker@threat-group.com', 'unauthorized_rls_bypass_attempt', 'critical', '198.51.100.42')
              `);

              // Clear ledger JSON on disk
              await saveWormLedger([]);

              // Sync fresh logs
              await syncAuditLogsToWorm();
              const auditResult = await verifyWormLedgerIntegrity();
              const ledger = await loadWormLedger();

              return NextResponse.json({
                  success: true,
                  message: 'Successfully reset database and cryptographically synchronized ledger to baseline state.',
                  ledger,
                  audit: auditResult
              });
          } finally {
              await client.end();
          }
      }

      return NextResponse.json({ success: false, error: 'Unsupported operational action.' }, { status: 400 });
  } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
