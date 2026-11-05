from pathlib import Path
p=Path('src/screens/CreateRide.tsx');s=p.read_text().replace('!!(from && to)', '!!(from?.name.trim() && to?.name.trim() && from.coords.every(Number.isFinite) && to.coords.every(Number.isFinite))');p.write_text(s)
p=Path('src/screens/ServiceDashboard.tsx');s=p.read_text().replace('      console.error("Delete failed", e);','      window.alert(e instanceof Error ? e.message : "Could not cancel ride. Please retry.");');p.write_text(s)
