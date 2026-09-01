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
