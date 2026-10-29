#!/bin/bash
# LetLearnTogether Database Backup Script
# This script is designed to run on the Ubuntu VPS via a Cron Job.

# Define variables
DB_USER="root"
DB_PASS="your_secure_password" # Change this to the actual VPS MySQL password
DB_NAME="letlearn_db"
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/letlearn_db_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Dump the database
echo "Starting backup for $DB_NAME..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Compress the backup to save space
gzip $BACKUP_FILE
echo "Backup compressed: $BACKUP_FILE.gz"

# Delete backups older than 7 days to save server space
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up."

echo "Backup process completed successfully!"