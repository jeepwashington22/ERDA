import psycopg2
from pathlib import Path

env = {}
for path in [Path('.env.local'), Path('.env')]:
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip().strip('"').strip("'")

conn = env.get('SUPABASE_POOL_URL') or env.get('DATABASE_URL') or env.get('POSTGRES_URL')
with psycopg2.connect(conn, sslmode='require', connect_timeout=10) as con:
    with con.cursor() as cur:
        cur.execute('select count(*) from students')
        print('students', cur.fetchone()[0])
        cur.execute('select count(*) from enrollment_records')
        print('enrollments', cur.fetchone()[0])
