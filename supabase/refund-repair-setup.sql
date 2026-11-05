begin;
-- Only the verified server refund path can call this transaction.
create or replace function public.finalize_test_refund(booking uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare trip uuid; item public.bookings;
begin
 select ride_id into trip from public.bookings where id=booking;
 perform 1 from public.rides where id=trip for update;
 select * into item from public.bookings where id=booking for update;
 if item.id is null or item.payment_provider<>'razorpay_test' then raise exception 'Test booking not found'; end if;
 if item.status='cancelled' and item.payment_status='refunded' then return booking; end if;
 if item.status not in ('confirmed','pending') then raise exception 'Booking cannot be cancelled'; end if;
 update public.bookings set status='cancelled',payment_status='refunded' where id=booking;
 update public.rides set seats_available=seats_available+item.seats_booked where id=trip;
 return booking;
end $$;
revoke all on function public.finalize_test_refund(uuid) from public,anon,authenticated;
grant execute on function public.finalize_test_refund(uuid) to service_role;
notify pgrst,'reload schema';
commit;
