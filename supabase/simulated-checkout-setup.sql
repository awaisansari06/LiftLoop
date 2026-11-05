-- Explicitly enable simulated bookings for this development project.
begin;
alter table public.bookings add column payment_provider text not null default 'stripe_test' check(payment_provider in ('stripe_test','simulated'));
create table private.payment_configuration (id boolean primary key default true check(id), simulation_enabled boolean not null default false);
revoke all on private.payment_configuration from public,anon,authenticated;
insert into private.payment_configuration(id,simulation_enabled) values(true,true);
create function private.create_simulated_booking(p_ride uuid,p_seats integer,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); trip public.rides%rowtype; result uuid; existing_owner uuid;
begin
 if who is null then raise exception 'Sign in before booking' using errcode='42501'; end if;
 if not exists(select 1 from private.payment_configuration where id and simulation_enabled) then raise exception 'Simulation disabled' using errcode='42501'; end if;
 if p_seats is null or p_seats not between 1 and 8 or p_request is null then raise exception 'Invalid booking request'; end if;
 select id,rider_id into result,existing_owner from public.bookings where payment_id='sim_'||p_request;
 if result is not null then if existing_owner<>who then raise exception 'Invalid request identifier'; end if; return result; end if;
 select * into trip from public.rides where id=p_ride for update;
 select id into result from public.bookings where payment_id='sim_'||p_request and rider_id=who;
 if result is not null then return result; end if;
 if trip.id is null or trip.status<>'active' or trip.departure_time<=now() or trip.driver_id=who or trip.seats_available<p_seats then raise exception 'Ride is no longer available'; end if;
 if not exists(select 1 from public.users where id=who) then raise exception 'Complete your profile before booking'; end if;
 insert into public.bookings(ride_id,rider_id,seats_booked,total_price,payment_status,payment_id,status,payment_provider)
 values(p_ride,who,p_seats,trip.price_per_seat*p_seats,'paid','sim_'||p_request,'confirmed','simulated') returning id into result;
 update public.rides set seats_available=seats_available-p_seats where id=p_ride;
 return result;
end $$;
revoke all on function private.create_simulated_booking(uuid,integer,uuid) from public,anon;
grant execute on function private.create_simulated_booking(uuid,integer,uuid) to authenticated;
create function public.create_simulated_booking(p_ride uuid,p_seats integer,p_request uuid) returns uuid language sql security invoker set search_path='' as $$ select private.create_simulated_booking(p_ride,p_seats,p_request); $$;
revoke all on function public.create_simulated_booking(uuid,integer,uuid) from public,anon;
grant execute on function public.create_simulated_booking(uuid,integer,uuid) to authenticated;

create function private.cancel_simulated_booking(p_booking uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare booking public.bookings%rowtype; trip_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 if not exists(select 1 from private.payment_configuration where id and simulation_enabled) then raise exception 'Simulation disabled' using errcode='42501'; end if;
 select ride_id into trip_id from public.bookings where id=p_booking and rider_id=auth.uid() and payment_provider='simulated';
 if trip_id is null then raise exception 'Simulated booking not found'; end if;
 perform 1 from public.rides where id=trip_id for update;
 select * into booking from public.bookings where id=p_booking for update;
 if booking.status='cancelled' then return booking.id; end if;
 if booking.status<>'confirmed' then raise exception 'Booking cannot be cancelled'; end if;
 update public.bookings set status='cancelled',payment_status='refunded' where id=p_booking;
 update public.rides set seats_available=seats_available+booking.seats_booked where id=trip_id;
 return p_booking;
end $$;
revoke all on function private.cancel_simulated_booking(uuid) from public,anon;
grant execute on function private.cancel_simulated_booking(uuid) to authenticated;
create function public.cancel_simulated_booking(p_booking uuid) returns uuid language sql security invoker set search_path='' as $$ select private.cancel_simulated_booking(p_booking); $$;
revoke all on function public.cancel_simulated_booking(uuid) from public,anon;
grant execute on function public.cancel_simulated_booking(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
