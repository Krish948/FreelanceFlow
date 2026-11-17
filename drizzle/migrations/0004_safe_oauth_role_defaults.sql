create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  insert into public.subscriptions(user_id) values (new.id);
  insert into public.user_roles(user_id, role, role_locked) values (new.id, case when new.raw_user_meta_data->>'role' = 'client' then 'client'::public.app_role else 'freelancer'::public.app_role end, coalesce(new.raw_user_meta_data->>'role' in ('client','freelancer'),false)) on conflict (user_id) do nothing;
  return new;
end $$;
alter table public.profiles add column default_hourly_rate numeric not null default 0;
create or replace function public.validate_profile_rate() returns trigger language plpgsql set search_path=public as $$
begin
 if new.default_hourly_rate < 0 then raise exception 'Hourly rate cannot be negative'; end if;
 return new;
end $$;
create trigger profile_rate before insert or update on public.profiles for each row execute function public.validate_profile_rate();