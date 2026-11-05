from pathlib import Path
schemas={
'reviews':"ride_id uuid references public.rides, reviewer_id uuid references public.users, reviewee_id uuid references public.users, rating integer check(rating between 1 and 5), comment text, unique(ride_id,reviewer_id,reviewee_id)",
'notifications':"user_id uuid references public.users, title text not null, message text not null, type text, read boolean not null default false",
'driver_verification':"user_id uuid unique references public.users, license_number text, license_photo text, vehicle_type text, vehicle_number text, vehicle_model text, vehicle_color text, vehicle_photo text, vehicle_docs text[], id_card_photo text, college_id text, verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')), rejection_reason text, verified_by uuid references public.users, verified_at timestamptz, submitted_at timestamptz",
'live_locations':"ride_id uuid unique references public.rides, driver_id uuid references public.users, location jsonb, speed double precision, updated_at timestamptz default now()",
'sos_alerts':"user_id uuid references public.users, ride_id uuid references public.rides, location jsonb, message text, status text default 'active' check(status in ('active','resolved'))",
'messages':"ride_id uuid references public.rides, sender_id uuid references public.users, message text not null, attachment_url text",
'banned_users':"user_id uuid unique references public.users, reason text, banned_by uuid references public.users, banned_at timestamptz default now()",
'admin_logs':"admin_id uuid references public.users, action text not null, target_user_id uuid references public.users, details jsonb",
'saved_routes':"user_id uuid references public.users, label text, from_location jsonb not null, to_location jsonb not null",
'announcements':"title text not null, body text not null, severity text default 'info', audience text default 'all', active boolean default true, created_by uuid references public.users",
'ride_reports':"ride_id uuid references public.rides, reporter_id uuid references public.users, reported_user_id uuid references public.users, reason text not null, status text default 'open'",
'support_messages':"user_id uuid references public.users, admin_id uuid references public.users, message text not null, sender_type text check(sender_type in ('user','admin')), is_read boolean default false, attachment_url text"
}
sql=['-- Apply after the existing foundation and payment setup scripts. No user data is deleted.','begin;']
for t,cols in schemas.items():
 sql += [f'create table if not exists public.{t} (id uuid primary key default gen_random_uuid(), {cols}, created_at timestamptz not null default now());',f'alter table public.{t} enable row level security;',f'revoke all on public.{t} from anon, authenticated;',f'grant select,insert,update,delete on public.{t} to authenticated;',f'grant all on public.{t} to service_role;',f'create policy "admin_access" on public.{t} for all to authenticated using ((select private.is_approved_admin())) with check ((select private.is_approved_admin()));']
# Personal records: no permission to forge notifications, approvals, alerts resolution or reports status.
for t in ['saved_routes','support_messages','driver_verification','sos_alerts','ride_reports','notifications']:
 col='reporter_id' if t=='ride_reports' else 'user_id'
 sql += [f'create index on public.{t}({col});',f'create policy owner_read on public.{t} for select to authenticated using ({col}=(select auth.uid()));']
 if t!='notifications':
  check=f'{col}=(select auth.uid())'
  if t=='driver_verification':check+=" and verification_status='pending' and verified_by is null and verified_at is null"
  if t=='support_messages':check+=" and sender_type='user' and admin_id is null"
  if t=='sos_alerts':check+=" and status='active'"
  if t=='ride_reports':check+=" and status='open'"
  sql += [f'create policy owner_insert on public.{t} for insert to authenticated with check ({check});']
 if t in ['saved_routes','driver_verification']:
  sql += [f'create policy owner_update on public.{t} for update to authenticated using ({col}=(select auth.uid())) with check ({check});']
 if t=='saved_routes':sql += [f'create policy owner_delete on public.{t} for delete to authenticated using (user_id=(select auth.uid()));']
sql += ["grant update(read) on public.notifications to authenticated;", "create policy owner_read_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));"]
# membership lookup avoids recursive RLS between rides and bookings.
sql += ['''create or replace function private.ride_member(trip uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.rides where id=trip and driver_id=auth.uid()) or exists(select 1 from public.bookings where ride_id=trip and rider_id=auth.uid() and status in ('confirmed','completed')));
$$;
revoke all on function private.ride_member(uuid) from public,anon;
grant execute on function private.ride_member(uuid) to authenticated;
create policy passenger_read on public.rides for select to authenticated using(private.ride_member(id));
create policy participant_read on public.messages for select to authenticated using(private.ride_member(ride_id));
create policy participant_send on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.ride_member(ride_id));
create policy participant_location on public.live_locations for select to authenticated using(private.ride_member(ride_id));
create policy driver_location on public.live_locations for insert to authenticated with check(driver_id=(select auth.uid()) and exists(select 1 from public.rides where id=ride_id and driver_id=(select auth.uid()) and status='in_progress'));
create policy driver_location_update on public.live_locations for update to authenticated using(driver_id=(select auth.uid())) with check(driver_id=(select auth.uid()) and exists(select 1 from public.rides where id=ride_id and driver_id=(select auth.uid()) and status='in_progress'));
create policy published_announcements on public.announcements for select to authenticated using(active and (audience='all' or audience=case (select user_type from public.users where id=(select auth.uid())) when 'student' then 'students' when 'driver' then 'drivers' when 'admin' then 'admins' else '' end));
create policy review_read on public.reviews for select to authenticated using(reviewer_id=(select auth.uid()) or reviewee_id=(select auth.uid()));
create policy review_write on public.reviews for insert to authenticated with check(reviewer_id=(select auth.uid()) and reviewer_id<>reviewee_id and private.ride_member(ride_id) and exists(select 1 from public.rides where id=ride_id and status='completed'));
''']
# Column limits prevent privilege escalation through personal updates.
sql += ["revoke update on public.notifications from authenticated; grant update(read) on public.notifications to authenticated;", "revoke update on public.driver_verification from authenticated; grant update(license_number,license_photo,vehicle_type,vehicle_number,vehicle_model,vehicle_color,vehicle_photo,vehicle_docs,id_card_photo,college_id,submitted_at) on public.driver_verification to authenticated;"]
sql += ['''create or replace function public.user_stats(target uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total_bookings',(select count(*) from public.bookings where rider_id=target),'total_rides_offered',(select count(*) from public.rides where driver_id=target),'total_spent',(select coalesce(sum(total_price),0) from public.bookings where rider_id=target and payment_status='paid'),'total_earned',(select coalesce(sum(b.total_price),0) from public.bookings b join public.rides r on r.id=b.ride_id where r.driver_id=target and b.payment_status='paid' and b.status='completed'),'avg_rating',(select coalesce(avg(rating),0) from public.reviews where reviewee_id=target),'ratings_count',(select count(*) from public.reviews where reviewee_id=target),'last_ride_at',(select max(departure_time) from public.rides where driver_id=target),'last_booking_at',(select max(created_at) from public.bookings where rider_id=target)) where target=auth.uid();
$$;
revoke all on function public.user_stats(uuid) from public,anon;
grant execute on function public.user_stats(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;''']
Path('supabase/feature-repair-setup.sql').write_text('\n'.join(sql))
