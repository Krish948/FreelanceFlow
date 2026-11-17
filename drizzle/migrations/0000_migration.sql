
create type public.plan_tier as enum ('FREE','PRO');
create type public.project_status as enum ('ACTIVE','COMPLETED','ON_HOLD');
create type public.task_status as enum ('TODO','IN_PROGRESS','COMPLETED');
create type public.task_priority as enum ('LOW','MEDIUM','HIGH');
create type public.invoice_status as enum ('DRAFT','SENT','PAID','OVERDUE');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end $$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  business_name text, address text, phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- subscriptions (read-only for users)
create table public.subscriptions (
  user_id uuid primary key,
  plan public.plan_tier not null default 'FREE',
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own sub read" on public.subscriptions for select to authenticated using (user_id = auth.uid());

create or replace function public.current_plan(_uid uuid) returns public.plan_tier language sql stable security definer set search_path=public as $$
  select coalesce((select plan from public.subscriptions where user_id=_uid), 'FREE'::public.plan_tier)
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  insert into public.subscriptions(user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null, company text, email text, phone text, address text,
  default_hourly_rate numeric(12,2) not null default 0 check (default_hourly_rate >= 0),
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "own clients" on public.clients for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();

create or replace function public.enforce_client_limit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.user_id := auth.uid();
  if public.current_plan(new.user_id) = 'FREE' and (select count(*) from public.clients where user_id = new.user_id) >= 2 then
    raise exception 'PLAN_LIMIT: You''ve reached the Free plan limit of 2 clients. Upgrade to Pro to add unlimited clients.';
  end if;
  return new;
end $$;
create trigger clients_limit before insert on public.clients for each row execute function public.enforce_client_limit();

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, description text,
  status public.project_status not null default 'ACTIVE',
  budget numeric(12,2) not null default 0 check (budget >= 0),
  hourly_rate numeric(12,2),
  start_date date, deadline date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid()));
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, description text,
  status public.task_status not null default 'TODO',
  priority public.task_priority not null default 'MEDIUM',
  due_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();

-- time logs
create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text,
  start_time timestamptz not null, end_time timestamptz not null,
  duration_minutes integer not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  billable boolean not null default true,
  billable_amount numeric(12,2) not null default 0,
  billed boolean not null default false,
  invoice_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.time_logs to authenticated;
grant all on public.time_logs to service_role;
alter table public.time_logs enable row level security;
create policy "own logs" on public.time_logs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create or replace function public.compute_time_log() returns trigger language plpgsql security definer set search_path=public as $$
declare r numeric;
begin
  if tg_op = 'UPDATE' and old.billed and auth.uid() is not null and current_setting('app.invoicing', true) is distinct from 'on' then
    raise exception 'This time entry is already invoiced and cannot be changed.';
  end if;
  if new.end_time <= new.start_time then raise exception 'End time must be after start time'; end if;
  new.duration_minutes := round(extract(epoch from (new.end_time - new.start_time)) / 60.0)::int;
  select coalesce(p.hourly_rate, c.default_hourly_rate, 0) into r
    from public.projects p join public.clients c on c.id = p.client_id where p.id = new.project_id;
  new.hourly_rate := coalesce(r, 0);
  new.billable_amount := case when new.billable then round(new.duration_minutes::numeric * new.hourly_rate / 60, 2) else 0 end;
  return new;
end $$;
create trigger time_logs_compute before insert or update on public.time_logs for each row execute function public.compute_time_log();

create or replace function public.prevent_billed_delete() returns trigger language plpgsql set search_path=public as $$
begin if old.billed then raise exception 'Invoiced time entries cannot be deleted.'; end if; return old; end $$;
create trigger time_logs_nodel before delete on public.time_logs for each row execute function public.prevent_billed_delete();

-- invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date not null,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status public.invoice_status not null default 'DRAFT',
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);
grant select, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "own invoices read" on public.invoices for select to authenticated using (user_id = auth.uid());
create policy "own invoices update" on public.invoices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own draft delete" on public.invoices for delete to authenticated using (user_id = auth.uid() and status = 'DRAFT');
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();

