import type { Localizacao } from '../hooks/useLocation';

export async function geocodificar(endereco: string): Promise<Localizacao> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Google Maps não configurada.');
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    endereco
  )}&key=${apiKey}`;

  const resposta = await fetch(url);
  const json = (await resposta.json()) as {
    status: string;
    results?: { geometry: { location: { lat: number; lng: number } } }[];
  };

  if (resposta.status !== 200 || json.status !== 'OK' || !json.results?.length) {
    throw new Error('Não foi possível localizar esse endereço.');
  }

  const { lat, lng } = json.results[0].geometry.location;
  return { lat, lng };
}