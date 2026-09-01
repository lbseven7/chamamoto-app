import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';

interface AuthContextValue {
  usuario: User | null;
  entrar: (u: User) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);

  const entrar = (u: User) => setUsuario(u);
  const sair = () => setUsuario(null);

  return (
    <AuthContext.Provider value={{ usuario, entrar, sair }}>
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
