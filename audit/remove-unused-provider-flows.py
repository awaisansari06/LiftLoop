from pathlib import Path
p=Path('src/screens/Login.tsx');s=p.read_text();a=s.index('  async function handleSendOtp()');b=s.index('  const meta =',a);s=s[:a]+s[b:];a=s.index('                {step === "choose" ? (');b=s.index('                ) : (',a);c=s.index('                <p className="mt-6',b);s=s[:a]+s[a:b].replace('{step === "choose" ? (','{(')+'                )}\n\n'+s[c:];p.write_text(s)
p=Path('src/lib/maps.ts');s=p.read_text();a=s.index('async function calculateRouteMappls(');b=s.index('async function calculateRouteORS(',a);s=s[:a]+s[b:];p.write_text(s)
