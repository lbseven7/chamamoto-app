import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function IndexScreen() {
  const { usuario } = useAuth();

  if (usuario) {
    return (
      <Redirect
        href={
          usuario.tipo === 'passageiro'
            ? '/(passenger)/home'
            : '/(driver)/home'
        }
      />
    );
  }

  return <Redirect href="/login" />;
}
