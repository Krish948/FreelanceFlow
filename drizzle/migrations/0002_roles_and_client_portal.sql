create type public.app_role as enum ('freelancer','client');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own role read" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

insert into public.user_roles(user_id, role) select id, 'freelancer' from auth.users on conflict (user_id) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  insert into public.subscriptions(user_id) values (new.id);
  insert into public.user_roles(user_id, role) values (new.id, case when new.raw_user_meta_data->>'role' = 'client' then 'client'::public.app_role else 'freelancer'::public.app_role end)
    on conflict (user_id) do nothing;
  return new;
end $$;

-- A brand-new account (e.g. Google sign-up) may pick its role once, before it owns any data.
create or replace function public.set_my_role(_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select created_at from auth.users where id = auth.uid()) < now() - interval '1 hour' then
    raise exception 'Your role can no longer be changed';
  end if;
  if exists (select 1 from public.clients where user_id = auth.uid()) or exists (select 1 from public.projects where user_id = auth.uid()) then
    raise exception 'Your role can no longer be changed';
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), _role)
    on conflict (user_id) do update set role = excluded.role;
end $$;

create or replace function public.my_verified_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null
$$;

alter table public.projects add column shared_with_client boolean not null default true;
alter table public.tasks add column client_visible boolean not null default false;
alter table public.tasks add column if not exists phase text;
alter table public.profiles add column notify_messages boolean not null default true;
alter table public.profiles add column notify_deliverables boolean not null default true;
alter table public.profiles add column notify_payments boolean not null default true;

-- Only freelancers may work with the business tables.
create policy "freelancers only" on public.clients as restrictive for all to authenticated using (public.has_role(auth.uid(),'freelancer')) with check (public.has_role(auth.uid(),'freelancer'));
create policy "freelancers only" on public.projects as restrictive for all to authenticated using (public.has_role(auth.uid(),'freelancer')) with check (public.has_role(auth.uid(),'freelancer'));
create policy "freelancers only" on public.tasks as restrictive for all to authenticated using (public.has_role(auth.uid(),'freelancer')) with check (public.has_role(auth.uid(),'freelancer'));
create policy "freelancers only" on public.time_logs as restrictive for all to authenticated using (public.has_role(auth.uid(),'freelancer')) with check (public.has_role(auth.uid(),'freelancer'));
create policy "freelancers only" on public.invoices as restrictive for all to authenticated using (public.has_role(auth.uid(),'freelancer')) with check (public.has_role(auth.uid(),'freelancer'));

create or replace function public.client_project_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.projects p join public.clients c on c.id = p.client_id
  where p.shared_with_client and public.has_role(auth.uid(),'client')
    and c.email is not null and lower(c.email) = public.my_verified_email()
$$;
create or replace function public.can_access_project(_pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = _pid and user_id = auth.uid())
      or _pid in (select public.client_project_ids())
