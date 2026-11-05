from pathlib import Path
p=Path('supabase/feature-repair-setup.sql');s=p.read_text();extra='''
-- One transaction owns lifecycle state and associated booking completion.
create or replace function private.transition_ride(trip uuid, next_status text) returns public.rides
language plpgsql security definer set search_path='' as $$
declare current_trip public.rides;
begin
 select * into current_trip from public.rides where id=trip for update;
 if auth.uid() is null or current_trip.id is null or (current_trip.driver_id<>auth.uid() and not private.is_approved_admin()) then raise exception 'Ride access denied' using errcode='42501'; end if;
 if not ((current_trip.status='active' and next_status in ('in_progress','cancelled')) or (current_trip.status='in_progress' and next_status in ('completed','cancelled'))) then raise exception 'Invalid ride transition'; end if;
 if next_status='cancelled' and exists(select 1 from public.bookings where ride_id=trip and payment_status='paid' and status<>'cancelled') then raise exception 'Refund paid bookings before cancelling this ride'; end if;
 update public.rides set status=next_status where id=trip returning * into current_trip;
 if next_status='completed' then update public.bookings set status='completed' where ride_id=trip and status='confirmed'; end if;
 if next_status='cancelled' then update public.bookings set status='cancelled' where ride_id=trip and status in ('pending','confirmed'); end if;
 return current_trip;
end $$;
revoke all on function private.transition_ride(uuid,text) from public,anon;
grant execute on function private.transition_ride(uuid,text) to authenticated;
create or replace function public.transition_ride(trip uuid,next_status text) returns public.rides language sql security invoker set search_path='' as $$ select private.transition_ride(trip,next_status); $$;
revoke all on function public.transition_ride(uuid,text) from public,anon;
grant execute on function public.transition_ride(uuid,text) to authenticated;
''';s=s.replace("notify pgrst, 'reload schema';",extra+"\nnotify pgrst, 'reload schema';");p.write_text(s)
p=Path('src/lib/api.ts');s=p.read_text();s=s.replace("  const { data, error } = await supabase\n    .from('rides')\n    .update(updates)","  if (updates.status) {\n    const {data, error} = await supabase.rpc('transition_ride', {trip: id, next_status: updates.status});\n    if (error) throw error;\n    return data as Ride;\n  }\n  const { data, error } = await supabase\n    .from('rides')\n    .update(updates)");a=s.index('  // Cancel all bookings',s.index('export async function deleteRide'));b=s.index('\n}',a);s=s[:a]+"  await updateRide(id, {status:'cancelled'});"+s[b:];a=s.index("  await supabase.from('bookings').update",s.index('export async function forceCancelRide'));b=s.index('\n}',a);s=s[:a]+"  await updateRide(rideId, {status:'cancelled'});\n  const {error} = await supabase.from('admin_logs').insert({admin_id:adminId, action:'force_cancel_ride', details:{ride_id:rideId,reason}});\n  if(error) throw error;"+s[b:];s=s.replace(".eq('driver_id', driverId).eq('status', 'active')",".eq('driver_id', driverId)");p.write_text(s)
# Offering a ride is available to signed-in users, with explicit confirmation to opt into driver role.
p=Path('src/app/rides/create/page.tsx');p.write_text(p.read_text().replace('roles={["driver"]}','roles={[]}'))
p=Path('src/screens/CreateRide.tsx');s=p.read_text().replace('import { createRide }','import { supabase } from "@/lib/supabase";\nimport { createRide }');s=s.replace('      await createRide({','''      if (new Date(`${date}T${time}:00`).getTime() <= Date.now()) throw new Error("Choose a future departure time.");
      if (user.user_type === "student") {
        if (!window.confirm("Enable offering rides on your account? You can still book rides as a passenger.")) return;
        const {data: profile,error} = await supabase.from("users").update({user_type:"both"}).eq("id",user.id).select().single();
        if(error) throw error;
        useAuthStore.getState().setUser(profile);
      }
      await createRide({''').replace('    } catch {\n      console.error("Failed to create ride");','    } catch (error) {\n      window.alert(error instanceof Error ? error.message : "Failed to create ride. Please retry.");');p.write_text(s)
