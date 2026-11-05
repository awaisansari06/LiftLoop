const { execSync } = require('child_process');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

for (const line of lines) {
  if (!line.trim() || line.startsWith('#')) continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) continue;
  const key = line.substring(0, eqIdx).trim();
  const value = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  if (!key) continue;
  // No longer skipping VITE_SUPABASE_URL — all env vars are synced
  
  console.log(`\n--- Adding ${key} ---`);
  fs.writeFileSync('temp_val.txt', value, 'utf8');
  
  try {
    execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
  } catch(e) {}
  
  try {
    execSync(`npx vercel env add ${key} production < temp_val.txt`, { stdio: 'inherit', shell: true });
    console.log(`Success adding ${key}`);
  } catch (e) {
    console.error(`Failed to add ${key}`);
  }
}
try { fs.unlinkSync('temp_val.txt'); } catch(e){}
console.log('Done mapping env vars.');

