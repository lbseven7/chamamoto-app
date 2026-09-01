import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface Localizacao {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!ativo) return;
        if (status !== 'granted') {
          setErro('Permissão de localização negada.');
          setCarregando(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!ativo) return;
        setLocalizacao({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch (e) {
        if (ativo) setErro('Não foi possível obter a localização.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  return { localizacao, erro, carregando };
}
