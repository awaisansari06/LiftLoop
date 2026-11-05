-- Apply after feature-repair-setup.sql and refund-repair-setup.sql.
-- Additive setup, following this repository's SQL Editor setup workflow.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.rides, public.bookings in share row exclusive mode;
do $$ begin if exists(select 1 from public.rides where status='in_progress') then raise exception 'Finish active trips before installing passenger journeys'; end if; end $$;
alter table public.rides add column if not exists delay_until timestamptz;
create table public.passenger_journeys (
 booking_id uuid primary key references public.bookings(id) on delete cascade,
 ride_id uuid not null references public.rides(id), rider_id uuid not null references public.users(id),
 driver_id uuid not null references public.users(id), passenger_name text not null,
 pickup jsonb not null, dropoff jsonb not null, landmark text not null default '',
 pickup_order integer not null, dropoff_order integer not null, seats integer not null,
 status text not null default 'waiting' check(status in ('waiting','approaching','arrived','onboard','dropped_off','no_show','cancelled')),
 ready_at timestamptz, arrived_at timestamptz, boarded_at timestamptz, dropped_off_at timestamptz,
 eta_at timestamptz, eta_updated_at timestamptz
);
create index passenger_journeys_route on public.passenger_journeys(ride_id,pickup_order);
create index passenger_journeys_rider on public.passenger_journeys(rider_id);
create index passenger_journeys_driver on public.passenger_journeys(driver_id);
alter table public.passenger_journeys enable row level security;
revoke all on public.passenger_journeys from public,anon,authenticated;
grant select on public.passenger_journeys to authenticated;
grant all on public.passenger_journeys to service_role;
create policy journey_read on public.passenger_journeys for select to authenticated
 using(rider_id=(select auth.uid()) or driver_id=(select auth.uid()));
-- A dropped-off or missed passenger must not keep following the remaining passengers.
create function private.can_track_journey(trip uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.rides where id=trip and driver_id=auth.uid()) or exists(select 1 from public.passenger_journeys where ride_id=trip and rider_id=auth.uid() and status in ('waiting','approaching','arrived','onboard')));
$$;
revoke all on function private.can_track_journey(uuid) from public,anon;
grant execute on function private.can_track_journey(uuid) to authenticated;
drop policy if exists participant_location on public.live_locations;
create policy participant_location on public.live_locations for select to authenticated using(private.can_track_journey(ride_id));
create table private.boarding_pins(booking_id uuid primary key references public.bookings(id) on delete cascade, pin text not null, failed_attempts integer not null default 0, locked_until timestamptz);
alter table private.boarding_pins enable row level security;
revoke all on private.boarding_pins from public,anon,authenticated;

create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public,anon,authenticated;
grant all on public.push_subscriptions to service_role;
create table public.journey_push_outbox (
 id uuid primary key references public.notifications(id) on delete cascade,
 user_id uuid not null references public.users(id), ride_id uuid not null references public.rides(id),
 title text not null, message text not null, created_at timestamptz not null default now(), sent_at timestamptz,
 attempts integer not null default 0, claimed_at timestamptz
);
create index journey_push_pending on public.journey_push_outbox(created_at) where sent_at is null;
create index journey_push_user on public.journey_push_outbox(user_id);
create index journey_push_ride on public.journey_push_outbox(ride_id);
alter table public.journey_push_outbox enable row level security;
revoke all on public.journey_push_outbox from public,anon,authenticated;
grant all on public.journey_push_outbox to service_role;

create function private.journey_notify(who uuid, trip uuid, title text, message text) returns void
language plpgsql security definer set search_path='' as $$
declare notification_id uuid;
begin
 insert into public.notifications(user_id,title,message,type) values(who,title,message,'journey:'||trip::text) returning id into notification_id;
 insert into public.journey_push_outbox(id,user_id,ride_id,title,message) values(notification_id,who,trip,title,message);
end $$;
revoke all on function private.journey_notify(uuid,uuid,text,text) from public,anon,authenticated;

