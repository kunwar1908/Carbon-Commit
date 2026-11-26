-- Ensure required columns from schema enhancement exist
alter table if exists user_profiles
  add column if not exists role user_role not null default 'USER';

alter table if exists notifications
  add column if not exists type notification_type not null default 'INFO';

-- Core analytics and audit functions
create or replace function public.update_analytics_cache(dept_id_param integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_emissions numeric(16,3) := 0;
  v_baseline numeric(12,2) := 0;
  v_variance numeric(12,3) := 0;
  v_percent_overage numeric(5,2) := 0;
  v_log_count integer := 0;
begin
  select
    coalesce(sum(al.co2_result), 0)::numeric(16,3),
    count(*)::integer
  into v_total_emissions, v_log_count
  from activity_logs al
  where al.dept_id = dept_id_param;

  select coalesce(dm.baseline, 0)::numeric(12,2)
  into v_baseline
  from dept_master dm
  where dm.id = dept_id_param;

  v_variance := (v_total_emissions - v_baseline)::numeric(12,3);

  if v_baseline > 0 then
    v_percent_overage := ((v_total_emissions - v_baseline) / v_baseline * 100)::numeric(5,2);
  else
    v_percent_overage := 0;
  end if;

  insert into analytics_cache (
    dept_id,
    total_emissions,
    baseline_usage,
    variance,
    percent_overage,
    log_count,
    last_updated,
    cached_at
  ) values (
    dept_id_param,
    v_total_emissions,
    v_baseline,
    v_variance,
    v_percent_overage,
    v_log_count,
    now(),
    now()
  )
  on conflict (dept_id)
  do update set
    total_emissions = excluded.total_emissions,
    baseline_usage = excluded.baseline_usage,
    variance = excluded.variance,
    percent_overage = excluded.percent_overage,
    log_count = excluded.log_count,
    last_updated = now();
end;
$$;

create or replace function public.get_leaderboard_data()
returns table (
  rank bigint,
  dept_id integer,
  dept_name text,
  total_emissions numeric,
  baseline numeric,
  variance numeric,
  percent_overage numeric,
  log_count integer
)
language sql
stable
as $$
  select
    row_number() over (order by coalesce(ac.total_emissions, 0) asc) as rank,
    d.id as dept_id,
    d.name as dept_name,
    coalesce(ac.total_emissions, 0)::numeric as total_emissions,
    d.baseline::numeric as baseline,
    coalesce(ac.variance, 0)::numeric as variance,
    coalesce(ac.percent_overage, 0)::numeric as percent_overage,
    coalesce(ac.log_count, 0)::integer as log_count
  from dept_master d
  left join analytics_cache ac on ac.dept_id = d.id
  where d.is_active = true
  order by coalesce(ac.total_emissions, 0) asc;
$$;

create or replace function public.get_department_analytics()
returns table (
  dept_id integer,
  dept_name text,
  total_emissions numeric,
  baseline numeric,
  variance numeric,
  percent_overage numeric,
  exceeds_baseline boolean,
  log_count integer,
  last_updated timestamp without time zone
)
language sql
stable
as $$
  select
    d.id as dept_id,
    d.name as dept_name,
    coalesce(ac.total_emissions, 0)::numeric as total_emissions,
    d.baseline::numeric as baseline,
    coalesce(ac.variance, 0)::numeric as variance,
    coalesce(ac.percent_overage, 0)::numeric as percent_overage,
    (coalesce(ac.total_emissions, 0) > d.baseline) as exceeds_baseline,
    coalesce(ac.log_count, 0)::integer as log_count,
    ac.last_updated
  from dept_master d
  left join analytics_cache ac on ac.dept_id = d.id
  where d.is_active = true
  order by d.id;
$$;

create or replace function public.log_audit_action(
  p_user_id text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_values jsonb,
  p_new_values jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
begin
  insert into audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    timestamp
  ) values (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.notify_baseline_exceeded(
  p_user_id text,
  p_dept_id integer,
  p_dept_name text,
  p_total_emissions numeric,
  p_baseline numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
begin
  insert into notifications (
    user_id,
    title,
    message,
    type,
    related_data,
    is_read,
    created_at
  ) values (
    p_user_id,
    'Baseline Exceeded',
    format('%s has exceeded baseline: %s vs %s CO2e', p_dept_name, p_total_emissions, p_baseline),
    'WARNING',
    jsonb_build_object(
      'dept_id', p_dept_id,
      'dept_name', p_dept_name,
      'total_emissions', p_total_emissions,
      'baseline', p_baseline
    ),
    false,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Trigger functions
create or replace function public.trigger_update_analytics_on_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform update_analytics_cache(new.dept_id);
  return new;
end;
$$;

create or replace function public.trigger_audit_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_dept_name text;
  v_total numeric;
  v_baseline numeric;
begin
  v_action := case when tg_op = 'INSERT' then 'CREATE' else 'UPDATE' end;

  perform log_audit_action(
    new.user_id,
    v_action,
    'ACTIVITY_LOG',
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );

  select d.name, d.baseline
  into v_dept_name, v_baseline
  from dept_master d
  where d.id = new.dept_id;

  select coalesce(sum(al.co2_result), 0)
  into v_total
  from activity_logs al
  where al.dept_id = new.dept_id;

  if v_baseline is not null and v_total > v_baseline then
    perform notify_baseline_exceeded(new.user_id, new.dept_id, coalesce(v_dept_name, 'Department'), v_total, v_baseline);
  end if;

  return new;
end;
$$;

create or replace function public.trigger_audit_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  v_action := case when tg_op = 'INSERT' then 'CREATE' else 'UPDATE' end;

  perform log_audit_action(
    new.id,
    v_action,
    'USER_PROFILE',
    new.id,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );

  return new;
end;
$$;

create or replace function public.trigger_update_notification_read_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_read = true and coalesce(old.is_read, false) = false then
    new.read_at := now();
  elsif new.is_read = false then
    new.read_at := null;
  end if;

  return new;
end;
$$;

-- Triggers

drop trigger if exists activity_logs_update_analytics_trigger on activity_logs;
create trigger activity_logs_update_analytics_trigger
after insert or update on activity_logs
for each row
execute function trigger_update_analytics_on_activity();

drop trigger if exists activity_logs_audit_trigger on activity_logs;
create trigger activity_logs_audit_trigger
after insert or update on activity_logs
for each row
execute function trigger_audit_activity_log();

drop trigger if exists user_profiles_audit_trigger on user_profiles;
create trigger user_profiles_audit_trigger
after insert or update on user_profiles
for each row
execute function trigger_audit_user_profile();

drop trigger if exists notifications_update_read_at_trigger on notifications;
create trigger notifications_update_read_at_trigger
before update on notifications
for each row
execute function trigger_update_notification_read_at();

-- RLS policies
alter table user_profiles enable row level security;
alter table activity_logs enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "User profiles select" on user_profiles;
create policy "User profiles select" on user_profiles
for select
using (
  auth.uid()::text = id
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
);

drop policy if exists "User profiles update" on user_profiles;
create policy "User profiles update" on user_profiles
for update
using (
  auth.uid()::text = id
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
)
with check (
  auth.uid()::text = id
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
);

drop policy if exists "Activity logs select" on activity_logs;
create policy "Activity logs select" on activity_logs
for select
using (
  user_id = auth.uid()::text
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'MANAGER'
      and up.dept_id = activity_logs.dept_id
  )
);

drop policy if exists "Activity logs insert" on activity_logs;
create policy "Activity logs insert" on activity_logs
for insert
with check (
  user_id = auth.uid()::text
  or exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
);

drop policy if exists "Notifications select" on notifications;
create policy "Notifications select" on notifications
for select
using (user_id = auth.uid()::text);

drop policy if exists "Notifications update" on notifications;
create policy "Notifications update" on notifications
for update
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists "Audit logs select (admin only)" on audit_logs;
create policy "Audit logs select (admin only)" on audit_logs
for select
using (
  exists (
    select 1
    from user_profiles up
    where up.id = auth.uid()::text
      and up.role = 'ADMIN'
  )
);
