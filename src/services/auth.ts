import supabase from './supabase';
import type { User } from '../types';

function formatarTelefone(telefone: string): string {
  return `+55${telefone.replace(/\D/g, '')}`;
}

async function carregarPerfil(
  userId: string,
  dados: { nome: string; telefone: string; tipo: 'passageiro' | 'motoboy' }
): Promise<User> {
  const normalized = dados.telefone.replace(/\D/g, '');

  const { data: usuario, error: erroUsuario } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (erroUsuario) {
    throw new Error(erroUsuario.message);
  }
  if (!usuario) {
    throw new Error('Perfil não encontrado. Tente novamente.');
  }

  const perfil = usuario as User;
  const precisaSincronizar =
    perfil.nome !== dados.nome.trim() ||
    perfil.telefone !== normalized ||
    perfil.tipo !== dados.tipo;

  if (precisaSincronizar) {
    await supabase
      .from('users')
      .update({
        nome: dados.nome.trim(),
        telefone: normalized,
        tipo: dados.tipo,
      })
      .eq('id', userId);
  }

  return { ...perfil, nome: dados.nome.trim(), tipo: dados.tipo } as User;
}

export type EnvioCodigoResult =
  | { usuario: User }
  | { precisaCodigo: true };

export async function enviarCodigoTelefone(dados: {
  nome: string;
  telefone: string;
  tipo: 'passageiro' | 'motoboy';
}): Promise<EnvioCodigoResult> {
  const normalized = dados.telefone.replace(/\D/g, '');
  const { data, error } = (await supabase.auth.signInWithOtp({
    phone: formatarTelefone(normalized),
    options: {
      data: {
        nome: dados.nome.trim(),
        telefone: normalized,
        tipo: dados.tipo,
      },
    },
  })) as {
    data: {
      session: { user: { id: string } } | null;
      user: { id: string } | null;
      messageId?: string | null;
    };
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(error.message);
  }

  const userId = data.session?.user?.id ?? data.user?.id;

  // Modo dev: "Enable phone confirmations" desligado → a sessão já vem aqui
  if (userId) {
    const usuario = await carregarPerfil(userId, dados);
    return { usuario };
  }

  return { precisaCodigo: true };
}

export async function verificarCodigoTelefone(dados: {
  telefone: string;
  codigo: string;
  nome: string;
  tipo: 'passageiro' | 'motoboy';
}): Promise<User> {
  const normalized = dados.telefone.replace(/\D/g, '');

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatarTelefone(normalized),
    token: dados.codigo.trim(),
    type: 'sms',
  });

  if (error) {
    throw new Error(error.message);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Falha ao autenticar. Tente novamente.');
  }

  return carregarPerfil(userId, dados);
}

export async function obterUsuarioSessao(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return null;
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.session.user.id)
    .maybeSingle();

  if (erroUsuario || !usuario) {
    return null;
  }

  return usuario as User;
}

export async function encerrarSessao(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}