import supabase from './supabase';
import type { Driver } from '../types';

export type DriverStatus = Driver['status'];

export async function buscarDriver(userId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select()
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as Driver | null;
}

export async function registrarDriver(
  userId: string,
  placaMoto: string
): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .upsert(
      {
        id: userId,
        placa_moto: placaMoto,
        status: 'offline',
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Driver;
}

export async function atualizarStatusDriver(
  userId: string,
  status: DriverStatus
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function atualizarLocalizacaoDriver(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ lat, lng, atualizado_em: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}