# FinCopilot — Database Backup, Disaster Recovery & High Availability Guide

**Document Classification: System Administration & Operational Runbook**

---

## 1. Production Database Overview

FinCopilot utilizes **MongoDB Atlas** as its primary production persistence engine.

- **Primary Database**: MongoDB Atlas Dedicated/Serverless Tier
- **Database Name**: `fincopilot` (or configured via `MONGODB_URI`)
- **Core Collections**:
  1. `users`: Seeded and registered user identities, monthly salary dates, and simulated UPI PINs.
  2. `accounts`: Verified and live account balances, baseline timestamps, bank identities, and credit/debit aggregates.
  3. `transactions`: Complete double-entry simulated UPI ledgers with canonical categorization.
  4. `emis`: Scheduled loan installment records, remaining tenures, and cycle payment statuses.

---

## 2. Primary Backup Strategy (MongoDB Atlas Continuous Cloud Backup)

### 2.1 Automated Cloud Snapshots
- **Mechanism**: Native MongoDB Atlas Cloud Backup.
- **Snapshot Frequency**:
  - Continuous snapshot increments every 6 hours.
  - Daily retention: 7 days.
  - Weekly retention: 4 weeks.
  - Monthly retention: 12 months.
- **Point-in-Time Recovery (PITR)**: Available on M10+ dedicated Atlas clusters for second-level granular restoration up to 7 days in the past.

### 2.2 Restoration Workflow via Atlas Console
1. Navigate to **Atlas Dashboard** $\rightarrow$ **Clusters** $\rightarrow$ **Backup**.
2. Select target snapshot date/time or specific Point-in-Time checkpoint.
3. Choose **Restore to this cluster** (or provision a parallel staging cluster).
4. Monitor restore progress until cluster state transitions to `Active`.

---

## 3. Secondary Administrative Export & Backup Utility

In addition to native cloud snapshots, FinCopilot includes an administrative offline JSON snapshot utility for cold storage and migration.

### 3.1 Generating an Administrative Backup
To create an offline JSON snapshot of all collections:

```bash
# Run from project root with MONGODB_URI configured in environment
node backend/src/scripts/exportBackup.js
```

### 3.2 Output Artifact
The utility writes structured, timestamped JSON exports into `backend/backups/`:
```json
{
  "meta": {
    "timestamp": "2026-09-19T04:10:00.000Z",
    "version": "1.0.0",
    "system": "FinCopilot Backup System",
    "counts": {
      "users": 2,
      "accounts": 2,
      "transactions": 12,
      "emis": 2
    }
  },
  "data": {
    "users": [...],
    "accounts": [...],
    "transactions": [...],
    "emis": [...]
  }
}
```

---

## 4. Disaster Recovery & Emergency Procedures

### Scenario A: Primary Atlas Cluster Failure
1. **Diagnosis**: Check `/api/health` and serverless connection logs.
2. **Failover**: Update `MONGODB_URI` environment variable in Vercel to point to the secondary replica cluster.
3. **Re-deploy**: Trigger instant redeployment in Vercel.

### Scenario B: Accidental Demo Data Corruption
1. Open the FinCopilot web application as an administrator.
2. Click **Reset Demo** in the top navigation or execute `POST /api/account/reset`.
3. The database layer will atomically flush demo state and re-seed the standard baseline for Siddhartha (₹50,000) and Rahul (₹30,000).

---

## 5. Security & Data Isolation Policy
- **Credential Storage**: Connection strings (`MONGODB_URI`) must **never** be checked into version control. They are injected exclusively via Vercel Production Environment Variables or local `.env` files.
- **Data Isolation**: Account queries are partitioned strictly by `userId`.
