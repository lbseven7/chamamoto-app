import type { Localizacao } from '../hooks/useLocation';

export interface Rota {
  pontos: Localizacao[];
  distanciaKm: number;
  duracaoMin: number;
}

export async function buscarRota(
  origem: Localizacao,
  destino: Localizacao
): Promise<Rota> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Google Maps não configurada.');
  }

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origem.lat},${origem.lng}` +
    `&destination=${destino.lat},${destino.lng}` +
    `&mode=driving&key=${apiKey}`;

  const resposta = await fetch(url);
  const json = (await resposta.json()) as {
    status: string;
    routes?: {
      legs?: {
        distance?: { value: number };
        duration?: { value: number };
      }[];
      overview_polyline?: { points?: string };
    }[];
  };

  if (resposta.status !== 200 || json.status !== 'OK' || !json.routes?.length) {
    throw new Error('Não foi possível traçar a rota.');
  }

  const rota = json.routes[0];
  const leg = rota.legs?.[0];
  const pontos = decodificarPolyline(rota.overview_polyline?.points ?? '');
  if (pontos.length < 2) {
    throw new Error('Rota sem pontos suficientes.');
  }

  return {
    pontos,
    distanciaKm: Math.round(((leg?.distance?.value ?? 0) / 1000) * 10) / 10,
    duracaoMin: Math.max(1, Math.round((leg?.duration?.value ?? 0) / 60)),
  };
}

function decodificarPolyline(codificada: string): Localizacao[] {
  const pontos: Localizacao[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < codificada.length) {
    let b;
    let resultado = 0;
    let deslocamento = 0;
    do {
      b = codificada.charCodeAt(index++) - 63;
      resultado |= (b & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (b >= 0x20);
    const dLat = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
    lat += dLat;

    resultado = 0;
    deslocamento = 0;
    do {
      b = codificada.charCodeAt(index++) - 63;
      resultado |= (b & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (b >= 0x20);
    const dLng = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
    lng += dLng;

    pontos.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return pontos;
}