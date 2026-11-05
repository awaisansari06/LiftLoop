from pathlib import Path
p=Path('src/lib/api.ts');s=p.read_text();s="import {resolveStoredFiles} from './storage';\n"+s;s=s.replace('return data || [];','return await resolveStoredFiles(data || []);').replace('  return data;','  return await resolveStoredFiles(data);');p.write_text(s)
p=Path('src/hooks/useStore.ts');s=p.read_text();s="import {resolveStoredFiles} from '../lib/storage';\n"+s;s=s.replace('set({ user: profile, loading: false });','set({ user: await resolveStoredFiles(profile), loading: false });');p.write_text(s)
p=Path('src/lib/maps.ts');s=p.read_text();a=s.index('  // Try Mappls routing first');b=s.index('  const result = await calculateRouteORS',a);s=s[:a]+'  // ORS is the configured routing backend; Mappls supplies the map display.\n'+s[b:];p.write_text(s)