create or replace function public.guard_invoice_update() returns trigger language plpgsql set search_path=public as $$
begin
  if current_setting('app.invoicing', true) is distinct from 'on' then
    new.subtotal := old.subtotal; new.tax := old.tax; new.total := old.total; new.tax_rate := old.tax_rate;
    new.client_id := old.client_id; new.invoice_number := old.invoice_number; new.user_id := old.user_id;
  end if;
  if new.status = 'PAID' and old.status <> 'PAID' then new.paid_at := now(); end if;
  if new.status <> 'PAID' then new.paid_at := null; end if;
  return new;
end $$;
create trigger invoices_guard before update on public.invoices for each row execute function public.guard_invoice_update();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null,
  description text not null,
  quantity numeric(10,2) not null,
  rate numeric(12,2) not null,
  amount numeric(12,2) not null,
  time_log_id uuid references public.time_logs(id) on delete set null
);
grant select on public.invoice_items to authenticated;
grant all on public.invoice_items to service_role;
alter table public.invoice_items enable row level security;
create policy "own items read" on public.invoice_items for select to authenticated using (user_id = auth.uid());

-- release time logs when a draft invoice is deleted
create or replace function public.release_logs_on_invoice_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform set_config('app.invoicing','on', true);
  update public.time_logs set billed = false, invoice_id = null where invoice_id = old.id;
  return old;
end $$;
create trigger invoices_release before delete on public.invoices for each row execute function public.release_logs_on_invoice_delete();

-- transaction-safe invoice creation
create or replace function public.create_invoice(_client_id uuid, _from date, _to date, _tax_rate numeric, _due_date date, _notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); inv uuid; sub numeric(12,2); t numeric(12,2); num text; n int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.clients where id=_client_id and user_id=uid) then raise exception 'Client not found'; end if;
  if _tax_rate < 0 or _tax_rate > 100 then raise exception 'Invalid tax rate'; end if;
  perform set_config('app.invoicing','on', true);

  create temp table _logs on commit drop as
    select l.* from public.time_logs l join public.projects p on p.id = l.project_id
    where l.user_id = uid and p.client_id = _client_id and not l.billed and l.billable
      and l.start_time::date between _from and _to
    for update of l;
  if not exists (select 1 from _logs) then raise exception 'No unbilled time in this date range'; end if;

  select coalesce(sum(billable_amount),0) into sub from _logs;
  t := round(sub * _tax_rate / 100, 2);
  select count(*)+1 into n from public.invoices where user_id = uid;
  num := 'INV-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
  while exists (select 1 from public.invoices where user_id=uid and invoice_number=num) loop
    n := n+1; num := 'INV-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
  end loop;

  insert into public.invoices(user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax, total, notes)
  values (uid, _client_id, num, current_date, _due_date, sub, _tax_rate, t, sub + t, _notes) returning id into inv;

  insert into public.invoice_items(invoice_id, user_id, description, quantity, rate, amount, time_log_id)
  select inv, uid, p.name || coalesce(' — ' || nullif(l.description,''), '') || ' (' || to_char(l.start_time,'DD Mon') || ')',
         round(l.duration_minutes::numeric/60, 2), l.hourly_rate, l.billable_amount, l.id
  from _logs l join public.projects p on p.id = l.project_id;

  update public.time_logs set billed = true, invoice_id = inv where id in (select id from _logs);
  return inv;
end $$;
grant execute on function public.create_invoice(uuid, date, date, numeric, date, text) to authenticated;

-- dev-only: toggle plan (simulated upgrade, no payment gateway)
create or replace function public.set_my_plan(_plan public.plan_tier) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.subscriptions(user_id, plan) values (auth.uid(), _plan)
  on conflict (user_id) do update set plan = excluded.plan, updated_at = now();
end $$;
grant execute on function public.set_my_plan(public.plan_tier) to authenticated;
