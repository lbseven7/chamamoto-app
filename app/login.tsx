import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { enviarCodigoTelefone, verificarCodigoTelefone } from '../src/services/auth';
import type { UserRole } from '../src/types';

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

type Step = 'form' | 'code';

export default function LoginScreen() {
  const router = useRouter();
  const { entrar } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo, setTipo] = useState<UserRole>('passageiro');
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviarCodigo = () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Digite seu nome.');
      return;
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      Alert.alert('Atenção', 'Digite um telefone válido com DDD.');
      return;
    }
    setCarregando(true);
    enviarCodigoTelefone({ nome, telefone, tipo })
      .then(async (resultado) => {
        if ('usuario' in resultado) {
          await entrar(resultado.usuario);
          router.replace(
            resultado.usuario.tipo === 'passageiro'
              ? '/(passenger)/home'
              : '/(driver)/home'
          );
        } else {
          setStep('code');
        }
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCarregando(false));
  };

  const confirmarCodigo = () => {
    if (codigo.trim().length < 4) {
      Alert.alert('Atenção', 'Digite o código recebido por SMS.');
      return;
    }
    setCarregando(true);
    verificarCodigoTelefone({ nome, telefone, tipo, codigo })
      .then(async (usuario) => {
        await entrar(usuario);
        router.replace(
          usuario.tipo === 'passageiro' ? '/(passenger)/home' : '/(driver)/home'
        );
      })
      .catch((err: Error) => Alert.alert('Erro', err.message))
      .finally(() => setCarregando(false));
  };

  const voltar = () => {
    setStep('form');
    setCodigo('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>
        Chama<Text style={styles.titleAccent}>Moto</Text>
      </Text>
      <Text style={styles.subtitle}>
        {step === 'form' ? 'Entrar com seu telefone' : 'Código enviado por SMS'}
      </Text>

      {step === 'form' ? (
        <>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor={C.muted}
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            placeholderTextColor={C.muted}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Você é</Text>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, tipo === 'passageiro' && styles.toggleBtnActivePassenger]}
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
              style={[styles.toggleBtn, tipo === 'motoboy' && styles.toggleBtnActiveDriver]}
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
            style={[styles.cta, carregando && styles.ctaDisabled]}
            onPress={enviarCodigo}
            disabled={carregando}
          >
            <Text style={styles.ctaText}>
              {carregando ? 'Enviando...' : 'Enviar código'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.infoText}>
            Digite o código de 6 dígitos enviado para{' '}
            <Text style={{ fontWeight: '700' }}>+55 {telefone}</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            placeholderTextColor={C.muted}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.cta, carregando && styles.ctaDisabled]}
            onPress={confirmarCodigo}
            disabled={carregando}
          >
            <Text style={styles.ctaText}>
              {carregando ? 'Confirmando...' : 'Confirmar código'}
            </Text>
          </TouchableOpacity>
          <View style={styles.retryRow}>
            <TouchableOpacity onPress={voltar}>
              <Text style={styles.linkText}>Trocar número</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCarregando(true);
                enviarCodigoTelefone({ nome, telefone, tipo })
                  .then(async (resultado) => {
                    if ('usuario' in resultado) {
                      await entrar(resultado.usuario);
                      router.replace(
                        resultado.usuario.tipo === 'passageiro'
                          ? '/(passenger)/home'
                          : '/(driver)/home'
                      );
                    } else {
                      Alert.alert('OK', 'Código reenviado.');
                    }
                  })
                  .catch((err: Error) => Alert.alert('Erro', err.message))
                  .finally(() => setCarregando(false));
              }}
              disabled={carregando}
            >
              <Text style={styles.linkText}>Reenviar código</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: C.navy,
    textAlign: 'center',
  },
  titleAccent: {
    color: C.orange,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  infoText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
    fontSize: 16,
    color: C.text,
    marginBottom: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: 20,
  },
  toggle: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#E4E7EC',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleBtnActivePassenger: {
    backgroundColor: C.orange,
  },
  toggleBtnActiveDriver: {
    backgroundColor: C.navy,
  },
  toggleText: {
    fontSize: 13.5,
    color: C.muted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  cta: {
    width: '100%',
    borderRadius: 16,
    padding: 15,
    backgroundColor: C.orange,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  retryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkText: {
    color: C.navy,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
});