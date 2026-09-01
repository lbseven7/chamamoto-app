import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Localizacao } from '../hooks/useLocation';

const C = {
  navy: '#10233F',
  red: '#DC3B2E',
  green: '#1C9A5B',
};

interface Props {
  origem: Localizacao | null;
  destino?: Localizacao | null;
  motoboy?: Localizacao | null;
  pickupLabel?: string;
  destLabel?: string;
}

export default function MapaCard({
  origem,
  destino,
  motoboy,
  pickupLabel,
  destLabel,
}: Props) {
  if (!origem) {
    return <View style={styles.fallback} />;
  }

  const pontos = [origem];
  if (destino) pontos.push(destino);
  if (motoboy) pontos.push(motoboy);

  const lats = pontos.map((p) => p.lat);
  const lngs = pontos.map((p) => p.lng);
  const latDelta = Math.max(Math.max(...lats) - Math.min(...lats) + 0.008, 0.02);
  const lngDelta = Math.max(Math.max(...lngs) - Math.min(...lngs) + 0.008, 0.02);
  const region = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.min(latDelta, 0.6),
    longitudeDelta: Math.min(lngDelta, 0.6),
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.mapa} initialRegion={region}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 250,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  fallback: {
    width: '100%',
    height: 250,
    backgroundColor: '#D8E1E9',
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  labels: {
    position: 'absolute',
    top: 8,
    left: 8,
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
});
