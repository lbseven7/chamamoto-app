export type UserRole = 'passageiro' | 'motoboy';

export interface User {
  id: string;
  nome: string;
  telefone: string;
  tipo: UserRole;
  criado_em: string;
}

export interface Driver {
  id: string;
  placa_moto: string | null;
  status: 'disponivel' | 'em_corrida' | 'offline';
  lat: number | null;
  lng: number | null;
  nota_media: number;
  atualizado_em: string;
}

export interface Ride {
  id: string;
  passageiro_id: string;
  motoboy_id: string | null;
  origem_lat: number;
  origem_lng: number;
  destino_texto: string;
  destino_lat: number | null;
  destino_lng: number | null;
  status:
    | 'solicitada'
    | 'aceita'
    | 'em_andamento'
    | 'concluida'
    | 'cancelada';
  avaliacao: number | null;
  criado_em: string;
}
