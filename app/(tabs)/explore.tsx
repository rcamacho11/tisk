import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { locationService } from '@/src/services/locationService';
import { FriendLocation } from '@/src/types/api';
import { supabase } from '@/utils/supabase';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

const generateMapHTML = (latitude: number, longitude: number, isDark: boolean, friendLocations: FriendLocation[] = []) => {
  const bgColor = isDark ? '#1e1e1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const friendMarkersJS = (Array.isArray(friendLocations) ? friendLocations : []).map((f) => `
    L.marker([${f.latitude}, ${f.longitude}], {
      icon: L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzAwN0FGRiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      })
    }).addTo(map).bindPopup('<div class="info"><strong>${f.profile.username}</strong>${f.profile.name ? '<br/>' + f.profile.name : ''}<br/>Updated: ${new Date(f.updated_at).toLocaleTimeString()}</div>');
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background-color: ${bgColor};
          color: ${textColor};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        #map {
          height: 100vh;
          width: 100vw;
        }
        .info {
          background-color: rgba(255, 255, 255, 0.9);
          padding: 16px;
          border-radius: 8px;
          max-width: 300px;
          font-size: 14px;
          line-height: 1.6;
        }
        ${isDark ? '.info { background-color: rgba(30, 30, 30, 0.95); color: #ffffff; }' : ''}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${latitude}, ${longitude}], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Create a custom icon for user location
        const userIcon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzRDQUY1MCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        // Add user marker
        const marker = L.marker([${latitude}, ${longitude}], { icon: userIcon })
          .addTo(map)
          .bindPopup('<div class="info"><strong>You are here</strong><br/>Lat: ${latitude.toFixed(6)}<br/>Lng: ${longitude.toFixed(6)}</div>')
          .openPopup();

        // Add accuracy circle
        const circle = L.circle([${latitude}, ${longitude}], {
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 0.1,
          radius: 20
        }).addTo(map);

        // Add friend markers
        ${friendMarkersJS}

        // Listen for location updates from React Native
        window.updateLocation = function(lat, lng) {
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
        };
      </script>
    </body>
    </html>
  `;
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);

  useEffect(() => {
    requestLocationPermission();
    fetchFriendLocations();

    // Subscribe to real-time location updates
    const channel = supabase
      .channel('friend-locations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations',
      }, () => {
        fetchFriendLocations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchFriendLocations = async () => {
    const { data } = await locationService.getFriendsLocations();
    if (data && Array.isArray(data)) setFriendLocations(data);
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          setError('Location permission is permanently disabled. Please enable it in Settings.');
        } else {
          setError('Permission to access location was denied');
        }
        setLoading(false);
        return;
      }

      await updateLocation();
    } catch (err) {
      setError('Failed to get location');
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      setError(null);
      setLoading(false);

      // Update map with new location
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `window.updateLocation(${currentLocation.coords.latitude}, ${currentLocation.coords.longitude});`
        );
      }

      // Try to get address
      try {
        const reverseGeocoded = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        if (reverseGeocoded.length > 0) {
          const addr = reverseGeocoded[0];
          const addressString = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''} ${addr.country || ''}`.trim();
          setAddress(addressString);
        }
      } catch (addrErr) {
        // Silently fail on address lookup
      }

      // Watch location for real-time updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        async (newLocation) => {
          setLocation(newLocation);

          // Push location to backend
          await locationService.sendLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            address: '',
            accuracy: newLocation.coords.accuracy ?? 0,
            timestamp: new Date(newLocation.timestamp).toISOString(),
          });

          // Update map with new location
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `window.updateLocation(${newLocation.coords.latitude}, ${newLocation.coords.longitude});`
            );
          }
        }
      );

      return () => subscription.remove();
    } catch (err) {
      setError('Failed to get location');
      setLoading(false);
    }
  };

  const handleOpenMaps = () => {
    if (!location) return;

    const { latitude, longitude } = location.coords;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=My Location`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(My Location)`,
      web: `https://maps.google.com/?q=${latitude},${longitude}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleCenterMap = async () => {
    await updateLocation();
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <ThemedText style={styles.loadingText}>Getting your location...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    const isPermanentlyDenied = error.includes('permanently disabled');
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          {isPermanentlyDenied ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => Linking.openSettings()}>
              <ThemedText style={styles.retryButtonText}>Open Settings</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={requestLocationPermission}>
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {location && (
        <>
          <WebView
            key={friendLocations.map(f => f.user_id).join(',')}
            ref={webViewRef}
            source={{
              html: generateMapHTML(
                location.coords.latitude,
                location.coords.longitude,
                colorScheme === 'dark',
                friendLocations
              ),
            }}
            style={styles.map}
            scalesPageToFit={true}
            scrollEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator
                color="#4CAF50"
                size="large"
                style={styles.mapLoading}
              />
            )}
          />

          <ThemedView style={styles.overlay}>
            <ThemedView style={styles.infoPanel}>
              {address && (
                <ThemedView style={styles.addressRow}>
                  <Ionicons name="location" size={18} color="#4CAF50" />
                  <ThemedView style={styles.addressText}>
                    <ThemedText style={styles.addressValue}>{address}</ThemedText>
                  </ThemedView>
                </ThemedView>
              )}

              <ThemedView style={styles.coordsContainer}>
                <ThemedView style={styles.coordRow}>
                  <ThemedText style={styles.coordLabel}>Lat:</ThemedText>
                  <ThemedText style={styles.coordValue}>
                    {location.coords.latitude.toFixed(6)}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.coordRow}>
                  <ThemedText style={styles.coordLabel}>Lng:</ThemedText>
                  <ThemedText style={styles.coordValue}>
                    {location.coords.longitude.toFixed(6)}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleCenterMap}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <ThemedText style={styles.buttonText}>Refresh</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleOpenMaps}>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <ThemedText style={styles.buttonText}>Open Maps</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addressText: {
    flex: 1,
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  coordsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  coordRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    minWidth: 35,
  },
  coordValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
