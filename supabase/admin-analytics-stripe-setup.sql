-- Admin analytics plus test-only Stripe booking support. Apply after foundation.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_approved_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.users where id=auth.uid() and user_type='admin' and admin_approved);
$$;
revoke all on function private.is_approved_admin() from public,anon;
grant execute on function private.is_approved_admin() to authenticated;
create policy admin_profiles_read on public.users for select to authenticated using ((select private.is_approved_admin()));
create policy admin_rides_read on public.rides for select to authenticated using ((select private.is_approved_admin()));

create table public.bookings (
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id),
 rider_id uuid not null references public.users(id), seats_booked integer not null check(seats_booked between 1 and 8),
 total_price numeric(10,2) not null check(total_price>=0),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded')),
 payment_id text unique, stripe_session_id text unique,
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled','completed')),
 created_at timestamptz not null default now()
);
create index bookings_rider_idx on public.bookings(rider_id,created_at);
create index bookings_ride_idx on public.bookings(ride_id);
alter table public.bookings enable row level security;
revoke all on public.bookings from public,anon,authenticated;
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
create policy bookings_read on public.bookings for select to authenticated using (
 rider_id=(select auth.uid()) or exists(select 1 from public.rides where id=ride_id and driver_id=(select auth.uid())) or (select private.is_approved_admin())
);

-- Only the verified server payment flow can write confirmed paid bookings.
create function public.fulfill_stripe_test_booking(p_ride uuid,p_rider uuid,p_seats integer,p_amount bigint,p_payment text,p_session text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare trip public.rides%rowtype; existing_id uuid; booking_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server payment verification required' using errcode='42501'; end if;
 if p_payment not like 'pi_%' or p_session not like 'cs_test_%' then raise exception 'Test checkout required'; end if;
 select id into existing_id from public.bookings where stripe_session_id=p_session;
 if existing_id is not null then return existing_id; end if;
 select * into trip from public.rides where id=p_ride for update;
 -- Repeat after locking to make concurrent webhook/success fulfillment idempotent.
 select id into existing_id from public.bookings where stripe_session_id=p_session;
 if existing_id is not null then return existing_id; end if;
 if trip.id is null or trip.status<>'active' or trip.departure_time<=now() or trip.driver_id=p_rider or p_seats not between 1 and 8 or trip.seats_available<p_seats then
  raise exception 'Ride is no longer available' using errcode='P0001';
 end if;
 if p_amount is distinct from (trip.price_per_seat*p_seats*100)::bigint then raise exception 'Fare changed' using errcode='P0001'; end if;
 insert into public.bookings(ride_id,rider_id,seats_booked,total_price,payment_status,payment_id,stripe_session_id,status)
 values(p_ride,p_rider,p_seats,p_amount/100.0,'paid',p_payment,p_session,'confirmed') returning id into booking_id;
 update public.rides set seats_available=seats_available-p_seats where id=p_ride;
 return booking_id;
end $$;
revoke all on function public.fulfill_stripe_test_booking(uuid,uuid,integer,bigint,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_stripe_test_booking(uuid,uuid,integer,bigint,text,text) to service_role;

create function private.admin_analytics() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 k jsonb; s jsonb; routes jsonb; missing text[] := array[]::text[]; entry record; metric numeric;
begin
 if not private.is_approved_admin() then raise exception 'Approved administrator access required' using errcode='42501'; end if;
 select jsonb_build_object('total_users',count(*),'students',count(*) filter(where user_type in ('student','both')),'drivers',count(*) filter(where user_type in ('driver','both')),'admins',count(*) filter(where user_type='admin' and admin_approved)) into k from public.users;
 select k||jsonb_build_object('active_rides',count(*) filter(where status='active'),'completed_rides',count(*) filter(where status='completed'),'cancelled_rides',count(*) filter(where status='cancelled')) into k from public.rides;
 select k||jsonb_build_object('total_bookings',count(*),'paid_bookings',count(*) filter(where payment_status='paid'),'total_revenue',coalesce(sum(total_price) filter(where payment_status='paid'),0)) into k from public.bookings;
 for entry in select * from (values
 ('driver_verification','pending_verifications','count(*)','verification_status=''pending'''),
 ('sos_alerts','active_alerts','count(*)','status=''active'''),
 ('ride_reports','open_reports','count(*)','status=''open'''),
 ('support_messages','open_support','count(*)','sender_type=''user'' and not is_read'),
 ('banned_users','banned','count(*)','true'),
 ('reviews','avg_rating','coalesce(avg(rating),0)','true'),
 ('reviews','total_reviews','count(*)','true')
 ) as t(table_name,metric_name,expression,condition)
 loop
  metric:=0;
  if to_regclass('public.'||entry.table_name) is null then missing:=array_append(missing,entry.table_name);
  else execute format('select %s from public.%I where %s',entry.expression,entry.table_name,entry.condition) into metric; end if;
  k:=k||jsonb_build_object(entry.metric_name,metric);
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('day',day,'users',users,'rides',rides,'bookings',bookings,'revenue',revenue) order by day),'[]'::jsonb) into s from (
 select d::date as day,
 (select count(*) from public.users where created_at>=d and created_at<d+interval '1 day') users,
 (select count(*) from public.rides where created_at>=d and created_at<d+interval '1 day') rides,
 (select count(*) from public.bookings where created_at>=d and created_at<d+interval '1 day') bookings,
 (select coalesce(sum(total_price),0) from public.bookings where payment_status='paid' and created_at>=d and created_at<d+interval '1 day') revenue
 from generate_series(date_trunc('day',now())-interval '13 days',date_trunc('day',now()),interval '1 day') d
 ) days;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into routes from (
 select coalesce(from_location->>'address','Pickup') from_label,coalesce(to_location->>'address','Destination') to_label,count(*) ride_count
 from public.rides group by 1,2 order by 3 desc,1,2 limit 5) t;
 return jsonb_build_object('kpi',k,'series',s,'top_routes',routes,'unavailable_tables',(select coalesce(jsonb_agg(distinct x),'[]'::jsonb) from unnest(missing) x));
end $$;
revoke all on function private.admin_analytics() from public,anon;
grant execute on function private.admin_analytics() to authenticated;
create function public.admin_analytics() returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_analytics(); $$;
revoke all on function public.admin_analytics() from public,anon;
grant execute on function public.admin_analytics() to authenticated;
notify pgrst,'reload schema';
commit;
