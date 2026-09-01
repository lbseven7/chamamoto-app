import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="perfil" options={{ headerShown: true, title: 'Perfil' }} />
        <Stack.Screen name="historico" options={{ headerShown: true, title: 'Histórico' }} />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
