import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

type Status = 'offline' | 'disponivel' | 'em_corrida';

export default function DriverHomeScreen() {
  const { usuario, sair } = useAuth();
  const [status, setStatus] = useState<Status>('offline');

  const toggleStatus = () => {
    setStatus((s) => (s === 'offline' ? 'disponivel' : 'offline'));
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
      <Text style={styles.statusText}>Status: {status}</Text>
      <TouchableOpacity
        style={[styles.button, status === 'offline' ? styles.online : styles.offline]}
        onPress={toggleStatus}
      >
        <Text style={styles.buttonText}>
          {status === 'offline' ? 'Ficar disponível' : 'Ficar offline'}
        </Text>
      </TouchableOpacity>
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
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
