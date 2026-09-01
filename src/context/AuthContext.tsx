import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { encerrarSessao, obterUsuarioSessao } from '../services/auth';

const STORAGE_KEY = 'chamamoto:usuario';

interface AuthContextValue {
  usuario: User | null;
  carregando: boolean;
  entrar: (u: User) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const usuarioSessao = await obterUsuarioSessao();
        if (usuarioSessao) {
          setUsuario(usuarioSessao);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioSessao));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const entrar = useCallback(async (u: User) => {
    setUsuario(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const sair = useCallback(async () => {
    setUsuario(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    try {
      await encerrarSessao();
    } catch {
      // ignora falha no signOut do Supabase
    }
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}