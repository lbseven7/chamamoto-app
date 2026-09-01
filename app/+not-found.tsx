import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function NotFoundScreen() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
