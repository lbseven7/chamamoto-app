import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { cadastroOuLogin } from '../src/services/auth';
import type { UserRole } from '../src/types';

export default function LoginScreen() {
  const router = useRouter();
  const { entrar } = useAuth();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo, setTipo] = useState<UserRole>('passageiro');
  const [carregando, setCarregando] = useState(false);

  const entrarNoApp = () => {
    if (!nome.trim() || !telefone.trim()) {
      Alert.alert('Atenção', 'Preencha nome e telefone.');
      return;
    }
    setCarregando(true);
    cadastroOuLogin({ nome: nome.trim(), telefone: telefone.trim(), tipo })
      .then(({ usuario }) => {
        entrar(usuario);
        router.replace(tipo === 'passageiro' ? '/(passenger)/home' : '/(driver)/home');
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCarregando(false));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ChamaMoto</Text>
      <Text style={styles.subtitle}>Cadastro / Login</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        placeholder="Seu nome"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        placeholder="(11) 99999-9999"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Você é</Text>
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, tipo === 'passageiro' && styles.toggleActive]}
          onPress={() => setTipo('passageiro')}
        >
          <Text
            style={[
              styles.toggleText,
              tipo === 'passageiro' && styles.toggleTextActive,
            ]}
          >
            Passageiro
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tipo === 'motoboy' && styles.toggleActive]}
          onPress={() => setTipo('motoboy')}
        >
          <Text
            style={[
              styles.toggleText,
              tipo === 'motoboy' && styles.toggleTextActive,
            ]}
          >
            Motoboy
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, carregando && styles.buttonDisabled]}
        onPress={entrarNoApp}
        disabled={carregando}
      >
        <Text style={styles.buttonText}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  toggle: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  toggleActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  toggleText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
