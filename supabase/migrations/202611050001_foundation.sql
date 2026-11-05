-- LiftLoop foundation: accounts and searchable rides.
-- Run once in your own Supabase project's SQL Editor.
-- This intentionally does not implement payments, bookings, verification or storage.
begin;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text, phone text, profile_photo text,
 user_type text not null default 'student' check (user_type in ('student','driver','both','admin','pending_admin')),
 profile_complete integer not null default 0 check (profile_complete between 0 and 100),
 emergency_contact_phone text,
 admin_approved boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.rides (
 id uuid primary key default gen_random_uuid(),
 driver_id uuid not null references public.users(id),
 from_location jsonb not null check (jsonb_typeof(from_location) = 'object' and from_location ? 'lat' and from_location ? 'lng'),
 to_location jsonb not null check (jsonb_typeof(to_location) = 'object' and to_location ? 'lat' and to_location ? 'lng'),
 departure_time timestamptz not null,
 seats_available integer not null check (seats_available between 0 and 8),
 price_per_seat numeric(10,2) not null default 0 check (price_per_seat >= 0),
 status text not null default 'active' check (status in ('active','in_progress','completed','cancelled')),
 route_polyline text,
 created_at timestamptz not null default now()
);
create index rides_departure_idx on public.rides(status, departure_time);
create index rides_driver_idx on public.rides(driver_id);

-- Privileged fields cannot be granted by changing browser code or public env values.
create function public.guard_profile() returns trigger language plpgsql set search_path = '' as $$
begin
 if current_user in ('anon','authenticated') then
  if new.id is distinct from auth.uid() then raise exception 'Cannot edit another profile'; end if;
  if tg_op = 'UPDATE' then
   if new.id is distinct from old.id or new.email is distinct from old.email or new.admin_approved is distinct from old.admin_approved then
    raise exception 'Protected account fields cannot be changed';
   end if;
   if old.user_type = 'admin' then
    new.user_type := old.user_type;
   elsif new.user_type = 'admin' then
    new.user_type := 'pending_admin';
   end if;
  else
   new.email := coalesce(auth.jwt()->>'email','');
   new.admin_approved := false;
   if new.user_type = 'admin' then new.user_type := 'pending_admin'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger guard_profile before insert or update on public.users for each row execute function public.guard_profile();

-- Backfill accounts that have already signed in. Future profiles are created by the app callback.
insert into public.users(id,email,full_name,profile_photo)
select id,coalesce(email,''),raw_user_meta_data->>'full_name',raw_user_meta_data->>'avatar_url' from auth.users;

alter table public.users enable row level security;
alter table public.rides enable row level security;
revoke all on public.users, public.rides from anon, authenticated;
-- Profiles are private in this foundation. Other riders see no joined driver profile until a public-profile interface is implemented.
grant select on public.users to anon, authenticated;
grant insert, update on public.users to authenticated;
grant select on public.rides to anon, authenticated;
grant insert, update, delete on public.rides to authenticated;
create policy profile_read on public.users for select using (id = auth.uid());
create policy profile_create on public.users for insert to authenticated with check (id = auth.uid());
create policy profile_edit on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy ride_read on public.rides for select using (status = 'active' or driver_id = auth.uid());
create policy ride_create on public.rides for insert to authenticated with check (driver_id = auth.uid() and exists(select 1 from public.users u where u.id = auth.uid() and u.user_type in ('driver','both')));
create policy ride_edit on public.rides for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy ride_delete on public.rides for delete to authenticated using (driver_id = auth.uid());
notify pgrst, 'reload schema';
commit;