create function private.initialize_passenger() returns trigger language plpgsql security definer set search_path='' as $$
declare trip public.rides; sequence_number integer;
begin
 if new.status='confirmed' then
  select * into trip from public.rides where id=new.ride_id for update;
  select coalesce(max(pickup_order),0)+1 into sequence_number from public.passenger_journeys where ride_id=new.ride_id;
  insert into public.passenger_journeys(booking_id,ride_id,rider_id,driver_id,passenger_name,pickup,dropoff,pickup_order,dropoff_order,seats)
   values(new.id,new.ride_id,new.rider_id,trip.driver_id,coalesce((select full_name from public.users where id=new.rider_id),'Passenger'),trip.from_location,trip.to_location,sequence_number,sequence_number,new.seats_booked)
   on conflict(booking_id) do nothing;
  insert into private.boarding_pins(booking_id,pin) values(new.id,lpad(floor(random()*10000)::integer::text,4,'0')) on conflict do nothing;
 elsif new.status='cancelled' then
  update public.passenger_journeys set status='cancelled',eta_at=null where booking_id=new.id and status not in ('dropped_off','no_show');
  if tg_op='UPDATE' and old.status<>'cancelled' then
   select * into trip from public.rides where id=new.ride_id;
   perform private.journey_notify(new.rider_id,new.ride_id,'Booking cancelled',case when new.payment_status='refunded' then 'Your test payment has been refunded.' else 'Check your booking for payment and refund status.' end);
   perform private.journey_notify(trip.driver_id,new.ride_id,'Passenger cancelled','A passenger cancelled. Check your updated passenger list.');
  end if;
 end if;
 return new;
end $$;
revoke all on function private.initialize_passenger() from public,anon,authenticated;
create trigger initialize_passenger after insert or update of status on public.bookings for each row execute function private.initialize_passenger();
-- Backfill without touching historical booking status or sending historical alerts.
insert into public.passenger_journeys(booking_id,ride_id,rider_id,driver_id,passenger_name,pickup,dropoff,pickup_order,dropoff_order,seats)
 select b.id,b.ride_id,b.rider_id,r.driver_id,coalesce(u.full_name,'Passenger'),r.from_location,r.to_location,
 row_number() over(partition by r.id order by b.created_at,b.id),row_number() over(partition by r.id order by b.created_at,b.id),b.seats_booked
 from public.bookings b join public.rides r on r.id=b.ride_id join public.users u on u.id=b.rider_id where b.status='confirmed';
insert into private.boarding_pins(booking_id,pin) select booking_id,lpad(floor(random()*10000)::integer::text,4,'0') from public.passenger_journeys;

create function private.journey_snapshot(trip uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.rides; passengers jsonb; vehicle jsonb; pin text;
begin
 select * into r from public.rides where id=trip;
 if auth.uid() is null or r.id is null or not private.ride_member(trip) then raise exception 'Ride access denied' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('phone',case when r.driver_id=auth.uid() then u.phone else null end) order by j.pickup_order),'[]') into passengers from public.passenger_journeys j join public.users u on u.id=j.rider_id where j.ride_id=trip and (r.driver_id=auth.uid() or j.rider_id=auth.uid());
 select jsonb_build_object('vehicle_number',vehicle_number,'vehicle_model',vehicle_model,'vehicle_color',vehicle_color) into vehicle from public.driver_verification where user_id=r.driver_id and verification_status='verified';
 select p.pin into pin from private.boarding_pins p join public.passenger_journeys j using(booking_id) where j.ride_id=trip and j.rider_id=auth.uid() and j.status in ('waiting','approaching','arrived') order by j.pickup_order,j.booking_id limit 1;
 return jsonb_build_object('passengers',passengers,'pin',pin,'vehicle',vehicle,'delay_until',r.delay_until,'driver',(select jsonb_build_object('full_name',full_name,'phone',phone) from public.users where id=r.driver_id));
