import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Localizacao } from '../hooks/useLocation';

interface Props {
  origem: Localizacao | null;
  destino?: Localizacao | null;
}

export default function MapaCard({ origem, destino }: Props) {
  if (!origem) {
    return <View style={styles.fallback} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        initialRegion={{
          latitude: origem.lat,
          longitude: origem.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={{ latitude: origem.lat, longitude: origem.lng }}
          title="Origem"
        />
        {destino && (
          <Marker
            coordinate={{ latitude: destino.lat, longitude: destino.lng }}
            title="Destino"
            pinColor="#EF4444"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fallback: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
});
