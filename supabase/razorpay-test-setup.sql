begin;
alter table public.bookings add column if not exists razorpay_order_id text unique;
alter table public.bookings drop constraint if exists bookings_payment_provider_check;
alter table public.bookings add constraint bookings_payment_provider_check check(payment_provider in ('stripe_test','simulated','razorpay_test'));
create or replace function public.fulfill_razorpay_test_booking(p_ride uuid,p_rider uuid,p_seats integer,p_amount bigint,p_payment text,p_order text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare trip public.rides%rowtype; existing public.bookings%rowtype; booking_id uuid;
begin
 if p_payment is null or p_order is null or p_payment !~ '^pay_[a-zA-Z0-9]+$' or p_order !~ '^order_[a-zA-Z0-9]+$' or p_seats is null or p_seats not between 1 and 8 or p_amount is null or p_amount<=0 then raise exception 'Invalid test payment' using errcode='22023'; end if;
 select * into existing from public.bookings where razorpay_order_id=p_order;
 if existing.id is not null then
   if existing.rider_id<>p_rider or existing.ride_id<>p_ride or existing.payment_id<>p_payment then raise exception 'Payment mismatch'; end if;
   return existing.id;
 end if;
 select * into trip from public.rides where id=p_ride for update;
 select * into existing from public.bookings where razorpay_order_id=p_order;
 if existing.id is not null then
   if existing.rider_id<>p_rider or existing.ride_id<>p_ride or existing.payment_id<>p_payment then raise exception 'Payment mismatch'; end if;
   return existing.id;
 end if;
 if trip.id is null or trip.status<>'active' or trip.departure_time<=now() or trip.driver_id=p_rider or trip.seats_available<p_seats then raise exception 'Ride is no longer available'; end if;
 if p_amount is distinct from (trip.price_per_seat*p_seats*100)::bigint then raise exception 'Fare changed'; end if;
 insert into public.bookings(ride_id,rider_id,seats_booked,total_price,payment_status,payment_id,razorpay_order_id,status,payment_provider)
 values(p_ride,p_rider,p_seats,p_amount/100.0,'paid',p_payment,p_order,'confirmed','razorpay_test') returning id into booking_id;
 update public.rides set seats_available=seats_available-p_seats where id=p_ride;
 return booking_id;
end $$;
revoke all on function public.fulfill_razorpay_test_booking(uuid,uuid,integer,bigint,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_razorpay_test_booking(uuid,uuid,integer,bigint,text,text) to service_role;
update private.payment_configuration set simulation_enabled=false where id=true;
notify pgrst,'reload schema';
commit;
select 'Razorpay test booking setup installed' as result;
