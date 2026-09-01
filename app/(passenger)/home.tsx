import { useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLocation } from '../../src/hooks/useLocation';
import { criarCorrida } from '../../src/services/rides';
import MapaCard from '../../src/components/MapaCard';

type Stage = 'home' | 'searching' | 'matched';

export default function PassengerHomeScreen() {
  const { usuario, sair } = useAuth();
  const { localizacao, erro, carregando } = useLocation();
  const [stage, setStage] = useState<Stage>('home');
  const [destino, setDestino] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pedirCorrida = () => {
    if (!destino.trim()) {
      Alert.alert('Atenção', 'Digite o destino.');
      return;
    }
    if (!usuario || !localizacao) {
      Alert.alert('Atenção', 'Aguardando sua localização.');
      return;
    }

    setEnviando(true);
    criarCorrida({
      passageiro_id: usuario.id,
      origem_lat: localizacao.lat,
      origem_lng: localizacao.lng,
      destino_texto: destino.trim(),
    })
      .then(() => {
        setStage('searching');
        setTimeout(() => setStage('matched'), 4000);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setEnviando(false));
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
        <View style={styles.content}>
          <Text style={styles.label}>Sua localização (origem)</Text>
          {carregando ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color="#F59E0B" />
              <Text style={styles.mapLoadingText}>Obtendo localização...</Text>
            </View>
          ) : (
            <MapaCard origem={localizacao} />
          )}

          {erro && <Text style={styles.erro}>{erro}</Text>}

          <View style={styles.card}>
            <Text style={styles.label}>Para onde você vai?</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o destino"
              value={destino}
              onChangeText={setDestino}
            />
            <TouchableOpacity
              style={[styles.button, (enviando || !localizacao) && styles.buttonDisabled]}
              onPress={pedirCorrida}
              disabled={enviando || !localizacao}
            >
              <Text style={styles.buttonText}>
                {enviando ? 'Enviando...' : 'Pedir corrida'}
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  mapLoading: {
    height: 250,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    marginTop: 8,
    color: '#6B7280',
  },
  erro: {
    color: '#EF4444',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
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
