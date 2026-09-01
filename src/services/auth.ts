import supabase from './supabase';
import type { User } from '../types';

export async function buscarUsuario(telefone: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function cadastrarUsuario(dados: {
  nome: string;
  telefone: string;
  tipo: 'passageiro' | 'motoboy';
}): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ ...dados })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function login(telefone: string): Promise<User> {
  const usuario = await buscarUsuario(telefone);
  if (!usuario) {
    throw new Error('Usuário não encontrado. Faça o cadastro.');
  }
  return usuario;
}

export async function cadastroOuLogin(dados: {
  nome: string;
  telefone: string;
  tipo: 'passageiro' | 'motoboy';
}): Promise<{ usuario: User; novo: boolean }> {
  const existente = await buscarUsuario(dados.telefone);
  if (existente) {
    return { usuario: existente, novo: false };
  }
  const usuario = await cadastrarUsuario(dados);
  return { usuario, novo: true };
}
