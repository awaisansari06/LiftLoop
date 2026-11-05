-- Everything in this test is rolled back; no test accounts or rides remain.
begin;
do $$
declare driver uuid:=gen_random_uuid(); rider uuid:=gen_random_uuid(); other_rider uuid:=gen_random_uuid(); trip uuid; result uuid; again uuid; request_id uuid:=gen_random_uuid();
begin
 if has_function_privilege('anon','public.create_simulated_booking(uuid,integer,uuid)','execute') then raise exception 'Anonymous simulation access'; end if;
 insert into auth.users(id,email) values(driver,'driver-'||driver||'@example.invalid'),(rider,'rider-'||rider||'@example.invalid');
 insert into public.users(id,email,user_type) values(driver,'driver-'||driver||'@example.invalid','driver'),(rider,'rider-'||rider||'@example.invalid','student');
 insert into public.rides(driver_id,from_location,to_location,departure_time,seats_available,price_per_seat)
 values(driver,'{"lat":28,"lng":77}','{"lat":28.1,"lng":77.1}',now()+interval '1 day',1,12.50) returning id into trip;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',rider,'role','authenticated')::text,true);
 result:=public.create_simulated_booking(trip,1,request_id);
 again:=public.create_simulated_booking(trip,1,request_id);
 if result<>again or (select count(*) from public.bookings where ride_id=trip)<>1 or (select seats_available from public.rides where id=trip)<>0 then raise exception 'Duplicate confirmation consumed seats'; end if;
 if not exists(select 1 from public.bookings where id=result and total_price=12.50 and payment_provider='simulated') then raise exception 'Incorrect price or provider'; end if;
 begin
  perform public.create_simulated_booking(trip,1,gen_random_uuid());
  raise exception 'Overselling allowed' using errcode='23514';
 exception when raise_exception then null;
 end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_rider,'role','authenticated')::text,true);
 begin
  perform public.cancel_simulated_booking(result);
  raise exception 'Another rider cancelled booking' using errcode='23514';
 exception when raise_exception then null;
 end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',rider,'role','authenticated')::text,true);
 perform public.cancel_simulated_booking(result);
 perform public.cancel_simulated_booking(result);
 if (select seats_available from public.rides where id=trip)<>1 then raise exception 'Cancellation restored seats more than once'; end if;
 update private.payment_configuration set simulation_enabled=false where id;
 begin
  perform public.create_simulated_booking(trip,1,gen_random_uuid());
  raise exception 'Disabled simulation allowed' using errcode='23514';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select 'PASS: simulated payment labels, fare calculation, duplicate protection, seat capacity, cancellation ownership, seat restoration, disable switch' as simulation_checks;
