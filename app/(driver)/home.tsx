import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLocation } from '../../src/hooks/useLocation';
import {
  atualizarLocalizacaoDriver,
  atualizarStatusDriver,
  buscarDriver,
  registrarDriver,
  type DriverStatus,
} from '../../src/services/drivers';
import {
  aceitarCorrida,
  atualizarStatusCorrida,
  listarCorridasDoMotoboy,
  listarCorridasSolicitadas,
  type RideComPassageiro,
} from '../../src/services/rides';
import type { Driver } from '../../src/types';

type Status = 'offline' | 'disponivel';

export default function DriverHomeScreen() {
  const { usuario, sair } = useAuth();
  const { localizacao } = useLocation();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [carregandoDriver, setCarregandoDriver] = useState(true);
  const [placa, setPlaca] = useState('');
  const [salvandoPlaca, setSalvandoPlaca] = useState(false);
  const [status, setStatus] = useState<Status>('offline');
  const [corridas, setCorridas] = useState<RideComPassageiro[]>([]);
  const [ativas, setAtivas] = useState<RideComPassageiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'offline' || !localizacao || !usuario) return;
    const enviar = () => {
      atualizarLocalizacaoDriver(
        usuario.id,
        localizacao.lat,
        localizacao.lng
      ).catch(() => {
        // falha de rede é ignorada; a próxima tentativa corrige
      });
    };
    enviar();
    const timer = setInterval(enviar, 10000);
    return () => clearInterval(timer);
  }, [status, localizacao, usuario]);

  const sincronizarStatusLocal = useCallback((novo: DriverStatus) => {
    if (novo === 'offline') {
      setStatus('offline');
    } else {
      setStatus('disponivel');
    }
    setDriver((atual) => (atual ? { ...atual, status: novo } : atual));
  }, []);

  const buscarCorridas = useCallback(async () => {
    if (!usuario || status !== 'disponivel') return;
    try {
      const [lista, ativasLista] = await Promise.all([
        listarCorridasSolicitadas(),
        listarCorridasDoMotoboy(usuario.id),
      ]);
      setCorridas(lista);
      setAtivas(ativasLista);
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuario, status]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        if (!usuario) return;
        try {
          const d = await buscarDriver(usuario.id);
          if (!ativo) return;
          setDriver(d);
          setStatus(d?.status === 'offline' ? 'offline' : 'disponivel');
        } catch (err) {
          if (ativo) Alert.alert('Erro', (err as Error).message);
        } finally {
          if (ativo) setCarregandoDriver(false);
        }
      })();
      if (status === 'disponivel') {
        setCarregando(true);
        buscarCorridas();
      }
      return () => {
        ativo = false;
      };
    }, [usuario, status, buscarCorridas])
  );

  const salvarPlaca = async () => {
    if (!usuario) return;
    if (!placa.trim()) {
      Alert.alert('Atenção', 'Digite a placa da moto.');
      return;
    }
    setSalvandoPlaca(true);
    try {
      const novo = await registrarDriver(usuario.id, placa.trim().toUpperCase());
      setDriver(novo);
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setSalvandoPlaca(false);
    }
  };

  const toggleStatus = async () => {
    if (!usuario) return;
    const novo: DriverStatus = status === 'offline' ? 'disponivel' : 'offline';
    try {
      await atualizarStatusDriver(usuario.id, novo);
      sincronizarStatusLocal(novo);
      if (novo === 'offline') {
        setCorridas([]);
        setAtivas([]);
      } else {
        setCarregando(true);
        buscarCorridas();
      }
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    }
  };

  const aceitar = async (ride: RideComPassageiro) => {
    if (!usuario) return;
    setProcessandoId(ride.id);
    try {
      await aceitarCorrida(ride.id, usuario.id);
      await atualizarStatusDriver(usuario.id, 'em_corrida');
      sincronizarStatusLocal('em_corrida');
      Alert.alert('Feito!', 'Corrida aceita.');
      buscarCorridas();
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setProcessandoId(null);
    }
  };

  const mudarStatus = async (
    ride: RideComPassageiro,
    novoStatus: 'em_andamento' | 'concluida' | 'cancelada'
  ) => {
    if (!usuario) return;
    setProcessandoId(ride.id);
    try {
      await atualizarStatusCorrida(ride.id, novoStatus);
      await atualizarStatusDriver(
        usuario.id,
        novoStatus === 'concluida' || novoStatus === 'cancelada'
          ? 'disponivel'
          : 'em_corrida'
      );
      sincronizarStatusLocal(
        novoStatus === 'concluida' || novoStatus === 'cancelada'
          ? 'disponivel'
          : 'em_corrida'
      );
      Alert.alert(
        'Atualizado',
        novoStatus === 'em_andamento'
          ? 'Corrida em andamento.'
          : novoStatus === 'concluida'
          ? 'Corrida concluída.'
          : 'Corrida cancelada.'
      );
      buscarCorridas();
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setProcessandoId(null);
    }
  };

  if (carregandoDriver) {
    return (
      <View style={styles.container}>
        <Text style={styles.vazio}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Olá, {usuario?.nome}</Text>
          <Link href="/login" onPress={sair} style={styles.sair}>
            <Text style={styles.sairText}>Sair</Text>
          </Link>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Cadastre sua moto para começar</Text>
          <TextInput
            style={styles.input}
            placeholder="Placa (ex.: ABC1D23)"
            placeholderTextColor="#9CA3AF"
            value={placa}
            onChangeText={setPlaca}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.aceitar, salvandoPlaca && styles.aceitarDisabled]}
            onPress={salvarPlaca}
            disabled={salvandoPlaca}
          >
            <Text style={styles.aceitarText}>
              {salvandoPlaca ? 'Salvando...' : 'Cadastrar moto'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {usuario?.nome}</Text>
        <Link href="/login" onPress={sair} style={styles.sair}>
          <Text style={styles.sairText}>Sair</Text>
        </Link>
      </View>

      <Text style={styles.subtitle}>Painel do MotoBoy</Text>
      <Text style={styles.infoMoto}>
        Moto {driver.placa_moto ?? '—'} • Nota {driver.nota_media?.toFixed(1) ?? '—'}
      </Text>
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
          ListHeaderComponent={
            ativas.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Corridas em andamento</Text>
                {ativas.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.cardDestino}>{item.destino_texto}</Text>
                    <Text style={styles.cardInfo}>
                      Passageiro: {item.passageiros?.nome ?? '—'}
                    </Text>
                    <Text style={styles.cardInfo}>
                      Telefone: {item.passageiros?.telefone ?? '—'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.aceitar, processandoId === item.id && styles.aceitarDisabled]}
                      onPress={() => mudarStatus(item, 'em_andamento')}
                      disabled={processandoId === item.id || item.status === 'em_andamento'}
                    >
                      <Text style={styles.aceitarText}>
                        {item.status === 'em_andamento'
                          ? 'Em andamento'
                          : processandoId === item.id
                          ? 'Atualizando...'
                          : 'Iniciar corrida'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[styles.action, styles.concluir, processandoId === item.id && styles.aceitarDisabled]}
                        onPress={() => mudarStatus(item, 'concluida')}
                        disabled={processandoId === item.id}
                      >
                        <Text style={styles.actionText}>Concluir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.action, styles.cancelar, processandoId === item.id && styles.aceitarDisabled]}
                        onPress={() => mudarStatus(item, 'cancelada')}
                        disabled={processandoId === item.id}
                      >
                        <Text style={styles.actionText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Corridas disponíveis</Text>
              </View>
            ) : null
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
                style={[
                  styles.aceitar,
                  (processandoId === item.id || ativas.length > 0) && styles.aceitarDisabled,
                ]}
                onPress={() => aceitar(item)}
                disabled={processandoId === item.id || ativas.length > 0}
              >
                <Text style={styles.aceitarText}>
                  {processandoId === item.id
                    ? 'Aceitando...'
                    : ativas.length > 0
                    ? 'Corrida em andamento'
                    : 'Aceitar corrida'}
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
  infoMoto: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  action: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  concluir: {
    backgroundColor: '#10B981',
  },
  cancelar: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
