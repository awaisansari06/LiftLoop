from pathlib import Path
p=Path('src/screens/AdminPanel.tsx');s=p.read_text(encoding='utf-8');s='import {realtimeTopic} from "@/lib/realtime-topic";\n'+s
for name in ['admin-sos','admin-support','admin-reports','admin-verif']:
 s=s.replace(".channel('"+name+"')", ".channel(realtimeTopic('overview-"+name+"'))")
s=s.replace('.channel("admin-support")','.channel(realtimeTopic("admin-support-inbox"))');p.write_text(s,encoding='utf-8')
