import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { atualizarPerfil } from '../src/services/auth';
import type { UserRole } from '../src/types';

const C = {
  navy: '#10233F',
  orange: '#FF6A1A',
  bg: '#F1F2F5',
  card: '#FFFFFF',
  text: '#16202B',
  muted: '#6B7480',
  red: '#DC3B2E',
  green: '#1C9A5B',
  line: '#E4E6EA',
};

const TIPOS: { valor: UserRole; label: string }[] = [
  { valor: 'passageiro', label: 'Passageiro' },
  { valor: 'motoboy', label: 'Motoboy' },
];

export default function PerfilScreen() {
  const { usuario, atualizarUsuario, sair } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [tipo, setTipo] = useState<UserRole>(usuario?.tipo ?? 'passageiro');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!usuario) return;
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil(usuario.id, { nome, tipo });
      await atualizarUsuario(atualizado);
      Alert.alert('Feito!', 'Perfil atualizado.');
      router.back();
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(usuario?.nome ?? '?').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.hello}>{usuario?.nome}</Text>
        <Text style={styles.muted}>+55 {usuario?.telefone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          placeholderTextColor={C.muted}
        />

        <Text style={styles.label}>Telefone</Text>
        <View style={styles.inputReadonly}>
          <Text style={styles.inputReadonlyText}>+55 {usuario?.telefone}</Text>
        </View>

        <Text style={styles.label}>Tipo de conta</Text>
        <View style={styles.segment}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.valor}
              style={[styles.segmentItem, tipo === t.valor && styles.segmentItemOn]}
              onPress={() => setTipo(t.valor)}
            >
              <Text style={[styles.segmentText, tipo === t.valor && styles.segmentTextOn]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {usuario?.tipo !== tipo && (
          <Text style={styles.aviso}>
            Ao trocar o tipo, você será direcionado(a) para a outra tela de início na próxima
            entrada.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.cta, (salvando || !nome.trim()) && styles.ctaDisabled]}
          onPress={salvar}
          disabled={salvando || !nome.trim()}
        >
          <Text style={styles.ctaText}>{salvando ? 'Salvando...' : 'Salvar alterações'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sairBtn} onPress={sair}>
          <Text style={styles.sairText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 40 },
  avatarRow: { alignItems: 'center', marginTop: 18, marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  hello: { fontSize: 20, fontWeight: '800', color: C.text },
  muted: { color: C.muted, fontSize: 13, marginTop: 2 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
    fontSize: 16,
    color: C.text,
    backgroundColor: '#fff',
  },
  inputReadonly: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
    backgroundColor: C.bg,
  },
  inputReadonlyText: { fontSize: 16, color: C.muted },

  segment: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentItemOn: { backgroundColor: C.navy },
  segmentText: { fontSize: 14, fontWeight: '600', color: C.muted },
  segmentTextOn: { color: '#fff' },

  aviso: {
    fontSize: 12,
    color: C.orange,
    marginTop: 10,
    lineHeight: 16,
  },

  cta: {
    marginTop: 18,
    borderRadius: 16,
    padding: 15,
    backgroundColor: C.orange,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sairBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 6 },
  sairText: { color: C.red, fontWeight: '700', fontSize: 15 },
});