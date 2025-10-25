from datetime import datetime, timedelta, timezone

# Start from UTC (timezone-aware)
utc_time = datetime.now(timezone.utc)

# Add 8 hours for GMT+8
local_time = utc_time + timedelta(hours=8)

watermark_text = local_time.strftime('%Y-%m-%d %H:%M')

print(watermark_text)