end $$;
revoke all on function private.journey_snapshot(uuid) from public,anon;
grant execute on function private.journey_snapshot(uuid) to authenticated;
create function public.journey_snapshot(trip uuid) returns jsonb language sql security invoker set search_path='' as $$select private.journey_snapshot(trip)$$;
revoke all on function public.journey_snapshot(uuid) from public,anon;
grant execute on function public.journey_snapshot(uuid) to authenticated;

-- All actions lock the ride first, then its passengers: concurrent drivers cannot skip stops.
create function private.journey_action(trip uuid, action text, booking uuid default null, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.rides; j public.passenger_journeys; next_booking uuid; next_kind text; is_driver boolean; p private.boarding_pins; other uuid; minutes integer; item jsonb; spot jsonb;
begin
 select * into r from public.rides where id=trip for update;
 if auth.uid() is null or r.id is null then raise exception 'Ride access denied' using errcode='42501'; end if;
 is_driver:=r.driver_id=auth.uid();
 select * into j from public.passenger_journeys where booking_id=booking and ride_id=trip for update;
 if not is_driver and (j.booking_id is null or j.rider_id<>auth.uid() or action not in ('ready','locations')) then raise exception 'Ride access denied' using errcode='42501'; end if;
 select booking_id into next_booking from public.passenger_journeys where ride_id=trip and status in ('waiting','approaching','arrived') order by pickup_order,booking_id limit 1;
 next_kind:='pickup';
 if next_booking is null then
  select booking_id into next_booking from public.passenger_journeys where ride_id=trip and status='onboard' order by dropoff_order,booking_id limit 1;
  next_kind:='dropoff';
 end if;
 if action='start' then
  perform pg_advisory_xact_lock(hashtextextended(r.driver_id::text,0));
  if exists(select 1 from public.rides where driver_id=r.driver_id and id<>trip and status='in_progress') then raise exception 'Finish your current ride before leaving for another'; end if;
  if r.status<>'active' then raise exception 'Ride already started or closed'; end if;
  if next_booking is null then raise exception 'There are no confirmed passengers to collect'; end if;
  update public.rides set status='in_progress' where id=trip;
  for j in select * from public.passenger_journeys where ride_id=trip and status='waiting' loop
   perform private.journey_notify(j.rider_id,trip,'Your driver is on the way','Get ready at your saved pickup point. Open your ride for updates.');
  end loop;
 elsif action='finish' then
  if r.status<>'in_progress' or next_booking is not null then raise exception 'Resolve all pickups and drop-offs before finishing'; end if;
  update public.rides set status='completed',delay_until=null where id=trip;
 elsif action='cancel' then
  if r.status not in ('active','in_progress') or exists(select 1 from public.bookings where ride_id=trip and status<>'cancelled' and payment_status='paid') or exists(select 1 from public.passenger_journeys where ride_id=trip and status='onboard') then raise exception 'Resolve onboard passengers and paid refunds before cancelling'; end if;
  update public.rides set status='cancelled' where id=trip;
  update public.bookings set status='cancelled' where ride_id=trip and status in ('pending','confirmed');
 elsif action in ('ready','locations') then
  if j.status not in ('waiting','approaching','arrived') or r.status not in ('active','in_progress') then raise exception 'Pickup can no longer be changed'; end if;
  if action='ready' then
   if j.ready_at is null then
    update public.passenger_journeys set ready_at=now() where booking_id=booking;
    perform private.journey_notify(r.driver_id,trip,'Passenger ready',j.passenger_name||' is at the pickup point.');
   end if;
  else
   if r.status<>'active' then raise exception 'Pickup and drop-off are locked once the driver leaves'; end if;
   foreach spot in array array[payload->'pickup',payload->'dropoff'] loop
    if spot is null or jsonb_typeof(spot)<>'object' or jsonb_typeof(spot->'lat') is distinct from 'number' or jsonb_typeof(spot->'lng') is distinct from 'number' or (spot->>'lat')::numeric not between -90 and 90 or (spot->>'lng')::numeric not between -180 and 180 or length(coalesce(spot->>'address',''))>500 then raise exception 'Select valid pickup and drop-off locations'; end if;
   end loop;
   if length(coalesce(payload->>'landmark',''))>200 then raise exception 'Landmark is too long'; end if;
   update public.passenger_journeys set pickup=payload->'pickup',dropoff=payload->'dropoff',landmark=coalesce(payload->>'landmark',''),ready_at=null,eta_at=null where booking_id=booking;
   perform private.journey_notify(r.driver_id,trip,'Pickup details updated',j.passenger_name||' updated their meeting point. Review the route before leaving.');
  end if;
 elsif action='reorder' then
  if r.status<>'active' then raise exception 'Set stop order before leaving'; end if;
  other:=(payload->>'other')::uuid;
  perform 1 from public.passenger_journeys where booking_id=other and ride_id=trip and status='waiting';
  if not found or j.status<>'waiting' then raise exception 'Invalid stop'; end if;
  if payload->>'kind'='dropoff' then
   update public.passenger_journeys set dropoff_order=case when booking_id=booking then (select dropoff_order from public.passenger_journeys where booking_id=other) else j.dropoff_order end where booking_id in (booking,other);
  else
   update public.passenger_journeys set pickup_order=case when booking_id=booking then (select pickup_order from public.passenger_journeys where booking_id=other) else j.pickup_order end where booking_id in (booking,other);
  end if;
 elsif action='delay' then
  minutes:=(payload->>'minutes')::integer;
  if r.status not in ('active','in_progress') or minutes is null or minutes not between 0 and 60 then raise exception 'Choose a delay between 0 and 60 minutes'; end if;
  update public.rides set delay_until=now()+make_interval(mins=>minutes) where id=trip;
  update public.passenger_journeys set eta_at=null,eta_updated_at=null where ride_id=trip;
  for j in select * from public.passenger_journeys where ride_id=trip and status in ('waiting','approaching','arrived','onboard') loop
   perform private.journey_notify(j.rider_id,trip,'Driver timing update',case when minutes=0 then 'Your driver is moving again. Watch for an updated ETA.' else 'Your driver reports a '||minutes||' minute delay. Your ETA will update.' end);
  end loop;
 elsif action='eta' then
  if r.status<>'in_progress' then raise exception 'Ride is not running'; end if;
  if jsonb_typeof(payload->'estimates')<>'array' or jsonb_array_length(payload->'estimates')>16 then raise exception 'Invalid ETA list'; end if;
  for item in select * from jsonb_array_elements(payload->'estimates') loop
   minutes:=(item->>'minutes')::integer;
   if minutes is null or minutes not between 0 and 1440 then raise exception 'Invalid ETA'; end if;
   update public.passenger_journeys set eta_at=now()+make_interval(mins=>minutes),eta_updated_at=now() where ride_id=trip and booking_id=(item->>'bookingId')::uuid and status in ('waiting','approaching','arrived','onboard');
  end loop;
 elsif action in ('nearby','arrive','board','no_show','dropoff') then
  if r.status<>'in_progress' or j.booking_id is null or booking is distinct from next_booking then raise exception 'Only the next passenger stop can be updated'; end if;
  if action='nearby' then
   if next_kind<>'pickup' or j.status<>'waiting' then return jsonb_build_object('ok',true); end if;
   if not exists(select 1 from public.live_locations l where l.ride_id=trip and l.updated_at>now()-interval '45 seconds' and
    6371*2*asin(sqrt(least(1,power(sin(radians(((l.location->>'lat')::float8-(j.pickup->>'lat')::float8))/2),2)+cos(radians((j.pickup->>'lat')::float8))*cos(radians((l.location->>'lat')::float8))*power(sin(radians(((l.location->>'lng')::float8-(j.pickup->>'lng')::float8))/2),2))))<0.5) then raise exception 'Fresh GPS near the pickup is required'; end if;
   update public.passenger_journeys set status='approaching' where booking_id=booking;
   perform private.journey_notify(j.rider_id,trip,'Your driver is nearby','Please be ready at your pickup point.');
  elsif action='arrive' then
   if next_kind<>'pickup' then raise exception 'Not a pickup stop'; end if;
   if j.status<>'arrived' then
    update public.passenger_journeys set status='arrived',arrived_at=now(),eta_at=null where booking_id=booking;
    perform private.journey_notify(j.rider_id,trip,'Your driver has arrived','Meet your driver at your pickup point. Share your pickup PIN only when boarding.');
   end if;
  elsif action='board' then
   if j.status<>'arrived' then raise exception 'Mark arrival before boarding'; end if;
   select * into p from private.boarding_pins where booking_id=booking for update;
   if p.locked_until>now() then raise exception 'Too many PIN attempts. Wait 5 minutes'; end if;
   if p.pin is distinct from payload->>'pin' then
    update private.boarding_pins set failed_attempts=case when p.locked_until<=now() then 1 else failed_attempts+1 end,locked_until=case when failed_attempts>=4 and (p.locked_until is null or p.locked_until>now()) then now()+interval '5 minutes' else null end where booking_id=booking;
    return jsonb_build_object('error','Incorrect pickup PIN');
   end if;
   update public.passenger_journeys set status='onboard',boarded_at=now(),eta_at=null where booking_id=booking;
   perform private.journey_notify(j.rider_id,trip,'Pickup confirmed','You are onboard. Your next ETA is for your drop-off.');
  elsif action='no_show' then
   if j.status<>'arrived' or j.arrived_at>now()-interval '5 minutes' then raise exception 'Wait at least 5 minutes after arrival before marking a missed pickup'; end if;
   update public.passenger_journeys set status='no_show',eta_at=null where booking_id=booking;
   perform private.journey_notify(j.rider_id,trip,'Pickup missed','Your driver waited 5 minutes and continued. Contact support about your booking; no automatic refund has been issued.');
  else
   if next_kind<>'dropoff' or j.status<>'onboard' then raise exception 'Passenger must be onboard before drop-off'; end if;
   update public.passenger_journeys set status='dropped_off',dropped_off_at=now(),eta_at=null where booking_id=booking;
   update public.bookings set status='completed' where id=booking;
   perform private.journey_notify(j.rider_id,trip,'You have arrived','Your trip is complete. View your trip summary and rate your driver.');
  end if;
  if action in ('board','no_show') then
   select * into j from public.passenger_journeys where ride_id=trip and status in ('waiting','approaching','arrived') order by pickup_order,booking_id limit 1;
   if found then perform private.journey_notify(j.rider_id,trip,'You are next','Your driver is heading to your pickup next. Open the ride for your updated ETA.'); end if;
  end if;
  if action in ('board','no_show','dropoff') then update public.passenger_journeys set eta_at=null,eta_updated_at=null where ride_id=trip; end if;
 else raise exception 'Unknown journey action';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.journey_action(uuid,text,uuid,jsonb) from public,anon;
grant execute on function private.journey_action(uuid,text,uuid,jsonb) to authenticated;
create function public.journey_action(trip uuid,action text,booking uuid default null,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.journey_action(trip,action,booking,payload) $$;
revoke all on function public.journey_action(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.journey_action(uuid,text,uuid,jsonb) to authenticated;

-- Keep existing callers but enforce passenger completion even on the old endpoint.
create or replace function private.transition_ride(trip uuid,next_status text) returns public.rides language plpgsql security definer set search_path='' as $$
declare result public.rides;
begin
 perform private.journey_action(trip,case next_status when 'in_progress' then 'start' when 'completed' then 'finish' when 'cancelled' then 'cancel' else 'invalid' end);
 select * into result from public.rides where id=trip; return result;
end $$;
-- No direct browser status edits can bypass the state machine.
create function private.guard_journey_lifecycle() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and new.status is distinct from old.status then
  if tg_table_name='rides' then raise exception 'Use ride journey controls' using errcode='42501'; end if;
  if old.status in ('confirmed','completed') then raise exception 'Use the verified cancellation or journey controls' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_journey_lifecycle() from public,anon,authenticated;
create trigger journey_ride_guard before update of status on public.rides for each row execute function private.guard_journey_lifecycle();
create trigger journey_booking_guard before update of status on public.bookings for each row execute function private.guard_journey_lifecycle();

create or replace function private.cancel_simulated_booking(p_booking uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; r public.rides; trip_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 if not exists(select 1 from private.payment_configuration where id and simulation_enabled) then raise exception 'Simulation disabled' using errcode='42501'; end if;
 select ride_id into trip_id from public.bookings where id=p_booking and rider_id=auth.uid() and payment_provider='simulated';
 if trip_id is null then raise exception 'Simulated booking not found'; end if;
 select * into r from public.rides where id=trip_id for update;
 select * into b from public.bookings where id=p_booking for update;
 if b.status='cancelled' then return b.id; end if;
 if b.status<>'confirmed' or r.status<>'active' or r.departure_time<=now() then raise exception 'Cancellation closes at departure or when the driver leaves'; end if;
 update public.bookings set status='cancelled',payment_status='refunded' where id=p_booking;
 update public.rides set seats_available=seats_available+b.seats_booked where id=trip_id;
 return p_booking;
end $$;
create function private.cancel_unpaid_booking(booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; r public.rides; trip_id uuid;
begin
 select ride_id into trip_id from public.bookings where id=booking and rider_id=auth.uid();
 if auth.uid() is null or trip_id is null then raise exception 'Booking access denied' using errcode='42501'; end if;
 select * into r from public.rides where id=trip_id for update;
 select * into b from public.bookings where id=booking for update;
 if b.status='cancelled' then return; end if;
 if b.payment_status='paid' or b.status not in ('pending','confirmed') or r.status<>'active' or r.departure_time<=now() then raise exception 'Booking requires support or a verified refund'; end if;
 update public.bookings set status='cancelled' where id=booking;
 if b.status='confirmed' then update public.rides set seats_available=seats_available+b.seats_booked where id=trip_id; end if;
end $$;
revoke all on function private.cancel_unpaid_booking(uuid) from public,anon;
grant execute on function private.cancel_unpaid_booking(uuid) to authenticated;
create function public.cancel_unpaid_booking(booking uuid) returns void language sql security invoker set search_path='' as $$select private.cancel_unpaid_booking(booking)$$;
revoke all on function public.cancel_unpaid_booking(uuid) from public,anon;
grant execute on function public.cancel_unpaid_booking(uuid) to authenticated;

-- Completed passengers may leave a review even while other passengers are still riding.
drop policy if exists review_write on public.reviews;
create policy review_write on public.reviews for insert to authenticated with check (
 reviewer_id=(select auth.uid()) and exists(select 1 from public.bookings b join public.rides r on r.id=b.ride_id where b.ride_id=reviews.ride_id and b.rider_id=(select auth.uid()) and r.driver_id=reviews.reviewee_id and b.status='completed')
);
-- Claim the durable push outbox with a lease, allowing safe concurrent dispatch/retry.
create function public.claim_journey_push(trip uuid default null) returns setof public.journey_push_outbox language sql security invoker set search_path='' as $$
 update public.journey_push_outbox set claimed_at=now(),attempts=attempts+1 where id in
 (select id from public.journey_push_outbox where sent_at is null and attempts<8 and (claimed_at is null or claimed_at<now()-interval '2 minutes') and (trip is null or ride_id=trip) order by created_at limit 50 for update skip locked) returning *;
$$;
revoke all on function public.claim_journey_push(uuid) from public,anon,authenticated;
grant execute on function public.claim_journey_push(uuid) to service_role;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.passenger_journeys; end if;
end $$;
notify pgrst,'reload schema';
commit;
