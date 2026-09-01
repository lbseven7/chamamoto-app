import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import {
  listarHistoricoMotoboy,
  listarHistoricoPassageiro,
  type RideComPassageiro,
} from '../src/services/rides';
import { formatarPreco } from '../src/services/tarifas';

const C = {
  navy: '#10233F',
  orange: '#FF6A1A',
  bg: '#F1F2F5',
  card: '#FFFFFF',
  text: '#16202B',
  muted: '#6B7480',
  green: '#1C9A5B',
  red: '#DC3B2E',
  line: '#E4E6EA',
};

const STATUS_LABEL: Record<string, string> = {
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export default function HistoricoScreen() {
  const { usuario } = useAuth();
  const [corridas, setCorridas] = useState<RideComPassageiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (paraAtualizar = false) => {
    if (!usuario) return;
    if (paraAtualizar) setAtualizando(true);
    try {
      const lista =
        usuario.tipo === 'motoboy'
          ? await listarHistoricoMotoboy(usuario.id)
          : await listarHistoricoPassageiro(usuario.id);
      setCorridas(lista);
    } catch (err) {
      setCorridas([]);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={C.orange} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={corridas}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={atualizando} onRefresh={() => carregar(true)} />
      }
      ListEmptyComponent={
        <View style={styles.vazio}>
          <Text style={{ fontSize: 40 }}>🛵</Text>
          <Text style={styles.vazioText}>Nenhuma corrida ainda.</Text>
          <Text style={styles.vazioSub}>Suas corridas concluídas e canceladas aparecem aqui.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.destino}>{item.destino_texto}</Text>
            <View
              style={[
                styles.badge,
                item.status === 'concluida' ? styles.badgeGreen : styles.badgeRed,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  item.status === 'concluida' ? styles.badgeTextGreen : styles.badgeTextRed,
                ]}
              >
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
          </View>
          {usuario?.tipo === 'motoboy' && (
            <Text style={styles.muted}>Passageiro: {item.passageiros?.nome ?? '—'}</Text>
          )}
          <Text style={styles.muted}>
            {formatarDataHora(item.criado_em)} · {formatarPreco(item.preco)}
          </Text>
        </View>
      )}
    />
  );
}

function formatarDataHora(dataIso: string): string {
  const d = new Date(dataIso);
  const dia = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, flexGrow: 1 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  destino: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 8,
  },
  badgeGreen: { backgroundColor: 'rgba(28,154,91,0.12)' },
  badgeRed: { backgroundColor: 'rgba(220,59,46,0.12)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextGreen: { color: C.green },
  badgeTextRed: { color: C.red },

  muted: { color: C.muted, fontSize: 12.5, marginTop: 2 },

  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  vazioText: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 },
  vazioSub: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6 },
});