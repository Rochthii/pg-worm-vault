# pg-worm-vault
> **Enterprise-Grade Database Immutability (WORM) & Cryptographic Ledger for PostgreSQL**  
> *Compliant with ISO/IEC 27017 CLD.12.4.1 (Audit Logging Standards)*

`pg-worm-vault` is an open-source, dual-layer security utility designed to prevent log manipulation, delete attempts, and privilege escalation vulnerabilities on transactional audit logs. It guarantees non-repudiation and cryptographic auditability by wrapping database triggers with a SHA-256 blockchain-style hash chain.

---

## 🔒 Defense Architecture

The framework operates on a **Dual-Layer Security Model**:

```
[ Application / Administrative Client ]
       │
       ├── (Attempts UPDATE / DELETE) ──► [ Layer 1: PostgreSQL Trigger Function ]
       │                                       │ (REJECTS 100% of modifications)
       │                                       └──► Exception: COMPLIANCE VIOLATION
       │
       └── (Performs INSERT actions)  ──► [ public.audit_logs Table ]
                                               │
                                               ▼
                                  [ Layer 2: Node.js Cryptographic Ledger ]
                                       ├── Load current ledger state
                                       ├── Generate SHA-256 Hash Linkage
                                       │   (Hash_n = SHA256(Block_n + Hash_n-1))
                                       └── Perform dynamic cross-validation
```

1.  **Layer 1 (Database Hardening):** Implements physical **WORM (Write Once, Read Many)** immutability using a PostgreSQL trigger that blocks all `UPDATE` and `DELETE` queries on the logs table, regardless of the role (even superuser accounts are blocked).
2.  **Layer 2 (Cryptographic Chaining):** Extracts logs using a SHA-256 blockchain-style algorithm. Each log entry is cryptographically linked to the previous state. Any external raw database tampering (bypassing database engines) instantly breaks the hash chain, enabling automatic detection.

---

## 🚀 Installation & Setup

### 1. Database Setup
Execute the SQL scripts found in `database/audit_trigger.sql` inside your PostgreSQL database to provision the WORM-enforced table:

```bash
psql -U your_user -d your_db -f database/audit_trigger.sql
```

### 2. Package Installation
Clone the repository and install the dependencies:

```bash
npm install
```

Configure your environment variables inside a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/your_database
```

---

## 💻 Usage

```typescript
import { syncAuditLogsToWorm, verifyWormLedgerIntegrity } from 'pg-worm-vault';

async function runSecurityAudit() {
    // 1. Sync database logs to the WORM cryptographic vault
    console.log('Initiating cryptographic log synchronization...');
    const syncResult = await syncAuditLogsToWorm();
    console.log(`Successfully synced ${syncResult.syncedCount} new blocks. Total ledger blocks: ${syncResult.totalBlocks}`);

    // 2. Perform dynamic validation checks
    console.log('Running active integrity audits...');
    const auditResult = await verifyWormLedgerIntegrity();
    console.log('Audit Result:', auditResult);
    
    if (auditResult.status === 'SECURE') {
        console.log('✅ System Ledger is completely SECURE. No anomalies detected.');
    } else if (auditResult.status === 'TAMPERED') {
        console.error('❌ ALERT: Cryptographic ledger has been TAMPERED with!');
        console.error('Mismatched blocks:', auditResult.tamperedBlockIndices);
        console.error('Violated DB UUIDs:', auditResult.mismatchedDbLogs);
    }
}

runSecurityAudit().catch(console.error);
```

---

## 📊 ISO/IEC 27017 Compliance Matrix
*   **CLD.12.4.1 (Audit logging):** Log files are protected against unauthorized modification or deletion. Implemented via PostgreSQL rule/trigger engine.
*   **Non-Repudiation:** Cryptographic hashing prevents retrospectively rewriting administrative history, ensuring absolute audit track tracing.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
