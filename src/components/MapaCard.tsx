import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Localizacao } from '../hooks/useLocation';
import type { Rota } from '../services/rotas';

const C = {
  navy: '#10233F',
  red: '#DC3B2E',
  green: '#1C9A5B',
};

interface Props {
  origem: Localizacao | null;
  destino?: Localizacao | null;
  motoboy?: Localizacao | null;
  rota?: Rota | null;
  pickupLabel?: string;
  destLabel?: string;
}

export default function MapaCard({
  origem,
  destino,
  motoboy,
  rota,
  pickupLabel,
  destLabel,
}: Props) {
  if (!origem) {
    return <View style={styles.fallback} />;
  }

  const pontos = [origem];
  if (destino) pontos.push(destino);
  if (motoboy) pontos.push(motoboy);
  if (rota?.pontos?.length) pontos.push(...rota.pontos);

  const lats = pontos.map((p) => p.lat);
  const lngs = pontos.map((p) => p.lng);

  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);

  // Dynamic padding: more when points are close together
  const latPad = latSpan < 0.005 ? 0.012 : latSpan < 0.02 ? 0.01 : 0.008;
  const lngPad = lngSpan < 0.005 ? 0.012 : lngSpan < 0.02 ? 0.01 : 0.008;

  const latDelta = Math.max(latSpan + latPad * 2, 0.022);
  const lngDelta = Math.max(lngSpan + lngPad * 2, 0.022);

  const region = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.min(latDelta, 0.08),
    longitudeDelta: Math.min(lngDelta, 0.08),
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        initialRegion={region}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        showsUserLocation={false}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        maxZoomLevel={18}
        minZoomLevel={10}
        mapType="standard"
      >
        <Marker
          coordinate={{ latitude: origem.lat, longitude: origem.lng }}
          title={pickupLabel || 'Origem'}
          pinColor={C.navy}
        />
        {motoboy && (
          <Marker
            coordinate={{ latitude: motoboy.lat, longitude: motoboy.lng }}
            title="Motoboy"
            pinColor={C.green}
          />
        )}
        {destino && (
          <Marker
            coordinate={{ latitude: destino.lat, longitude: destino.lng }}
            title={destLabel || 'Destino'}
            pinColor={C.red}
          />
        )}
        {rota?.pontos && rota.pontos.length > 0 && (
          <Polyline
            coordinates={rota.pontos.map((p) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor={C.navy}
            strokeWidth={4.5}
          />
        )}
      </MapView>

      {/* ── Labels sobre o mapa ── */}
      {(pickupLabel || destLabel) && (
        <View style={styles.labels}>
          {pickupLabel && (
            <View style={styles.tag}>
              <View style={[styles.dot, { backgroundColor: C.navy }]} />
              <Text style={styles.tagText}>{pickupLabel}</Text>
            </View>
          )}
          {destLabel && (
            <View style={styles.tag}>
              <View style={[styles.dot, { backgroundColor: C.red }]} />
              <Text style={styles.tagText}>{destLabel}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Rota: distância e duração ── */}
      {rota && (
        <View style={styles.rotaChip}>
          <Text style={styles.rotaText}>
            {rota.distanciaKm.toLocaleString('pt-BR').replace('.', ',')} km · ~{rota.duracaoMin}{' '}
            min
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  fallback: {
    width: '100%',
    flex: 1,
    backgroundColor: '#D8E1E9',
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  labels: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#16202B',
  },

  rotaChip: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rotaText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
});
