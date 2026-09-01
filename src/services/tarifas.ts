import type { Localizacao } from '../hooks/useLocation';

const PRECO_BASE = 4.0;
const PRECO_POR_KM = 2.5;
const KM_EXTRA_ESTRADAS = 1.2;
const RAIO_TERRA_KM = 6371;

export function distanciaKm(a: Localizacao, b: Localizacao): number {
  const paraRadianos = (graus: number) => (graus * Math.PI) / 180;
  const dLat = paraRadianos(b.lat - a.lat);
  const dLng = paraRadianos(b.lng - a.lng);
  const la = paraRadianos(a.lat);
  const lb = paraRadianos(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;

  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export function calcularPreco(origem: Localizacao, destino: Localizacao): number {
  const km = distanciaKm(origem, destino) * KM_EXTRA_ESTRADAS;
  const total = PRECO_BASE + km * PRECO_POR_KM;
  return Math.round(Math.max(PRECO_BASE, total) * 100) / 100;
}

export function formatarPreco(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}