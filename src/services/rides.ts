import supabase from './supabase';
import type { Ride } from '../types';

export async function criarCorrida(dados: {
  passageiro_id: string;
  origem_lat: number;
  origem_lng: number;
  destino_texto: string;
}): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .insert({ ...dados })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export interface RideComPassageiro extends Ride {
  passageiros: { nome: string; telefone: string } | null;
}

export async function listarCorridasSolicitadas(): Promise<RideComPassageiro[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*, passageiros (nome, telefone)')
    .eq('status', 'solicitada')
    .order('criado_em', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as RideComPassageiro[];
}

export async function aceitarCorrida(
  rideId: string,
  motoboyId: string
): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({
      status: 'aceita',
      motoboy_id: motoboyId,
    })
    .eq('id', rideId)
    .eq('status', 'solicitada');

  if (error) {
    throw new Error(error.message);
  }
}

export type RideStatus =
  | 'solicitada'
  | 'aceita'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export async function atualizarStatusCorrida(
  rideId: string,
  status: RideStatus
): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({ status })
    .eq('id', rideId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function buscarCorrida(rideId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides')
    .select()
    .eq('id', rideId)
    .single();

  if (error) {
    return null;
  }
  return data as Ride;
}

export async function listarCorridasDoMotoboy(
  motoboyId: string
): Promise<RideComPassageiro[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*, passageiros (nome, telefone)')
    .eq('motoboy_id', motoboyId)
    .in('status', ['aceita', 'em_andamento'])
    .order('criado_em', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as RideComPassageiro[];
}
