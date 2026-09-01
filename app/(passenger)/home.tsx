import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ── Radar animado ── */
function RadarAnim() {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  const pulse = (val: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(val, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

  useEffect(() => {
    const a = Animated.parallel([pulse(r1, 0), pulse(r2, 700), pulse(r3, 1400)]);
    a.start();
    return () => a.stop();
  }, [r1, r2, r3]);

  return (
    <View style={searchStyles.radar}>
      {[r1, r2, r3].map((val, i) => (
        <Animated.View
          key={i}
          style={[
            searchStyles.radarRing,
            {
              transform: [
                {
                  scale: val.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 1],
                  }),
                },
              ],
              opacity: val.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.7, 0],
              }),
            },
          ]}
        />
      ))}
      <View style={searchStyles.radarCore}>
        <Text style={{ fontSize: 26 }}>🏍</Text>
      </View>
    </View>
  );
}
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
import { geocodificar } from '../../src/services/geocoding';

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

const QUICK_DESTINATIONS = [
  'Praça Central',
  'Hospital Municipal',
  'Terminal Rodoviário',
];

type Stage =
  | 'home'
  | 'searching'
  | 'matched'
  | 'enroute'
  | 'arrived'
  | 'trip'
  | 'rating'
  | 'done';

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
  const [tripSeconds, setTripSeconds] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const driverChannelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mm = String(Math.floor(tripSeconds / 60)).padStart(2, '0');
  const ss = String(tripSeconds % 60).padStart(2, '0');

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

  const pararTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    pararAssinatura();
    pararRastreio();
    pararTimer();
  }, [pararAssinatura, pararRastreio, pararTimer]);

  const iniciarRastreio = useCallback(
    (motoboyId: string) => {
      pararRastreio();
      buscarDriver(motoboyId)
        .then((d) => {
          if (d && d.lat != null && d.lng != null) {
            setMotoboyPos({ lat: d.lat, lng: d.lng });
          }
        })
        .catch(() => {});
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
        } else if (r.status === 'aceita') {
          setStage('matched');
          if (r.motoboy_id) iniciarRastreio(r.motoboy_id);
          // auto-enroute after 900ms like prototype
          setTimeout(() => setStage('enroute'), 900);
        } else if (r.status === 'em_andamento') {
          setStage('trip');
          pararRastreio();
        } else if (r.status === 'concluida') {
          setStage('rating');
          pararAssinatura();
          pararRastreio();
        } else if (r.status === 'cancelada') {
          setStage('home');
          pararAssinatura();
          pararRastreio();
          pararTimer();
          setCorridaId(null);
          setCorrida(null);
        }
      };
      buscarCorrida(id).then((r) => {
        if (r) aplicar(r);
      });
      channelRef.current = assinarCorrida(id, aplicar);
    },
    [pararAssinatura, iniciarRastreio, pararRastreio, pararTimer]
  );

  // trip timer
  useEffect(() => {
    if (stage === 'trip') {
      setTripSeconds(0);
      timerRef.current = setInterval(() => setTripSeconds((s) => s + 1), 1000);
      return () => pararTimer();
    }
  }, [stage, pararTimer]);

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
    geocodificar(destino.trim())
      .then((coords) =>
        criarCorrida({
          passageiro_id: usuario.id,
          origem_lat: localizacao.lat,
          origem_lng: localizacao.lng,
          destino_texto: destino.trim(),
          destino_lat: coords.lat,
          destino_lng: coords.lng,
        })
      )
      .then((nova) => {
        setCorridaId(nova.id);
        setNota(0);
        setAvaliada(false);
        monitorarCorrida(nova.id);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setEnviando(false));
  };

  const marcarChegada = () => {
    setStage('trip');
  };

  const finalizarCorrida = () => {
    if (corridaId) {
      atualizarStatusCorrida(corridaId, 'concluida')
        .then(() => {
          setStage('rating');
          pararTimer();
        })
        .catch((err: Error) => Alert.alert('Erro', err.message));
    }
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
        setStage('done');
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
        pararTimer();
        setStage('home');
        setCorridaId(null);
        setCorrida(null);
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCancelando(false));
  };

  const voltarAoInicio = () => {
    pararAssinatura();
    pararRastreio();
    pararTimer();
    setStage('home');
    setCorrida(null);
    setCorridaId(null);
    setDestino('');
    setNota(0);
    setAvaliada(false);
    setTripSeconds(0);
    setMotoboyPos(null);
  };

  const etaMinutos =
    stage === 'arrived' ? 'Chegou' : `${Math.max(1, 4 - Math.round(tripSeconds / 34))} min`;

  const destinoCorrida = (r: Ride | null) => {
    if (r && r.destino_lat != null && r.destino_lng != null) {
      return { lat: r.destino_lat, lng: r.destino_lng } as Localizacao;
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── HOME ── */}
      {stage === 'home' && (
        <>
          <View style={styles.mapContainer}>
            {carregando ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator color={C.orange} />
                <Text style={styles.mapLoadingText}>Obtendo localização...</Text>
              </View>
            ) : (
              <MapaCard origem={localizacao} />
            )}
            {erro && <Text style={styles.erro}>{erro}</Text>}
          </View>
          <View style={styles.panel}>
            <Text style={styles.h2}>Para onde você vai?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Praça Central, 45"
              placeholderTextColor={C.muted}
              value={destino}
              onChangeText={setDestino}
            />
            <View style={styles.quickList}>
              {QUICK_DESTINATIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => setDestino(s)}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.cta,
                (!destino.trim() || enviando || !localizacao) && styles.ctaDisabled,
              ]}
              onPress={pedirCorrida}
              disabled={!destino.trim() || enviando || !localizacao}
            >
              <Text style={styles.ctaText}>
                {enviando ? 'Enviando...' : 'Chamar mototáxi'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── SEARCHING (radar animado) ── */}
      {stage === 'searching' && (
        <View style={styles.centerStage}>
          <RadarAnim />
          <Text style={[styles.h2, { marginTop: 22 }]}>Procurando um motoboy...</Text>
          <Text style={styles.muted}>3 mototaxistas disponíveis perto de você</Text>
        </View>
      )}

      {/* ── MATCHED / ENROUTE / ARRIVED ── */}
      {(stage === 'matched' || stage === 'enroute' || stage === 'arrived') && (
        <>
<View style={styles.mapContainer}>
            <MapaCard origem={localizacao} motoboy={motoboyPos} destino={destinoCorrida(corrida)} />
          </View>
          <View style={styles.panel}>
            <View style={styles.driverRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {corrida?.motoboy_id?.substring(0, 2).toUpperCase() ?? 'MB'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>Motoboy</Text>
                <Text style={styles.mutedSmall}>
                  {motoboyPos ? 'Rastreando no mapa' : 'Localizando...'}
                </Text>
              </View>
              <View style={styles.etaChip}>
                <Text style={styles.etaText}>{etaMinutos}</Text>
              </View>
            </View>
            <View style={styles.statusLine}>
              {stage === 'matched' && 'Motoboy confirmado, saindo para te buscar'}
              {stage === 'enroute' && 'Motoboy a caminho do seu ponto'}
              {stage === 'arrived' && 'Motoboy chegou! Ele está te esperando.'}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Ligar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Mensagem</Text>
              </TouchableOpacity>
            </View>
            {stage === 'arrived' && (
              <TouchableOpacity style={styles.cta} onPress={marcarChegada}>
                <Text style={styles.ctaText}>Iniciar corrida</Text>
              </TouchableOpacity>
            )}
            {stage !== 'arrived' && (
              <TouchableOpacity
                style={[styles.cta, styles.ctaRed, { marginTop: 10 }]}
                onPress={cancelarCorrida}
                disabled={cancelando}
              >
                <Text style={styles.ctaText}>
                  {cancelando ? 'Cancelando...' : 'Cancelar corrida'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ── TRIP (corrida em andamento com timer) ── */}
      {stage === 'trip' && (
        <>
<View style={styles.mapContainer}>
            <MapaCard origem={localizacao} motoboy={motoboyPos} destino={destinoCorrida(corrida)} />
          </View>
          <View style={styles.panel}>
            <Text style={styles.tripTimer}>{mm}:{ss}</Text>
            <Text style={[styles.muted, { textAlign: 'center' }]}>
              Corrida em andamento
            </Text>
            <Text style={[styles.muted, { textAlign: 'center', marginBottom: 14 }]}>
              Destino: {corrida?.destino_texto}
            </Text>
            <TouchableOpacity style={styles.ctaDark} onPress={finalizarCorrida}>
              <Text style={styles.ctaText}>Finalizar corrida</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── RATING ── */}
      {stage === 'rating' && (
        <View style={styles.centerStage}>
          <View style={[styles.avatar, styles.avatarLg]}>
            <Text style={[styles.avatarText, { fontSize: 18 }]}>
              {corrida?.motoboy_id?.substring(0, 2).toUpperCase() ?? 'MB'}
            </Text>
          </View>
          <Text style={[styles.h2, { marginTop: 14 }]}>Como foi o motoboy?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setNota(n)}>
                <Text style={[styles.star, n <= nota && styles.starOn]}>
                  {n <= nota ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.muted}>
            Corrida para {corrida?.destino_texto || 'destino'}
          </Text>
          <TouchableOpacity
            style={[styles.cta, { marginTop: 10 }, (avaliando || nota < 1) && styles.ctaDisabled]}
            onPress={enviarAvaliacao}
            disabled={avaliando || nota < 1}
          >
            <Text style={styles.ctaText}>
              {avaliando ? 'Enviando...' : 'Enviar avaliação'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── DONE ── */}
      {stage === 'done' && (
        <View style={styles.centerStage}>
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.h2}>Avaliação enviada!</Text>
          <Text style={styles.muted}>Obrigado por usar o ChamaMoto</Text>
          <TouchableOpacity style={[styles.cta, { marginTop: 18 }]} onPress={voltarAoInicio}>
            <Text style={styles.ctaText}>Voltar ao início</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Header fixo ── */}
      {stage === 'home' && (
        <View style={styles.header}>
          <Text style={styles.title}>Olá, {usuario?.nome}</Text>
          <Link href="/login" onPress={sair} style={styles.sair}>
            <Text style={styles.sairText}>Sair</Text>
          </Link>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  sair: { padding: 8 },
  sairText: { color: C.red, fontWeight: '600', fontSize: 14 },

  mapContainer: {
    height: 250,
    width: '100%',
    flexShrink: 0,
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#D8E1E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: { marginTop: 8, color: C.muted },
  erro: { color: C.red, marginTop: 8, paddingHorizontal: 18 },

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
  h2: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  muted: { color: C.muted, fontSize: 13 },
  mutedSmall: { color: C.muted, fontSize: 12 },

  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
    fontSize: 14.5,
    color: C.text,
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  quickList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12.5, color: C.text },

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
  ctaRed: {
    backgroundColor: C.red,
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
  secondaryBtnText: { fontSize: 13.5, fontWeight: '600', color: C.text },
  actionsRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },

  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },

  /* Driver card */
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLg: { width: 64, height: 64, borderRadius: 32 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  driverName: { fontWeight: '700', fontSize: 14.5, color: C.text },
  etaChip: {
    backgroundColor: C.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  etaText: { color: C.navy, fontWeight: '800', fontSize: 12.5 },

  statusLine: {
    fontSize: 13,
    color: C.text,
    backgroundColor: C.bg,
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
  },

  tripTimer: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: C.navy,
    marginVertical: 6,
    fontVariant: ['tabular-nums'],
  },

  /* Stars */
  starsRow: { flexDirection: 'row', gap: 6, marginVertical: 14 },
  star: { fontSize: 30, color: '#D8DCE2' },
  starOn: { color: C.yellow },

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
});

/* ── Estilos do radar animado (componente separado) ── */
const searchStyles = StyleSheet.create({
  radar: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: C.orange,
  },
  radarCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 2,
  },
});
