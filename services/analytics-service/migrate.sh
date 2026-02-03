#!/bin/bash
# Migration script to add device tracking columns to analytics database
# Run this script to update your local or production database

echo "🔄 Running migration: Add device tracking columns..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  echo "Example: export DATABASE_URL='postgresql://user:pass@localhost:5432/qr_analytics'"
  exit 1
fi

# Run the migration
psql "$DATABASE_URL" -f drizzle/0002_add_device_tracking.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
  echo ""
  echo "The following columns were added to the 'scans' table:"
  echo "  - device_type (text) - mobile, tablet, desktop, etc."
  echo "  - os (text)          - iOS, Android, Windows, etc."
  echo "  - browser (text)     - Safari, Chrome, Firefox, etc."
  echo "  - ip (text)          - User's IP address"
  echo "  - user_agent (text)  - Raw User-Agent string"
  echo ""
  echo "Future QR scans will now capture device analytics! 🎉"
else
  echo "❌ Migration failed. Check the error above."
  exit 1
fi
