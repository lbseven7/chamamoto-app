import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
  assinarCorrida,
  assinarNovasCorridas,
  atualizarStatusCorrida,
  buscarCorrida,
  listarCorridasDoMotoboy,
  listarCorridasSolicitadas,
  pararAssinaturaCorrida,
  pararAssinaturaNovasCorridas,
  type RideComPassageiro,
} from '../../src/services/rides';
import type { Driver, Ride } from '../../src/types';
import MapaCard from '../../src/components/MapaCard';
import { formatarPreco } from '../../src/services/tarifas';
import { buscarRota, type Rota } from '../../src/services/rotas';

/* ── Cores do protótipo ── */
const C = {
  navy: '#10233F',
  navyLight: '#1D3A63',
  orange: '#FF6A1A',
  orangeDark: '#E85A0A',
  yellow: '#FFB627',
  bg: '#F1F2F5',
  card: '#FFFFFF',
  text: '#16202B',
  muted: '#6B7480',
  green: '#1C9A5B',
  red: '#DC3B2E',
  line: '#E4E6EA',
};

type DriverStage = 'idle' | 'incoming' | 'accepted' | 'trip' | 'completed';

export default function DriverHomeScreen() {
  const { usuario, sair } = useAuth();
  const { localizacao } = useLocation();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [carregandoDriver, setCarregandoDriver] = useState(true);
  const [placa, setPlaca] = useState('');
  const [salvandoPlaca, setSalvandoPlaca] = useState(false);
  const [online, setOnline] = useState(false);
  const [stage, setStage] = useState<DriverStage>('idle');
  const [request, setRequest] = useState<RideComPassageiro | null>(null);
  const [corridas, setCorridas] = useState<RideComPassageiro[]>([]);
  const [ativas, setAtivas] = useState<RideComPassageiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState(0);
  const [trips, setTrips] = useState(0);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [rota, setRota] = useState<Rota | null>(null);
  const stageRef = useRef<DriverStage>('idle');
  const requestIdRef = useRef<string | null>(null);
  const novasCorridasRef = useRef<RealtimeChannel | null>(null);
  const requestChannelRef = useRef<RealtimeChannel | null>(null);

  const mm = String(Math.floor(tripSeconds / 60)).padStart(2, '0');
  const ss = String(tripSeconds % 60).padStart(2, '0');

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    requestIdRef.current = request?.id ?? null;
  }, [request]);

  useEffect(() => {
    if (!online || !localizacao || !usuario) return;
    const enviar = () => {
      atualizarLocalizacaoDriver(usuario.id, localizacao.lat, localizacao.lng).catch(() => {});
    };
    enviar();
    const timer = setInterval(enviar, 10000);
    return () => clearInterval(timer);
  }, [online, localizacao, usuario]);

  // trip timer
  useEffect(() => {
    if (stage === 'trip') {
      setTripSeconds(0);
      const id = setInterval(() => setTripSeconds((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
  }, [stage]);

  // rota do ponto de origem até o destino durante a viagem
  useEffect(() => {
    if (
      stage !== 'trip' ||
      !request ||
      request.origem_lat == null ||
      request.origem_lng == null ||
      request.destino_lat == null ||
      request.destino_lng == null
    ) {
      setRota(null);
      return;
    }
    setRota(null);
    buscarRota(
      { lat: request.origem_lat, lng: request.origem_lng },
      { lat: request.destino_lat, lng: request.destino_lng }
    )
      .then(setRota)
      .catch(() => setRota(null));
  }, [stage, request?.id]);

  const sincronizarStatusLocal = useCallback((novo: DriverStatus) => {
    setDriver((atual) => (atual ? { ...atual, status: novo } : atual));
  }, []);

  const buscarCorridas = useCallback(async () => {
    if (!usuario || !online) return;
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
  }, [usuario, online]);

  const pararAssinaturaDeNovas = useCallback(() => {
    if (novasCorridasRef.current) {
      pararAssinaturaNovasCorridas(novasCorridasRef.current);
      novasCorridasRef.current = null;
    }
  }, []);

  const pararAssinaturaDoPedido = useCallback(() => {
    if (requestChannelRef.current) {
      pararAssinaturaCorrida(requestChannelRef.current);
      requestChannelRef.current = null;
    }
  }, []);

  const aplicarPedido = useCallback(
    (atual: Ride) => {
      if (
        atual.status === 'cancelada' ||
        (atual.status === 'aceita' && atual.motoboy_id !== usuario?.id)
      ) {
        pararAssinaturaDoPedido();
        setRequest(null);
        setStage('idle');
        buscarCorridas();
      }
    },
    [usuario?.id, pararAssinaturaDoPedido, buscarCorridas]
  );

  // Assina novas corridas + reconciliação periódica enquanto online
  useEffect(() => {
    if (!usuario || !online) return;

    novasCorridasRef.current = assinarNovasCorridas((ride) => {
      setCorridas((anteriores) => {
        if (anteriores.some((r) => r.id === ride.id)) return anteriores;
        return [ride, ...anteriores];
      });
      if (stageRef.current === 'idle') {
        setRequest(ride);
        setStage('incoming');
      }
    });

    const timer = setInterval(() => {
      (async () => {
        const rid = requestIdRef.current;
        if (rid) {
          const atual = await buscarCorrida(rid).catch(() => null);
          const sumiu =
            !atual ||
            atual.status === 'cancelada' ||
            (atual.status === 'aceita' && atual.motoboy_id !== usuario?.id);
          if (sumiu) {
            aplicarPedido(atual ?? ({ id: rid, status: 'cancelada' } as Ride));
            return;
          }
        }
        if (stageRef.current === 'idle') buscarCorridas();
      })();
    }, 30000);

    return () => {
      clearInterval(timer);
      pararAssinaturaDeNovas();
    };
  }, [usuario, online, buscarCorridas, pararAssinaturaDeNovas, aplicarPedido]);

  // Mantém assinatura do pedido ativo durante os estágios de corrida
  useEffect(() => {
    if (!request || stage === 'idle' || stage === 'completed') {
      pararAssinaturaDoPedido();
      return;
    }
    pararAssinaturaDoPedido();
    requestChannelRef.current = assinarCorrida(request.id, aplicarPedido);
    return () => pararAssinaturaDoPedido();
  }, [request, stage, aplicarPedido, pararAssinaturaDoPedido]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        if (!usuario) return;
        try {
          const d = await buscarDriver(usuario.id);
          if (!ativo) return;
          setDriver(d);
          setOnline(d?.status !== 'offline');
        } catch (err) {
          if (ativo) Alert.alert('Erro', (err as Error).message);
        } finally {
          if (ativo) setCarregandoDriver(false);
        }
      })();
      return () => {
        ativo = false;
      };
    }, [usuario])
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

  const toggleOnline = async () => {
    if (!usuario) return;
    const novo = !online;
    const status: DriverStatus = novo ? 'disponivel' : 'offline';
    try {
      await atualizarStatusDriver(usuario.id, status);
      setOnline(novo);
      setStage('idle');
      setRequest(null);
      sincronizarStatusLocal(status);
      if (novo) {
        setCarregando(true);
        buscarCorridas();
      } else {
        setCorridas([]);
        setAtivas([]);
      }
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    }
  };

  const acceptRequest = async (ride: RideComPassageiro) => {
    if (!usuario) return;
    setProcessandoId(ride.id);
    try {
      await aceitarCorrida(ride.id, usuario.id);
      await atualizarStatusDriver(usuario.id, 'em_corrida');
      sincronizarStatusLocal('em_corrida');
      setRequest(ride);
      setStage('accepted');
      Alert.alert('Feito!', 'Corrida aceita.');
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
      pararAssinaturaDoPedido();
      setRequest(null);
      setStage('idle');
      buscarCorridas();
    } finally {
      setProcessandoId(null);
    }
  };

  const startTrip = async () => {
    if (!request || !usuario) return;
    setProcessandoId(request.id);
    try {
      await atualizarStatusCorrida(request.id, 'em_andamento');
      setStage('trip');
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setProcessandoId(null);
    }
  };

  const finishTrip = async () => {
    if (!request || !usuario) return;
    setProcessandoId(request.id);
    try {
      await atualizarStatusCorrida(request.id, 'concluida');
      await atualizarStatusDriver(usuario.id, 'disponivel');
      sincronizarStatusLocal('disponivel');
      setTrips((t) => t + 1);
      setEarnings((e) => e + (request.preco ?? 0));
      setStage('completed');
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setProcessandoId(null);
    }
  };

  const lastPrice = request?.preco != null ? formatarPreco(request.preco) : '';

  const goToIdle = () => {
    setStage('idle');
    setRequest(null);
    setTripSeconds(0);
    buscarCorridas();
  };

  const declineRequest = () => {
    setStage('idle');
    setRequest(null);
    buscarCorridas();
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
          <View>
            <Text style={styles.hello}>Olá, {usuario?.nome}</Text>
          </View>
          <Link href="/login" onPress={sair}>
            <Text style={styles.sairText}>Sair</Text>
          </Link>
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>Cadastre sua moto para começar</Text>
          <TextInput
            style={styles.input}
            placeholder="Placa (ex.: ABC1D23)"
            placeholderTextColor={C.muted}
            value={placa}
            onChangeText={setPlaca}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.cta, salvandoPlaca && styles.ctaDisabled]}
            onPress={salvarPlaca}
            disabled={salvandoPlaca}
          >
            <Text style={styles.ctaText}>
              {salvandoPlaca ? 'Salvando...' : 'Cadastrar moto'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Olá, {usuario?.nome}</Text>
          <Text style={styles.mutedSmall}>
            {trips} {trips === 1 ? 'corrida hoje' : 'corridas hoje'} • R$ {earnings.toFixed(2).replace('.', ',')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Link href="/perfil">
            <Text style={styles.headerLink}>Perfil</Text>
          </Link>
          <Link href="/historico">
            <Text style={styles.headerLink}>Histórico</Text>
          </Link>
          <Link href="/login" onPress={sair}>
            <Text style={styles.sairText}>Sair</Text>
          </Link>
          <TouchableOpacity
            style={[styles.toggle, online && styles.toggleOn]}
            onPress={toggleOnline}
          >
            <View style={[styles.toggleKnob, online && styles.toggleKnobOn]} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.onlineLabel}>
        <View style={[styles.dot, online ? styles.dotGreen : styles.dotGrey]} />
        <Text style={styles.mutedSmall}>
          {online ? 'Online — recebendo corridas' : 'Offline'}
        </Text>
      </View>

      {/* ── IDLE ── */}
      {stage === 'idle' && (
        <View style={styles.centerStage}>
          {online ? (
            <>
              <View style={styles.pulse}>
                <Text style={{ fontSize: 24 }}>📡</Text>
              </View>
              <Text style={[styles.muted, { marginTop: 16 }]}>
                Aguardando novos pedidos...
              </Text>
              {ativas.length > 0 && (
                <View style={{ marginTop: 20, width: '100%' }}>
                  <Text style={styles.sectionTitle}>Corridas em andamento</Text>
                  {ativas.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.cardDestino}>{item.destino_texto}</Text>
                      <Text style={styles.mutedSmall}>
                        Passageiro: {item.passageiros?.nome ?? '—'}
                      </Text>
                      <Text style={styles.precoDest}>Corrida {formatarPreco(item.preco)}</Text>
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={[styles.ctaGreen, { flex: 1 }]}
                          onPress={async () => {
                            setRequest(item);
                            setStage('trip');
                          }}
                        >
                          <Text style={styles.ctaText}>Iniciar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.ctaRed, { flex: 1 }]}
                          onPress={async () => {
                            if (!usuario) return;
                            try {
                              await atualizarStatusCorrida(item.id, 'cancelada');
                              await atualizarStatusDriver(usuario.id, 'disponivel');
                              sincronizarStatusLocal('disponivel');
                              buscarCorridas();
                            } catch {}
                          }}
                        >
                          <Text style={styles.ctaText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {corridas.length > 0 && (
                <View style={{ marginTop: 20, width: '100%' }}>
                  <Text style={styles.sectionTitle}>Corridas disponíveis</Text>
                  {corridas.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.cardDestino}>{item.destino_texto}</Text>
                      <Text style={styles.mutedSmall}>
                        Passageiro: {item.passageiros?.nome ?? '—'}
                      </Text>
                      <Text style={styles.mutedSmall}>
                        Telefone: {item.passageiros?.telefone ?? '—'}
                      </Text>
                      <Text style={styles.precoDest}>{formatarPreco(item.preco)}</Text>
                      <TouchableOpacity
                        style={[styles.cta, { marginTop: 12 }, processandoId === item.id && styles.ctaDisabled]}
                        onPress={() => acceptRequest(item)}
                        disabled={processandoId === item.id}
                      >
                        <Text style={styles.ctaText}>
                          {processandoId === item.id ? 'Aceitando...' : 'Aceitar corrida'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {ativas.length === 0 && corridas.length === 0 && !carregando && (
                <Text style={[styles.muted, { marginTop: 10 }]}>
                  Nenhuma corrida no momento.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40 }}>💤</Text>
              <Text style={[styles.muted, { marginTop: 10 }]}>
                Fique online para começar a receber corridas
              </Text>
            </>
          )}
        </View>
      )}

      {/* ── INCOMING ── */}
      {stage === 'incoming' && request && (
        <View style={styles.requestCard}>
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>Nova corrida</Text>
          </View>
          <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            <MapaCard
              origem={localizacao}
              destino={
                request.origem_lat && request.origem_lng
                  ? { lat: request.origem_lat, lng: request.origem_lng }
                  : undefined
              }
              pickupLabel="Você"
              destLabel={request.destino_texto}
            />
          </View>
          <Text style={styles.cardDestino}>{request.destino_texto}</Text>
          <Text style={styles.precoDest}>{formatarPreco(request.preco)}</Text>
          <Text style={styles.mutedSmall}>
            Passageiro: {request.passageiros?.nome ?? '—'}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.secondaryBtn, styles.declineBtn]} onPress={declineRequest}>
              <Text style={[styles.secondaryBtnText, { color: C.red }]}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => acceptRequest(request)}
            >
              <Text style={styles.ctaText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ACCEPTED ── */}
      {stage === 'accepted' && request && (
        <>
<View style={styles.mapContainer}>
          <MapaCard
            origem={localizacao}
            destino={
              request.origem_lat && request.origem_lng
                ? { lat: request.origem_lat, lng: request.origem_lng }
                : undefined
            }
          />
        </View>
        <View style={styles.panel}>
          <Text style={[styles.muted, { textAlign: 'center', marginBottom: 12 }]}>
            Vá até o ponto de partida do passageiro
          </Text>
            <Text style={[styles.mutedSmall, { textAlign: 'center', marginBottom: 14 }]}>
              {request.passageiros?.nome ?? 'Passageiro'}
            </Text>
            <TouchableOpacity
              style={styles.cta}
              onPress={startTrip}
              disabled={processandoId === request.id}
            >
              <Text style={styles.ctaText}>
                {processandoId === request.id ? 'Atualizando...' : 'Iniciar corrida'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── TRIP (driver) ── */}
      {stage === 'trip' && request && (
        <>
<View style={styles.mapContainer}>
            <MapaCard
              origem={
                request.origem_lat && request.origem_lng
                  ? { lat: request.origem_lat, lng: request.origem_lng }
                  : localizacao
              }
              destino={
                request.destino_lat && request.destino_lng
                  ? { lat: request.destino_lat, lng: request.destino_lng }
                  : undefined
              }
              rota={rota}
            />
          </View>
          <View style={styles.panel}>
            <Text style={styles.tripTimer}>{mm}:{ss}</Text>
            <Text style={[styles.muted, { textAlign: 'center' }]}>
              Levando passageiro até {request.destino_texto}
            </Text>
            <TouchableOpacity
              style={styles.ctaDark}
              onPress={finishTrip}
              disabled={processandoId === request.id}
            >
              <Text style={styles.ctaText}>
                {processandoId === request.id ? 'Finalizando...' : 'Finalizar corrida'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── COMPLETED ── */}
      {stage === 'completed' && (
        <View style={styles.centerStage}>
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.h2}>Corrida concluída</Text>
          <Text style={styles.muted}>Você completou uma corrida{lastPrice ? ` — ${lastPrice}` : ''}</Text>
          <TouchableOpacity style={[styles.cta, { marginTop: 18 }]} onPress={goToIdle}>
            <Text style={styles.ctaText}>Voltar a ficar disponível</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Placa do carro ── */}
      {driver && (
        <View style={styles.footerInfo}>
          <Text style={styles.mutedSmall}>
            Moto {driver.placa_moto ?? '—'} • Nota {driver.nota_media?.toFixed(1) ?? '—'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 10,
    backgroundColor: C.bg,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  hello: { fontSize: 18, fontWeight: '800', color: C.text },
  sairText: { color: C.red, fontWeight: '600', fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLink: { color: C.navy, fontWeight: '600', fontSize: 14 },
  muted: { color: C.muted, fontSize: 13 },
  mutedSmall: { color: C.muted, fontSize: 12 },
  onlineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },

  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#D8DCE2',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: C.green },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },

  dot: { width: 7, height: 7, borderRadius: 4 },
  dotGreen: { backgroundColor: C.green },
  dotGrey: { backgroundColor: '#9AA1AC' },

  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },

  pulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardDestino: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 6,
  },
  precoDest: {
    fontSize: 14,
    fontWeight: '700',
    color: C.orange,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 12,
  },

  cta: {
    width: '100%',
    borderRadius: 16,
    padding: 15,
    backgroundColor: C.orange,
    alignItems: 'center',
  },
  ctaDark: {
    width: '100%',
    borderRadius: 16,
    padding: 15,
    backgroundColor: C.navy,
    alignItems: 'center',
  },
  ctaGreen: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: C.green,
    alignItems: 'center',
  },
  ctaRed: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: C.red,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  declineBtn: { borderColor: C.red },
  secondaryBtnText: { fontSize: 13.5, fontWeight: '600', color: C.text },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },

  input: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
    fontSize: 16,
    color: C.text,
    marginBottom: 16,
    backgroundColor: '#fff',
  },

  h2: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },

  vazio: { textAlign: 'center', color: C.muted, marginTop: 32 },

  mapContainer: { height: 340, width: '100%', flexShrink: 0 },
  panel: {
    backgroundColor: C.card,
    borderRadius: 22,
    marginTop: -18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 22,
    flex: 1,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },

  requestCard: { padding: 16 },
  requestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.orange,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  requestBadgeText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },

  tripTimer: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: C.navy,
    marginVertical: 6,
  },

  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkText: { color: '#fff', fontSize: 26 },

  row: { flexDirection: 'row', gap: 12, marginTop: 12 },

  footerInfo: {
    paddingVertical: 10,
    alignItems: 'center',
  },
});
