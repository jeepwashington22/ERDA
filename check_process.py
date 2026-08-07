import psutil
for proc in psutil.process_iter(['pid','name','cmdline']):
    if proc.info.get('name') == 'python' and proc.info.get('cmdline'):
        cmd = ' '.join(proc.info.get('cmdline') or [])
        if 'migrate_xlsx_to_supabase.py' in cmd:
            print(proc.info['pid'], cmd)
