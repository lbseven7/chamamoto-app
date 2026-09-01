import type { RealtimeChannel } from '@supabase/supabase-js';
import supabase from './supabase';
import type { Ride } from '../types';

export async function criarCorrida(dados: {
  passageiro_id: string;
  origem_lat: number;
  origem_lng: number;
  destino_texto: string;
  destino_lat: number;
  destino_lng: number;
  preco: number;
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
    .select('*, passageiros:passageiro_id (nome, telefone)')
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
  const { data, error } = await supabase
    .from('rides')
    .update({
      status: 'aceita',
      motoboy_id: motoboyId,
    })
    .eq('id', rideId)
    .eq('status', 'solicitada')
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Essa corrida já foi aceita por outro motoboy.');
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

export async function buscarCorridaComPassageiro(
  rideId: string
): Promise<RideComPassageiro | null> {
  const { data, error } = await supabase
    .from('rides')
    .select('*, passageiros:passageiro_id (nome, telefone)')
    .eq('id', rideId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as RideComPassageiro | null;
}

export async function listarCorridasDoMotoboy(
  motoboyId: string
): Promise<RideComPassageiro[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*, passageiros:passageiro_id (nome, telefone)')
    .eq('motoboy_id', motoboyId)
    .in('status', ['aceita', 'em_andamento'])
    .order('criado_em', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as RideComPassageiro[];
}

export async function avaliarCorrida(
  rideId: string,
  nota: number
): Promise<void> {
  const notaFinal = Math.max(1, Math.min(5, Math.round(nota)));

  const { data: ride, error: erroRide } = await supabase
    .from('rides')
    .select('motoboy_id')
    .eq('id', rideId)
    .single();

  if (erroRide) {
    throw new Error(erroRide.message);
  }
  if (!ride.motoboy_id) {
    throw new Error('Corrida sem motoboy associado.');
  }

  const { error: erroNota } = await supabase
    .from('rides')
    .update({ avaliacao: notaFinal })
    .eq('id', rideId);

  if (erroNota) {
    throw new Error(erroNota.message);
  }

  const { data: avaliacoes, error: erroNotas } = await supabase
    .from('rides')
    .select('avaliacao')
    .eq('motoboy_id', ride.motoboy_id)
    .not('avaliacao', 'is', null);

  if (erroNotas) {
    throw new Error(erroNotas.message);
  }

  const notas = (avaliacoes ?? [])
    .map((item) => item.avaliacao as number)
    .filter((n) => typeof n === 'number' && n > 0);

  const media =
    notas.length > 0
      ? Math.round((notas.reduce((soma, n) => soma + n, 0) / notas.length) * 10) / 10
      : 5;

  const { error: erroDriver } = await supabase
    .from('drivers')
    .update({ nota_media: media })
    .eq('id', ride.motoboy_id);

  if (erroDriver) {
    throw new Error(erroDriver.message);
  }
}

export function assinarCorrida(
  rideId: string,
  aoMudar: (ride: Ride) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`corrida-${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`,
      },
      (payload) => aoMudar(payload.new as Ride)
    )
    .subscribe();
  return channel;
}

export function pararAssinaturaCorrida(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

export function assinarNovasCorridas(
  aoNova: (ride: RideComPassageiro) => void
): RealtimeChannel {
  const channel = supabase
    .channel('novas-corridas')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.solicitada',
      },
      (payload) => {
        const id = (payload.new as Ride).id;
        buscarCorridaComPassageiro(id)
          .then((ride) => {
            if (ride && ride.status === 'solicitada') aoNova(ride);
          })
          .catch(() => {});
      }
    )
    .subscribe();
  return channel;
}

export function pararAssinaturaNovasCorridas(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
