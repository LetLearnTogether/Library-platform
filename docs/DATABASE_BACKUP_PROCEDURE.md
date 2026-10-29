# Database Backup & Restore Procedure

## 1. Overview
To satisfy **SRS NFR-REL-01**, the LetLearnTogether MySQL database is configured for daily automated backups with a tested restore procedure.

## 2. Automated Daily Backup (Production VPS)
A cron job is configured on the Ubuntu VPS to run a backup script every day at 2:00 AM.

**Cron Job Configuration:**
```bash
0 2 * * * /path/to/scripts/backup_db.sh