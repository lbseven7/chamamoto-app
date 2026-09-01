import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../src/context/AuthContext';
import { useLocation, type Localizacao } from '../../src/hooks/useLocation';
import {
  assinarDriver,
  buscarDriver,
  pararAssinaturaDriver,
} from '../../src/services/drivers';
import {
  assinarCorrida,
  atualizarStatusCorrida,
  avaliarCorrida,
  buscarCorrida,
  criarCorrida,
  pararAssinaturaCorrida,
} from '../../src/services/rides';
import type { Ride } from '../../src/types';
import MapaCard from '../../src/components/MapaCard';

type Stage = 'home' | 'searching' | 'matched' | 'concluida';

export default function PassengerHomeScreen() {
  const { usuario, sair } = useAuth();
  const { localizacao, erro, carregando } = useLocation();
  const [stage, setStage] = useState<Stage>('home');
  const [corridaId, setCorridaId] = useState<string | null>(null);
  const [corrida, setCorrida] = useState<Ride | null>(null);
  const [destino, setDestino] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [nota, setNota] = useState(0);
  const [avaliando, setAvaliando] = useState(false);
  const [avaliada, setAvaliada] = useState(false);
  const [motoboyPos, setMotoboyPos] = useState<Localizacao | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const driverChannelRef = useRef<RealtimeChannel | null>(null);

  const pararAssinatura = useCallback(() => {
    if (channelRef.current) {
      pararAssinaturaCorrida(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const pararRastreio = useCallback(() => {
    if (driverChannelRef.current) {
      pararAssinaturaDriver(driverChannelRef.current);
      driverChannelRef.current = null;
    }
    setMotoboyPos(null);
  }, []);

  useEffect(() => () => {
    pararAssinatura();
    pararRastreio();
  }, [pararAssinatura, pararRastreio]);

  const iniciarRastreio = useCallback(
    (motoboyId: string) => {
      pararRastreio();
      buscarDriver(motoboyId)
        .then((d) => {
          if (d && d.lat != null && d.lng != null) {
            setMotoboyPos({ lat: d.lat, lng: d.lng });
          }
        })
        .catch(() => {
          // sem driver/erro de rede: o marker aparece quando o motoboy enviar posição
        });
      driverChannelRef.current = assinarDriver(motoboyId, (d) => {
        if (d.lat != null && d.lng != null) {
          setMotoboyPos({ lat: d.lat, lng: d.lng });
        }
      });
    },
    [pararRastreio]
  );

  const monitorarCorrida = useCallback(
    (id: string) => {
      pararAssinatura();
      const aplicar = (r: Ride) => {
        setCorrida(r);
        if (r.status === 'solicitada') {
          setStage('searching');
          setMotoboyPos(null);
        } else if (r.status === 'aceita' || r.status === 'em_andamento') {
          setStage('matched');
          if (r.motoboy_id) iniciarRastreio(r.motoboy_id);
        } else if (r.status === 'concluida') {
          setStage('concluida');
          pararAssinatura();
          pararRastreio();
        } else if (r.status === 'cancelada') {
          setStage('home');
          pararAssinatura();
          pararRastreio();
          setCorridaId(null);
          setCorrida(null);
        }
      };
      buscarCorrida(id).then((r) => {
        if (r) aplicar(r);
      });
      channelRef.current = assinarCorrida(id, aplicar);
    },
    [pararAssinatura, iniciarRastreio, pararRastreio]
  );

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
      .then((nova) => {
        setCorridaId(nova.id);
        setNota(0);
        setAvaliada(false);
        monitorarCorrida(nova.id);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setEnviando(false));
  };

  const enviarAvaliacao = () => {
    if (!corridaId) return;
    if (nota < 1) {
      Alert.alert('Atenção', 'Selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    setAvaliando(true);
    avaliarCorrida(corridaId, nota)
      .then(() => {
        setAvaliada(true);
        Alert.alert('Obrigado!', 'Avaliação enviada.');
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setAvaliando(false));
  };

  const cancelarCorrida = () => {
    if (!corridaId) return;
    setCancelando(true);
    atualizarStatusCorrida(corridaId, 'cancelada')
      .then(() => {
        pararAssinatura();
        pararRastreio();
        setStage('home');
        setCorridaId(null);
        setCorrida(null);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCancelando(false));
  };

  const voltar = () => {
    pararAssinatura();
    pararRastreio();
    setStage('home');
    setCorrida(null);
    setCorridaId(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, cancelando && styles.buttonDisabled]}
            onPress={cancelarCorrida}
            disabled={cancelando}
          >
            <Text style={styles.buttonText}>
              {cancelando ? 'Cancelando...' : 'Cancelar corrida'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 'matched' && (
        <View style={styles.content}>
          <MapaCard origem={localizacao} motoboy={motoboyPos} />
          <View style={styles.card}>
            <Text style={styles.label}>Motoboy a caminho!</Text>
            <Text style={styles.status}>
              {corrida?.status === 'em_andamento'
                ? 'Corrida em andamento'
                : 'Sua corrida foi aceita'}
            </Text>
            <Text style={styles.status}>
              {motoboyPos ? 'Moto rastreada no mapa' : 'Localizando motoboy...'}
            </Text>
            <Text style={styles.status}>Destino: {corrida?.destino_texto}</Text>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, cancelando && styles.buttonDisabled]}
              onPress={cancelarCorrida}
              disabled={cancelando}
            >
              <Text style={styles.buttonText}>
                {cancelando ? 'Cancelando...' : 'Cancelar corrida'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {stage === 'concluida' && (
        <View style={styles.card}>
          <Text style={styles.label}>Corrida concluída!</Text>
          {avaliada ? (
            <>
              <Text style={styles.status}>
                Obrigado pela avaliação! Você avaliou {nota} estrelas.
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={voltar}
              >
                <Text style={styles.buttonText}>Fazer outra corrida</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.status}>Avalie o motoboy:</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setNota(n)}>
                    <Text style={[styles.star, n <= nota && styles.starOn]}>
                      {n <= nota ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.button, (avaliando || nota < 1) && styles.buttonDisabled]}
                onPress={enviarAvaliacao}
                disabled={avaliando || nota < 1}
              >
                <Text style={styles.buttonText}>
                  {avaliando ? 'Enviando...' : 'Enviar avaliação'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  star: {
    fontSize: 40,
    color: '#D1D5DB',
  },
  starOn: {
    color: '#F59E0B',
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
