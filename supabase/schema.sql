-- ChamaMoto – Schema completo com Supabase Auth + RLS
-- Rode este script no Supabase: SQL Editor

-- ============================================================
-- 1. TABELAS
-- ============================================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text unique not null,
  tipo text check (tipo in ('passageiro','motoboy')) not null,
  criado_em timestamp default now()
);

create table drivers (
  id uuid primary key references users(id) on delete cascade,
  placa_moto text,
  status text check (status in ('disponivel','em_corrida','offline')) default 'offline',
  lat double precision,
  lng double precision,
  nota_media numeric default 5.0,
  atualizado_em timestamp default now()
);

create table rides (
  id uuid primary key default gen_random_uuid(),
  passageiro_id uuid references users(id) on delete cascade,
  motoboy_id uuid references users(id) on delete set null,
  origem_lat double precision,
  origem_lng double precision,
  destino_texto text,
  destino_lat double precision,
  destino_lng double precision,
  status text check (status in ('solicitada','aceita','em_andamento','concluida','cancelada')) default 'solicitada',
  preco numeric,
  avaliacao int,
  criado_em timestamp default now()
);

-- ============================================================
-- 2. REALTIME
-- ============================================================

alter publication supabase_realtime add table rides;
alter publication supabase_realtime add table drivers;

-- ============================================================
-- 3. INDEXES
-- ============================================================

create index idx_rides_status on rides(status);
create index idx_rides_passageiro on rides(passageiro_id);
create index idx_rides_motoboy on rides(motoboy_id);
create index idx_drivers_status on drivers(status);

-- ============================================================
-- 4. RLS + POLICIES
-- ============================================================

-- ── users ──
alter table users enable row level security;

-- Apenas usuários autenticados podem ler perfis
-- (necessário para passageiro ver nome do motoboy e vice-versa)
create policy "users_select_authenticated"
  on users for select
  using (auth.uid() is not null);

-- Usuário autenticado pode atualizar seu próprio perfil
create policy "users_update_own"
  on users for update
  using (auth.uid() = id);

-- Insert é feito pelo trigger handle_new_user (service role), não por policy
-- Mas precisamos de uma policy de insert para o trigger (executa como definer)
create policy "users_insert_trigger"
  on users for insert
  with check (auth.uid() = id);

-- ── drivers ──
alter table drivers enable row level security;

-- Apenas autenticados podem ver drivers
-- (passageiro precisa saber se motoboy está disponível / posição)
create policy "drivers_select_authenticated"
  on drivers for select
  using (auth.uid() is not null);

-- Driver só pode atualizar seu próprio registro
create policy "drivers_update_own"
  on drivers for update
  using (auth.uid() = id);

-- Driver pode inserir seu próprio registro (cadastro de moto)
create policy "drivers_insert_own"
  on drivers for insert
  with check (auth.uid() = id);

-- ── rides ──
alter table rides enable row level security;

-- Passageiro pode ver suas próprias corridas
create policy "rides_select_passenger"
  on rides for select
  using (auth.uid() = passageiro_id);

-- Motorista pode ver corridas solicitadas (para aceitar)
create policy "rides_select_available"
  on rides for select
  using (auth.uid() is not null AND status = 'solicitada');

-- Motorista pode ver corridas que ele aceitou
create policy "rides_select_driver"
  on rides for select
  using (auth.uid() = motoboy_id);

-- Passageiro pode criar corridas
create policy "rides_insert_passenger"
  on rides for insert
  with check (auth.uid() = passageiro_id);

-- Passageiro pode atualizar suas próprias corridas (cancelar, avaliar)
create policy "rides_update_passenger"
  on rides for update
  using (auth.uid() = passageiro_id);

-- Motorista pode aceitar corrida (status solicitada → aceita)
-- e fica vinculada ao motoboy que aceitou
create policy "rides_accept_driver"
  on rides for update
  using (
    status = 'solicitada'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.tipo = 'motoboy'
    )
  )
  with check (auth.uid() = motoboy_id);

-- Motorista pode atualizar status de corridas que aceitou
create policy "rides_update_driver"
  on rides for update
  using (auth.uid() = motoboy_id);

-- ============================================================
-- 5. TRIGGER: auto-criar users ao signUp com Supabase Auth
-- ============================================================

-- Função que insere na tabela users quando um novo auth user é criado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, nome, telefone, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce(new.raw_user_meta_data ->> 'tipo', 'passageiro')
  );
  return new;
end;
$$;

-- Trigger no auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 6. LEGADO (apenas na primeira execução)
-- ============================================================

-- DROP/CREATE precisam ser idempotentes. Se você já tinha tabelas do modelo
-- antigo (com id gen_random_uuid), elas precisam ser recriadas para referenciar auth.users.
-- Para ambiente de desenvolvimento, basta dropar e recriar tudo:
--   drop table if exists rides;
--   drop table if exists drivers;
--   drop table if exists users;
-- Depois rode o script completo novamente a partir do início.
