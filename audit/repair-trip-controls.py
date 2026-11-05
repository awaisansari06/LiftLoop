from pathlib import Path
p=Path('src/screens/ServiceDashboard.tsx');s=p.read_text(encoding='utf-8');s=s.replace('const [deletingRide, setDeletingRide]', 'const [changingRide, setChangingRide] = useState<string | null>(null);\n  const [deletingRide, setDeletingRide]');needle='<span className="font-mono text-lg font-bold text-foreground">₹{ride.price_per_seat}</span>';assert needle in s;s=s.replace(needle,needle+'''
                        <Button size="sm" loading={changingRide===ride.id} disabled={changingRide!==null} onClick={async () => {
                          if(ride.status==='in_progress' && !window.confirm('Finish this ride and mark its confirmed bookings completed?'))return;
                          setChangingRide(ride.id);
                          try {await updateRide(ride.id,{status:ride.status==='active'?'in_progress':'completed'});await loadDashboard();if(ride.status==='active')navigate(`/tracking/${ride.id}`);}
                          catch(error){window.alert(error instanceof Error?error.message:'Could not update ride');}
                          finally{setChangingRide(null);}
                        }}>{ride.status==='active'?'Start ride':'Finish ride'}</Button>''');s=s.replace('className="flex items-center gap-2">\n                        <span className="font-mono', 'className="flex flex-wrap items-center justify-end gap-2">\n                        <span className="font-mono');# Add contact for every booking, including confirmed.
needle='{b.status === "pending" && ('
if needle in s:s=s.replace(needle,'''<Link to={`/chat/${b.ride_id}`} className={buttonVariants({variant:"secondary",size:"sm"})}>Message passengers</Link>
                    '''+needle)
p.write_text(s,encoding='utf-8')
p=Path('src/hooks/useRealtime.ts');s=p.read_text(encoding='utf-8');a=s.index('export function useRealtimeLocation');b=s.index('export function useRealtimeMessages',a);s=s[:a]+'''export function useRealtimeLocation(rideId: string) {
  const [location, setLocation] = useState<{lat:number;lng:number;speed:number;updatedAt:string}|null>(null);
  useEffect(() => {
    let cancelled=false;
    setLocation(null);
    if(!rideId)return;
    const receive=(row:any)=>{
      if(cancelled || !row?.location || !Number.isFinite(row.location.lat) || !Number.isFinite(row.location.lng))return;
      const next={lat:row.location.lat,lng:row.location.lng,speed:row.speed||0,updatedAt:row.updated_at};
      setLocation(previous=>previous && Date.parse(previous.updatedAt)>Date.parse(next.updatedAt)?previous:next);
    };
    const refresh=async()=>{const {data,error}=await supabase.from('live_locations').select('*').eq('ride_id',rideId).maybeSingle();if(!error)receive(data);};
    const channel=supabase.channel(`ride:${rideId}:location`).on('postgres_changes',{event:'*',schema:'public',table:'live_locations',filter:`ride_id=eq.${rideId}`},payload=>receive(payload.new)).subscribe();
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},5000);
    return ()=>{cancelled=true;window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId]);
  return location;
}

'''+s[b:];p.write_text(s,encoding='utf-8')
