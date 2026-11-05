-- Nonpersistent regression checks. Everything created by this test is rolled back.
begin;
do $$
declare
 driver uuid:=gen_random_uuid(); rider uuid:=gen_random_uuid(); trip uuid; first_booking uuid; again uuid;
begin
 if has_function_privilege('anon','public.admin_analytics()','execute') then raise exception 'Anonymous analytics access'; end if;
 if has_function_privilege('authenticated','public.fulfill_razorpay_test_booking(uuid,uuid,integer,bigint,text,text)','execute') then raise exception 'Browser can fulfill payments'; end if;
 if has_table_privilege('authenticated','public.bookings','insert') or has_table_privilege('authenticated','public.bookings','update') then raise exception 'Browser can write paid bookings'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',rider,'role','authenticated')::text,true);
 begin
  perform public.admin_analytics();
  raise exception 'Nonadmin analytics access';
 exception when insufficient_privilege then null;
 end;
 insert into auth.users(id,email) values(driver,'driver-'||driver||'@example.invalid'),(rider,'rider-'||rider||'@example.invalid');
 insert into public.users(id,email,user_type) values(driver,'driver-'||driver||'@example.invalid','driver'),(rider,'rider-'||rider||'@example.invalid','student');
 insert into public.rides(driver_id,from_location,to_location,departure_time,seats_available,price_per_seat)
 values(driver,'{"lat":28,"lng":77}','{"lat":28.1,"lng":77.1}',now()+interval '1 day',1,10) returning id into trip;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 begin
  perform public.fulfill_razorpay_test_booking(trip,rider,1,1,'pay_wrongfare','order_wrongfare');
  raise exception 'Incorrect fare was allowed' using errcode='23514';
 exception when raise_exception then null;
 end;
 first_booking:=public.fulfill_razorpay_test_booking(trip,rider,1,1000,'pay_regressionone','order_regressionone');
 again:=public.fulfill_razorpay_test_booking(trip,rider,1,1000,'pay_regressionone','order_regressionone');
 if first_booking<>again or (select seats_available from public.rides where id=trip)<>0 or (select count(*) from public.bookings where ride_id=trip)<>1 then raise exception 'Fulfillment is not idempotent'; end if;
 begin
  perform public.fulfill_razorpay_test_booking(trip,rider,1,1000,'pay_regressiontwo','order_regressiontwo');
  raise exception 'Overselling was allowed' using errcode='23514';
 exception when raise_exception then null;
 end;
end $$;
rollback;
select 'PASS: admin authorization, browser write protection, idempotent payment confirmation, seat capacity' as regression_checks;