$$;
create or replace function public.client_user_ids(_client_id uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select u.id from auth.users u join public.user_roles r on r.user_id = u.id and r.role = 'client'
  join public.clients c on c.id = _client_id
  where u.email_confirmed_at is not null and c.email is not null and lower(u.email) = lower(c.email)
$$;
revoke execute on function public.client_user_ids(uuid) from public, anon, authenticated;

create or replace function public.client_projects()
returns table(id uuid, name text, description text, status public.project_status, start_date date, deadline date, freelancer_name text, total_tasks int, done_tasks int)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.description, p.status, p.start_date, p.deadline,
    coalesce(nullif(pr.business_name,''), pr.name),
    (select count(*)::int from public.tasks t where t.project_id = p.id and t.client_visible),
    (select count(*)::int from public.tasks t where t.project_id = p.id and t.client_visible and t.status = 'COMPLETED')
  from public.projects p left join public.profiles pr on pr.id = p.user_id
  where p.id in (select public.client_project_ids())
  order by p.created_at desc
$$;
create or replace function public.client_tasks()
returns table(id uuid, project_id uuid, project_name text, title text, description text, status public.task_status, priority public.task_priority, due_date date, phase text)
language sql stable security definer set search_path = public as $$
  select t.id, t.project_id, p.name, t.title, t.description, t.status, t.priority, t.due_date, t.phase
  from public.tasks t join public.projects p on p.id = t.project_id
  where t.client_visible and t.project_id in (select public.client_project_ids())
  order by t.due_date nulls last, t.created_at
$$;
create or replace function public.client_invoices()
returns table(id uuid, invoice_number text, issue_date date, due_date date, subtotal numeric, tax_rate numeric, tax numeric, total numeric, status public.invoice_status, paid_at timestamptz, notes text, client_name text, freelancer_name text, freelancer_business text, freelancer_email text, freelancer_address text)
language sql stable security definer set search_path = public as $$
  select i.id, i.invoice_number, i.issue_date, i.due_date, i.subtotal, i.tax_rate, i.tax, i.total, i.status, i.paid_at, i.notes,
    c.name, pr.name, pr.business_name, pr.email, pr.address
  from public.invoices i join public.clients c on c.id = i.client_id left join public.profiles pr on pr.id = i.user_id
  where i.status <> 'DRAFT' and public.has_role(auth.uid(),'client')
    and c.email is not null and lower(c.email) = public.my_verified_email()
  order by i.issue_date desc
$$;
create or replace function public.client_invoice_items(_invoice_id uuid)
returns table(description text, quantity numeric, rate numeric, amount numeric)
language sql stable security definer set search_path = public as $$
  select it.description, it.quantity, it.rate, it.amount from public.invoice_items it
  where it.invoice_id = _invoice_id and _invoice_id in (select ci.id from public.client_invoices() ci)
$$;

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  version int not null default 1,
  file_path text not null,
  file_name text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REVISION_REQUESTED')),
  feedback text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.deliverables to authenticated;
grant all on public.deliverables to service_role;
alter table public.deliverables enable row level security;
create policy "owner deliverables" on public.deliverables for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "client reads shared deliverables" on public.deliverables for select to authenticated
  using (project_id in (select public.client_project_ids()));

create or replace function public.review_deliverable(_id uuid, _decision text, _feedback text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _decision not in ('APPROVED','REVISION_REQUESTED') then raise exception 'Invalid decision'; end if;
  if _decision = 'REVISION_REQUESTED' and coalesce(trim(_feedback),'') = '' then raise exception 'Please describe the changes you need'; end if;
  update public.deliverables set status = _decision, feedback = nullif(trim(_feedback),''), reviewed_at = now()
  where id = _id and project_id in (select public.client_project_ids());
  if not found then raise exception 'Deliverable not found'; end if;
end $$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "project members read" on public.messages for select to authenticated using (public.can_access_project(project_id));
create policy "project members write" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.can_access_project(project_id));
alter publication supabase_realtime add table public.messages;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify_on_deliverable() returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.projects where id = new.project_id;
  if tg_op = 'INSERT' then
    if p.shared_with_client then
      insert into public.notifications(user_id, kind, title, body, link)
      select uid, 'deliverable', 'New deliverable: ' || new.title, p.name || ' · version ' || new.version, '/client/deliverables'
      from public.client_user_ids(p.client_id) uid;
    end if;
  elsif new.status is distinct from old.status and new.status <> 'PENDING' then
    insert into public.notifications(user_id, kind, title, body, link)
    values (new.user_id, 'approval',
      case when new.status = 'APPROVED' then 'Deliverable approved: ' else 'Revision requested: ' end || new.title,
      coalesce(new.feedback, p.name), '/freelancer/deliverables');
  end if;
  return new;
end $$;
create trigger deliverables_notify after insert or update on public.deliverables for each row execute function public.notify_on_deliverable();

create or replace function public.notify_on_message() returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.projects where id = new.project_id;
  if new.sender_id = p.user_id then
    insert into public.notifications(user_id, kind, title, body, link)
    select uid, 'message', 'New message · ' || p.name, left(new.body, 140), '/client/messages'
    from public.client_user_ids(p.client_id) uid;
  else
    insert into public.notifications(user_id, kind, title, body, link)
    values (p.user_id, 'message', 'Client message · ' || p.name, left(new.body, 140), '/freelancer/messages');
  end if;
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_on_message();

create or replace function public.notify_on_invoice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'SENT' and old.status is distinct from 'SENT' then
    insert into public.notifications(user_id, kind, title, body, link)
    select uid, 'payment', 'New invoice ' || new.invoice_number, 'Due ' || to_char(new.due_date, 'DD Mon YYYY'), '/client/invoices'
    from public.client_user_ids(new.client_id) uid;
  elsif new.status = 'OVERDUE' and old.status is distinct from 'OVERDUE' then
    insert into public.notifications(user_id, kind, title, body, link)
    select uid, 'payment', 'Payment reminder: ' || new.invoice_number, 'This invoice is overdue', '/client/invoices'
    from public.client_user_ids(new.client_id) uid;
  end if;
  return new;
end $$;
create trigger invoices_notify after update on public.invoices for each row execute function public.notify_on_invoice();

create or replace function public.can_access_project_path(_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id::text = split_part(_name, '/', 1)
    and (p.user_id = auth.uid() or p.id in (select public.client_project_ids())))
$$;
create or replace function public.owns_project_path(_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id::text = split_part(_name, '/', 1) and p.user_id = auth.uid())
$$;
create policy "deliverable files read" on storage.objects for select to authenticated using (bucket_id = 'deliverables' and public.can_access_project_path(name));
create policy "deliverable files upload" on storage.objects for insert to authenticated with check (bucket_id = 'deliverables' and public.owns_project_path(name));
create policy "deliverable files delete" on storage.objects for delete to authenticated using (bucket_id = 'deliverables' and public.owns_project_path(name));