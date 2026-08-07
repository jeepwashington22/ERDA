import os
from pathlib import Path
import psycopg2

env = {}
for path in [Path('.env.local'), Path('.env')]:
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip().strip('"').strip("'")

conn = env.get('SUPABASE_POOL_URL') or env.get('DATABASE_URL') or env.get('POSTGRES_URL')
print('conn_configured', bool(conn))
if not conn:
    raise SystemExit('no connection string')

with psycopg2.connect(conn, sslmode='require', connect_timeout=10) as con:
    with con.cursor() as cur:
        cur.execute('select current_user, current_database(), version()')
        print(cur.fetchone())
