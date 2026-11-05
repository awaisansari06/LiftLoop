-- Private file policies. No bucket is made public.
begin;
create policy liftloop_files_read on storage.objects for select to authenticated using (
 (bucket_id='profile-photos') or
 (bucket_id='driver-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_approved_admin())) or
 (bucket_id='attachments' and (private.is_approved_admin() or ((storage.foldername(name))[1]='support' and (storage.foldername(name))[2]=(select auth.uid())::text) or ((storage.foldername(name))[1]='chat' and private.ride_member(((storage.foldername(name))[2])::uuid))))
);
create policy liftloop_files_insert on storage.objects for insert to authenticated with check (
 (bucket_id in ('profile-photos','driver-documents') and (storage.foldername(name))[1]=(select auth.uid())::text) or
 (bucket_id='attachments' and (private.is_approved_admin() or ((storage.foldername(name))[1]='support' and (storage.foldername(name))[2]=(select auth.uid())::text) or ((storage.foldername(name))[1]='chat' and private.ride_member(((storage.foldername(name))[2])::uuid))))
);
create policy liftloop_files_update on storage.objects for update to authenticated using(bucket_id in ('profile-photos','driver-documents') and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id in ('profile-photos','driver-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Protect approval fields while allowing the existing admin review and owner resubmission APIs.
create or replace function public.guard_verification() returns trigger language plpgsql set search_path='' as $$
begin
 if not private.is_approved_admin() and current_user in ('authenticated','anon') then
  if new.user_id<>auth.uid() or new.verification_status<>'pending' or new.verified_by is not null or new.verified_at is not null then raise exception 'Only administrators may approve documents' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger guard_verification before insert or update on public.driver_verification for each row execute function public.guard_verification();
grant update on public.driver_verification to authenticated;
-- Realtime must explicitly publish newly added feature tables.
do $$ declare t text; begin
 foreach t in array array['rides','bookings','messages','notifications','live_locations','sos_alerts','support_messages','driver_verification'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
