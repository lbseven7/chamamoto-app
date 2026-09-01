import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  aceitarCorrida,
  listarCorridasSolicitadas,
  type RideComPassageiro,
} from '../../src/services/rides';

type Status = 'offline' | 'disponivel';

export default function DriverHomeScreen() {
  const { usuario, sair } = useAuth();
  const [status, setStatus] = useState<Status>('offline');
  const [corridas, setCorridas] = useState<RideComPassageiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [aceitandoId, setAceitandoId] = useState<string | null>(null);

  const buscarCorridas = useCallback(async () => {
    if (status !== 'disponivel') return;
    try {
      const lista = await listarCorridasSolicitadas();
      setCorridas(lista);
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      if (status === 'disponivel') {
        setCarregando(true);
        buscarCorridas();
      }
    }, [status, buscarCorridas])
  );

  const toggleStatus = () => {
    const novo = status === 'offline' ? 'disponivel' : 'offline';
    setStatus(novo);
    if (novo === 'offline') {
      setCorridas([]);
    }
  };

  const aceitar = async (ride: RideComPassageiro) => {
    if (!usuario) return;
    setAceitandoId(ride.id);
    try {
      await aceitarCorrida(ride.id, usuario.id);
      Alert.alert('Feito!', 'Corrida aceita.');
      buscarCorridas();
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setAceitandoId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {usuario?.nome}</Text>
        <Link href="/login" onPress={sair} style={styles.sair}>
          <Text style={styles.sairText}>Sair</Text>
        </Link>
      </View>

      <Text style={styles.subtitle}>Painel do MotoBoy</Text>
      <TouchableOpacity
        style={[styles.statusButton, status === 'offline' ? styles.online : styles.offline]}
        onPress={toggleStatus}
      >
        <Text style={styles.statusButtonText}>
          {status === 'offline' ? 'Ficar disponível' : 'Ficar offline'}
        </Text>
      </TouchableOpacity>

      {status === 'disponivel' && (
        <FlatList
          data={corridas}
          keyExtractor={(item) => item.id}
          style={styles.lista}
          contentContainerStyle={styles.listaContent}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => {
                setAtualizando(true);
                buscarCorridas();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {carregando ? 'Buscando corridas...' : 'Nenhuma corrida no momento.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardDestino}>{item.destino_texto}</Text>
              <Text style={styles.cardInfo}>
                Passageiro: {item.passageiros?.nome ?? '—'}
              </Text>
              <Text style={styles.cardInfo}>
                Telefone: {item.passageiros?.telefone ?? '—'}
              </Text>
              <TouchableOpacity
                style={[styles.aceitar, aceitandoId === item.id && styles.aceitarDisabled]}
                onPress={() => aceitar(item)}
                disabled={aceitandoId === item.id}
              >
                <Text style={styles.aceitarText}>
                  {aceitandoId === item.id ? 'Aceitando...' : 'Aceitar corrida'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lista: {
    flex: 1,
  },
  listaContent: {
    paddingBottom: 24,
  },
  vazio: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 32,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardDestino: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  cardInfo: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  aceitar: {
    backgroundColor: '#F59E0B',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  aceitarDisabled: {
    opacity: 0.6,
  },
  aceitarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
