-- Tabelas do ChamaMoto
-- Rode este script no Supabase: SQL Editor
-- Modelo simples: cadastro por telefone (sem Supabase Auth / RLS)

create table users (
  id uuid primary key default gen_random_uuid(),
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
  status text check (status in ('solicitada','aceita','em_andamento','concluida','cancelada')) default 'solicitada',
  avaliacao int,
  criado_em timestamp default now()
);

-- Realtime (postgres_changes): necessária para o app reagir às mudanças de status.
-- Se já rodou o script antes, execute apenas a linha abaixo:
alter publication supabase_realtime add table rides;
alter publication supabase_realtime add table drivers;

-- Comentar a linha abaixo para ativar RLS no futuro.
-- Para o modelo por telefone (sem Supabase Auth), as tabelas ficam abertas
-- via anon key. Em produção, ative RLS e use Supabase Auth.
-- alter table users enable row level security;
-- alter table drivers enable row level security;
-- alter table rides enable row level security;
