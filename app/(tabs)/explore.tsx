import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
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

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const loc = locations[0];
    if (loc) {
      await locationService.sendLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: '',
        accuracy: loc.coords.accuracy ?? 0,
        timestamp: new Date(loc.timestamp).toISOString(),
      });
    }
  }
});

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const mm = mins < 10 ? `0${mins}` : mins;
  return `${month}/${day}/${year} ${h}:${mm} ${ampm}`;
}

function getTimeSince(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const generateMapHTML = (latitude: number, longitude: number, isDark: boolean, friendLocations: FriendLocation[] = []) => {
  const bgColor = isDark ? '#1e1e1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';

  const now = new Date();
  const userTime = formatDateTime(now.toISOString());

  const friendMarkersJS = (Array.isArray(friendLocations) ? friendLocations : []).map((f) => {
    const isLive = f.sharing_enabled;
    const pinColor = isLive ? '#007AFF' : '#999999';
    const statusLabel = isLive ? 'Live' : 'Last seen';
    const timeStr = formatDateTime(f.updated_at);

    const svgBase64 = isLive
      ? 'PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzAwN0FGRiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+'
      : 'PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzk5OTk5OSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+';

    return `
      L.marker([${f.latitude}, ${f.longitude}], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml;base64,${svgBase64}',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        })
      }).addTo(map).bindPopup('<div class="info"><strong>${f.profile.username}</strong>${f.profile.name ? '<br/>' + f.profile.name : ''}<br/><span style="color:${pinColor};font-weight:600">${statusLabel}</span><br/>${timeStr}</div>');
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background-color: ${bgColor};
          color: ${textColor};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        #map { height: 100vh; width: 100vw; }
        .info {
          background-color: rgba(255, 255, 255, 0.95);
          padding: 12px 16px;
          border-radius: 10px;
          max-width: 280px;
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
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const userIcon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzRDQUY1MCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([${latitude}, ${longitude}], { icon: userIcon })
          .addTo(map)
          .bindPopup('<div class="info"><strong>You are here</strong><br/>${userTime}</div>')
          .openPopup();

        const circle = L.circle([${latitude}, ${longitude}], {
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 0.1,
          radius: 20
        }).addTo(map);

        ${friendMarkersJS}

        window.updateLocation = function(lat, lng) {
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
        };

        window.panTo = function(lat, lng) {
          map.setView([lat, lng], 16, { animate: true });
        };
      </script>
    </body>
    </html>
  `;
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [showFriendsList, setShowFriendsList] = useState(false);

  useEffect(() => {
    startTracking();
    fetchFriendLocations();

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFriendLocations = async () => {
    const { data } = await locationService.getFriendsLocations();
    if (data && Array.isArray(data)) setFriendLocations(data);
  };

  const startTracking = async () => {
    try {
      setLoading(true);

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setError('Permission to access location was denied');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      setError(null);
      setLoading(false);

      await locationService.sendLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: '',
        accuracy: currentLocation.coords.accuracy ?? 0,
        timestamp: new Date(currentLocation.timestamp).toISOString(),
      });

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
      } catch {}

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5 * 60 * 1000,
            distanceInterval: 50,
            deferredUpdatesInterval: 5 * 60 * 1000,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Tisk',
              notificationBody: 'Sharing your location with friends',
              notificationColor: '#4CAF50',
            },
          });
        }
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        async (newLocation) => {
          setLocation(newLocation);
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
    if (url) Linking.openURL(url);
  };

  const handleRefresh = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `window.updateLocation(${currentLocation.coords.latitude}, ${currentLocation.coords.longitude});`
        );
      }
      await locationService.sendLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: '',
        accuracy: currentLocation.coords.accuracy ?? 0,
        timestamp: new Date(currentLocation.timestamp).toISOString(),
      });
    } catch {}
    await fetchFriendLocations();
  };

  const handleGoToFriend = (friend: FriendLocation) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.panTo(${friend.latitude}, ${friend.longitude});`
      );
    }
    setShowFriendsList(false);
  };

  const handleGoToMe = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.panTo(${location.coords.latitude}, ${location.coords.longitude});`
      );
    }
    setShowFriendsList(false);
  };

  const liveCount = friendLocations.filter(f => f.sharing_enabled).length;
  const lastSeenCount = friendLocations.filter(f => !f.sharing_enabled).length;

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
              onPress={startTracking}>
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
            key={friendLocations.map(f => `${f.user_id}-${f.sharing_enabled}`).join(',')}
            ref={webViewRef}
            source={{
              html: generateMapHTML(
                location.coords.latitude,
                location.coords.longitude,
                isDark,
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

          {/* Friends badge / dropdown toggle */}
          {friendLocations.length > 0 && (
            <TouchableOpacity
              style={styles.friendsBadge}
              onPress={() => setShowFriendsList(!showFriendsList)}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={16} color="#fff" />
              <ThemedText style={styles.friendsBadgeText}>
                {liveCount > 0 ? `${liveCount} live` : ''}
                {liveCount > 0 && lastSeenCount > 0 ? ' · ' : ''}
                {lastSeenCount > 0 ? `${lastSeenCount} last seen` : ''}
              </ThemedText>
              <Ionicons
                name={showFriendsList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          )}

          {/* Friends dropdown list */}
          {showFriendsList && (
            <ThemedView style={[styles.friendsDropdown, { borderColor: isDark ? '#333' : '#ddd' }]}>
              <ScrollView style={styles.friendsScroll} showsVerticalScrollIndicator={false}>
                {/* Me row */}
                <TouchableOpacity
                  style={[styles.friendItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                  onPress={handleGoToMe}
                  activeOpacity={0.7}
                >
                  <ThemedView style={[styles.friendDot, { backgroundColor: '#4CAF50' }]} />
                  <ThemedView style={styles.friendInfo}>
                    <ThemedText style={styles.friendItemName}>Me</ThemedText>
                    <ThemedText style={styles.friendItemStatus}>
                      <ThemedText style={{ color: '#4CAF50', fontWeight: '600', fontSize: 12 }}>Live</ThemedText>
                    </ThemedText>
                  </ThemedView>
                  <Ionicons name="navigate-outline" size={18} color="#4CAF50" />
                </TouchableOpacity>

                {/* Friend rows */}
                {friendLocations.map((friend) => {
                  const isLive = friend.sharing_enabled;
                  const dotColor = isLive ? '#007AFF' : '#999';
                  return (
                    <TouchableOpacity
                      key={friend.user_id}
                      style={[styles.friendItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                      onPress={() => handleGoToFriend(friend)}
                      activeOpacity={0.7}
                    >
                      <ThemedView style={[styles.friendDot, { backgroundColor: dotColor }]} />
                      <ThemedView style={styles.friendInfo}>
                        <ThemedText style={styles.friendItemName}>
                          {friend.profile.username}
                          {friend.profile.name ? ` (${friend.profile.name})` : ''}
                        </ThemedText>
                        <ThemedText style={styles.friendItemStatus}>
                          <ThemedText style={{ color: dotColor, fontWeight: '600', fontSize: 12 }}>
                            {isLive ? 'Live' : 'Last seen'}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>
                            {' — '}{getTimeSince(friend.updated_at)}
                          </ThemedText>
                        </ThemedText>
                      </ThemedView>
                      <Ionicons name="navigate-outline" size={18} color={dotColor} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ThemedView>
          )}

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
                  onPress={handleRefresh}>
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
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  friendsBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  friendsBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  friendsDropdown: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    maxHeight: 280,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  friendsScroll: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  friendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  friendInfo: {
    flex: 1,
  },
  friendItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendItemStatus: {
    fontSize: 12,
    marginTop: 2,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingBottom: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
