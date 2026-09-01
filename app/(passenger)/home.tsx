import { useState } from 'react';
import { Link } from 'expo-router';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { criarCorrida } from '../../src/services/rides';

type Stage = 'home' | 'searching' | 'matched' | 'finished';

export default function PassengerHomeScreen() {
  const { usuario, sair } = useAuth();
  const [stage, setStage] = useState<Stage>('home');
  const [destino, setDestino] = useState('');
  const [carregando, setCarregando] = useState(false);

  const pedirCorrida = () => {
    if (!destino.trim()) return;
    if (!usuario) return;

    setCarregando(true);
    criarCorrida({
      passageiro_id: usuario.id,
      origem_lat: 0,
      origem_lng: 0,
      destino_texto: destino.trim(),
    })
      .then(() => {
        setStage('searching');
        setTimeout(() => setStage('matched'), 4000);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCarregando(false));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {usuario?.nome}</Text>
        <Link href="/login" onPress={sair} style={styles.sair}>
          <Text style={styles.sairText}>Sair</Text>
        </Link>
      </View>

      {stage === 'home' && (
        <View style={styles.card}>
          <Text style={styles.label}>Para onde você vai?</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o destino"
            value={destino}
            onChangeText={setDestino}
          />
          <TouchableOpacity
            style={[styles.button, carregando && styles.buttonDisabled]}
            onPress={pedirCorrida}
            disabled={carregando}
          >
            <Text style={styles.buttonText}>
              {carregando ? 'Enviando...' : 'Pedir corrida'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 'searching' && (
        <View style={styles.card}>
          <Text style={styles.label}>Procurando motoboy...</Text>
          <Text style={styles.status}>Aguarde um momento</Text>
        </View>
      )}

      {stage === 'matched' && (
        <View style={styles.card}>
          <Text style={styles.label}>Motoboy a caminho!</Text>
          <Text style={styles.status}>Sua corrida foi aceita</Text>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => setStage('home')}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  sair: {
    padding: 8,
  },
  sairText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    color: '#6B7280',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
