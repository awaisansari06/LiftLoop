from pathlib import Path
for root in ['src','supabase','tests']:
 for p in Path(root).rglob('*'):
  if not p.is_file() or p.suffix not in ['.ts','.tsx','.sql','.mjs']:continue
  b=p.read_bytes()
  try:b.decode('utf-8')
  except UnicodeDecodeError:
   s=b.decode('utf-8',errors='surrogateescape')
   s=''.join(bytes([ord(c)-0xdc00]).decode('cp1252') if 0xdc80<=ord(c)<=0xdcff else c for c in s)
   p.write_bytes(s.encode('utf-8'));print('Normalized UTF-8:',p)
