alter table public.user_roles add column role_locked boolean not null default true;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  insert into public.subscriptions(user_id) values (new.id);
  insert into public.user_roles(user_id, role, role_locked) values (new.id, case when new.raw_user_meta_data->>'role' = 'client' then 'client'::public.app_role else 'freelancer'::public.app_role end, new.raw_user_meta_data->>'role' in ('client','freelancer')) on conflict (user_id) do nothing;
  return new;
end $$;
-- Explicit role supplied at signup is locked; Google users get a single initial selection.
create or replace function public.set_my_role(_role public.app_role) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.user_roles set role = _role, role_locked = true
  where user_id = auth.uid() and not role_locked
    and created_at > now() - interval '1 hour'
    and not exists (select 1 from public.clients where user_id = auth.uid())
    and not exists (select 1 from public.projects where user_id = auth.uid());
  if not found then raise exception 'Your role can no longer be changed'; end if;
end $$;
-- Restrictive policies also cover metadata and plan reads.
create policy "freelancer subscriptions" on public.subscriptions as restrictive for select to authenticated using (public.has_role(auth.uid(),'freelancer'));
create policy "freelancer invoice items" on public.invoice_items as restrictive for select to authenticated using (public.has_role(auth.uid(),'freelancer'));

-- Retain transactional invoice logic and add a role check inside the definer function.
do $$
declare fn text;
begin
  select pg_get_functiondef('public.create_invoice(uuid,date,date,numeric,date,text)'::regprocedure) into fn;
  fn := replace(fn, 'if uid is null then raise exception ''Not authenticated''; end if;', 'if uid is null then raise exception ''Not authenticated''; end if; if not public.has_role(uid, ''freelancer'') then raise exception ''Freelancer access required''; end if;');
  execute fn;
end $$;
revoke execute on function public.set_my_plan(public.plan_tier) from public, anon, authenticated;
grant execute on function public.set_my_plan(public.plan_tier) to service_role;
revoke execute on function public.current_plan(uuid) from public, anon, authenticated;
grant execute on function public.current_plan(uuid) to service_role;
revoke execute on function public.has_role(uuid,public.app_role) from public, anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated;

create or replace function public.client_invoice_pdf_allowed(_invoice_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists (select 1 from public.invoices i where i.id = _invoice_id and i.id in (select ci.id from public.client_invoices() ci) and public.current_plan(i.user_id) = 'PRO')
$$;

-- Shared projects are opt-in for newly created projects, while existing choices are preserved.
alter table public.projects alter column shared_with_client set default false;

create or replace function public.notify_on_project() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shared_with_client and (tg_op = 'INSERT' or new.status is distinct from old.status or new.deadline is distinct from old.deadline or new.shared_with_client is distinct from old.shared_with_client) then
    insert into public.notifications(user_id,kind,title,body,link)
    select uid, 'project', 'Project update: ' || new.name, new.status::text || coalesce(' · Due ' || new.deadline::text,''), '/client/projects' from public.client_user_ids(new.client_id) uid;
  end if;
  return new;
end $$;
create trigger projects_notify after insert or update on public.projects for each row execute function public.notify_on_project();

-- Preference checks apply regardless of which event generated the notification.
create or replace function public.filter_notification_preferences() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.user_id and ((new.kind = 'message' and not p.notify_messages) or (new.kind in ('deliverable','approval') and not p.notify_deliverables) or (new.kind = 'payment' and not p.notify_payments))) then return null; end if;
  return new;
end $$;
create trigger notification_preferences before insert on public.notifications for each row execute function public.filter_notification_preferences();

revoke execute on function public.my_role(), public.set_my_role(public.app_role), public.my_verified_email(), public.client_project_ids(), public.can_access_project(uuid), public.client_projects(), public.client_tasks(), public.client_invoices(), public.client_invoice_items(uuid), public.review_deliverable(uuid,text,text), public.client_invoice_pdf_allowed(uuid), public.can_access_project_path(text), public.owns_project_path(text), public.create_invoice(uuid,date,date,numeric,date,text) from public, anon;
grant execute on function public.my_role(), public.set_my_role(public.app_role), public.my_verified_email(), public.client_project_ids(), public.can_access_project(uuid), public.client_projects(), public.client_tasks(), public.client_invoices(), public.client_invoice_items(uuid), public.review_deliverable(uuid,text,text), public.client_invoice_pdf_allowed(uuid), public.can_access_project_path(text), public.owns_project_path(text), public.create_invoice(uuid,date,date,numeric,date,text) to authenticated;