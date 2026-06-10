import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { locationService } from '@/src/services/locationService';
import { taskService } from '@/src/services/taskService';
import { FriendLocation, FriendTask, Task } from '@/src/types/api';
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

const generateMapHTML = (latitude: number, longitude: number, isDark: boolean, friendLocations: FriendLocation[] = [], tasks: Task[] = [], friendTasks: FriendTask[] = []) => {
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

  const initialTasksJson = JSON.stringify(
    tasks
      .filter((t) => t.latitude != null && t.longitude != null && !t.completed)
      .map((t) => ({ latitude: t.latitude, longitude: t.longitude, title: t.title, priority: t.priority }))
  );

  const initialFriendTasksJson = JSON.stringify(
    friendTasks
      .filter((t) => t.latitude != null && t.longitude != null && !t.completed)
      .map((t) => ({ latitude: t.latitude, longitude: t.longitude, title: t.title, profile: { username: t.profile?.username } }))
  );

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = isDark
    ? '&copy; OpenStreetMap contributors &copy; CARTO'
    : '&copy; OpenStreetMap contributors';

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
        .leaflet-control-attribution {
          background: ${isDark ? 'rgba(30,30,46,0.7) !important' : 'rgba(255,255,255,0.7) !important'};
          color: ${isDark ? '#888 !important' : '#333 !important'};
        }
        .leaflet-control-attribution a {
          color: ${isDark ? '#aaa !important' : '#0078A8 !important'};
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${latitude}, ${longitude}], 16);

        L.tileLayer('${tileUrl}', {
          attribution: '${tileAttribution}',
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

        var taskLayer = L.layerGroup().addTo(map);
        var friendTaskLayer = L.layerGroup().addTo(map);
        var TASK_PIN = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyOCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQgMEM2LjI2OCAwIDAgNi4yNjggMCAxNGMwIDEwLjUgMTQgMjYgMTQgMjZTMjggMjQuNSAyOCAxNEMyOCA2LjI2OCAyMS43MzIgMCAxNCAwWiIgZmlsbD0iI0ZGNkI2QiIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iMTQiIHI9IjciIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTEgMTRMMTMgMTZMMTcgMTIiIHN0cm9rZT0iI0ZGNkI2QiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=',
          iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -40]
        });
        var FRIEND_TASK_PIN = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyOCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQgMEM2LjI2OCAwIDAgNi4yNjggMCAxNGMwIDEwLjUgMTQgMjYgMTQgMjZTMjggMjQuNSAyOCAxNEMyOCA2LjI2OCAyMS43MzIgMCAxNCAwWiIgZmlsbD0iIzAwN0FGRiIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iMTQiIHI9IjciIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTEgMTRMMTMgMTZMMTcgMTIiIHN0cm9rZT0iIzAwN0FGRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=',
          iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -40]
        });
        window.updateTaskMarkers = function(tasksJson) {
          taskLayer.clearLayers();
          JSON.parse(tasksJson).forEach(function(t) {
            var pc = t.priority === 'high' ? '#ff6b6b' : t.priority === 'medium' ? '#ffa500' : '#4CAF50';
            var title = (t.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            var pl = (t.priority || 'medium'); pl = pl.charAt(0).toUpperCase() + pl.slice(1);
            L.circle([t.latitude, t.longitude], { radius: 50, color: pc, fillColor: pc, fillOpacity: 0.15, weight: 2, dashArray: '6 4' }).addTo(taskLayer);
            L.marker([t.latitude, t.longitude], { icon: TASK_PIN }).addTo(taskLayer).bindPopup('<div class="info"><strong>' + title + '</strong><br/><span style="color:' + pc + ';font-weight:600">' + pl + ' priority</span><br/><span style="font-size:12px;opacity:0.7">Be within 50m to complete</span></div>');
          });
        };
        window.updateFriendTaskMarkers = function(tasksJson) {
          friendTaskLayer.clearLayers();
          JSON.parse(tasksJson).forEach(function(t) {
            var title = (t.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            var owner = (t.profile && t.profile.username || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
            L.circle([t.latitude, t.longitude], { radius: 50, color: '#007AFF', fillColor: '#007AFF', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }).addTo(friendTaskLayer);
            L.marker([t.latitude, t.longitude], { icon: FRIEND_TASK_PIN }).addTo(friendTaskLayer).bindPopup('<div class="info"><strong>' + title + '</strong><br/><span style="color:#007AFF;font-weight:600">' + owner + '&#39;s task</span><br/><span style="font-size:12px;opacity:0.7">50m radius</span></div>');
          });
        };
        window.updateTaskMarkers(${JSON.stringify(initialTasksJson)});
        window.updateFriendTaskMarkers(${JSON.stringify(initialFriendTasksJson)});

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
  const { taskLat, taskLng, taskTitle } = useLocalSearchParams<{ taskLat?: string; taskLng?: string; taskTitle?: string }>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [friendTasks, setFriendTasks] = useState<FriendTask[]>([]);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  const [selectedFriendAddress, setSelectedFriendAddress] = useState<string | null>(null);
  const [showTasksList, setShowTasksList] = useState(false);
  const lastSendRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const MOVING_INTERVAL = 45 * 1000;
  const STATIONARY_INTERVAL = 5 * 60 * 1000;
  const MOVING_SPEED_THRESHOLD = 0.5; // m/s — above this counts as moving

  const fetchTasks = async () => {
    const { data } = await taskService.getTasks();
    if (data && Array.isArray(data)) setTasks(data);
  };

  const fetchFriendTasks = async () => {
    const { data } = await taskService.getFriendsTasks();
    if (data && Array.isArray(data)) setFriendTasks(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchFriendTasks();
    }, [])
  );

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

  useEffect(() => {
    if (taskLat && taskLng && webViewRef.current) {
      const lat = parseFloat(taskLat);
      const lng = parseFloat(taskLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        webViewRef.current.injectJavaScript(
          `window.panTo(${lat}, ${lng});`
        );
      }
    }
  }, [taskLat, taskLng]);

  useEffect(() => {
    if (!webViewRef.current) return;
    const data = tasks
      .filter(t => t.latitude != null && t.longitude != null && !t.completed)
      .map(t => ({ latitude: t.latitude, longitude: t.longitude, title: t.title, priority: t.priority }));
    webViewRef.current.injectJavaScript(
      `if(window.updateTaskMarkers) window.updateTaskMarkers(${JSON.stringify(JSON.stringify(data))});`
    );
  }, [tasks]);

  useEffect(() => {
    if (!webViewRef.current) return;
    const data = friendTasks
      .filter(t => t.latitude != null && t.longitude != null && !t.completed)
      .map(t => ({ latitude: t.latitude, longitude: t.longitude, title: t.title, profile: { username: t.profile?.username } }));
    webViewRef.current.injectJavaScript(
      `if(window.updateFriendTaskMarkers) window.updateFriendTaskMarkers(${JSON.stringify(JSON.stringify(data))});`
    );
  }, [friendTasks]);

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

      let bgStatus = 'denied';
      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        bgStatus = status;
      } catch {}
      if (bgStatus === 'granted') {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Low,
            timeInterval: 15 * 60 * 1000,
            distanceInterval: 100,
            deferredUpdatesInterval: 15 * 60 * 1000,
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
          timeInterval: 5000,
          distanceInterval: 5,
        },
        async (newLocation) => {
          setLocation(newLocation);
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `window.updateLocation(${newLocation.coords.latitude}, ${newLocation.coords.longitude});`
            );
          }

          const speed = newLocation.coords.speed ?? 0;
          const isMoving = speed > MOVING_SPEED_THRESHOLD;
          const interval = isMoving ? MOVING_INTERVAL : STATIONARY_INTERVAL;
          const now = Date.now();

          if (now - lastSendRef.current >= interval) {
            lastSendRef.current = now;
            lastCoordsRef.current = {
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude,
            };
            await locationService.sendLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              address: '',
              accuracy: newLocation.coords.accuracy ?? 0,
              timestamp: new Date(newLocation.timestamp).toISOString(),
            });
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
    if (selectedFriend) {
      const { latitude: dLat, longitude: dLng } = selectedFriend;
      const url = Platform.select({
        ios: `maps://maps.apple.com/?daddr=${dLat},${dLng}&dirflg=d`,
        android: `google.navigation:q=${dLat},${dLng}`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}`,
      });
      if (url) Linking.openURL(url);
    } else if (location) {
      const { latitude, longitude } = location.coords;
      const url = Platform.select({
        ios: `maps://maps.apple.com/?ll=${latitude},${longitude}&q=My Location`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(My Location)`,
        web: `https://maps.google.com/?q=${latitude},${longitude}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleDirectionsToTask = (task: Task | FriendTask) => {
    if (task.latitude == null || task.longitude == null) return;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${task.latitude},${task.longitude}&dirflg=d`,
      android: `google.navigation:q=${task.latitude},${task.longitude}`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleGoToTask = (task: Task | FriendTask) => {
    if (task.latitude == null || task.longitude == null) return;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.panTo(${task.latitude}, ${task.longitude});`
      );
    }
    setShowTasksList(false);
  };

  const selectedFriendTasks = selectedFriend
    ? friendTasks.filter(t => t.user_id === selectedFriend.user_id)
    : [];

  const displayTasks = selectedFriend ? selectedFriendTasks : tasks;

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

  const handleGoToFriend = async (friend: FriendLocation) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.panTo(${friend.latitude}, ${friend.longitude});`
      );
    }
    setSelectedFriend(friend);
    setSelectedFriendAddress(null);
    setShowFriendsList(false);
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: friend.latitude,
        longitude: friend.longitude,
      });
      if (results.length > 0) {
        const a = results[0];
        const addr = `${a.street || ''} ${a.city || ''} ${a.region || ''}`.trim();
        setSelectedFriendAddress(addr || `${friend.latitude.toFixed(4)}, ${friend.longitude.toFixed(4)}`);
      }
    } catch {
      setSelectedFriendAddress(`${friend.latitude.toFixed(4)}, ${friend.longitude.toFixed(4)}`);
    }
  };

  const handleGoToMe = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.panTo(${location.coords.latitude}, ${location.coords.longitude});`
      );
    }
    setSelectedFriend(null);
    setSelectedFriendAddress(null);
    setShowFriendsList(false);
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
                taskLat ? parseFloat(taskLat) : location.coords.latitude,
                taskLng ? parseFloat(taskLng) : location.coords.longitude,
                isDark,
                friendLocations,
                tasks,
                friendTasks
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

          {/* Selected user header */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.userSelector}
              onPress={() => { setShowFriendsList(!showFriendsList); setShowTasksList(false); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={selectedFriend ? 'person' : 'person-circle'}
                size={18}
                color={selectedFriend ? '#007AFF' : '#4CAF50'}
              />
              <ThemedText style={styles.userSelectorText} numberOfLines={1}>
                {selectedFriend ? selectedFriend.profile.username : 'Me'}
              </ThemedText>
              <Ionicons
                name={showFriendsList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.taskSelector}
              onPress={() => { setShowTasksList(!showTasksList); setShowFriendsList(false); }}
              activeOpacity={0.8}
            >
              <Ionicons name="list" size={16} color="#fff" />
              <ThemedText style={styles.taskSelectorText}>
                Tasks ({displayTasks.filter(t => !t.completed).length})
              </ThemedText>
              <Ionicons
                name={showTasksList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Friends dropdown list */}
          {showFriendsList && (
            <ThemedView style={[styles.friendsDropdown, { borderColor: isDark ? '#333' : '#ddd' }]}>
              <ScrollView style={styles.friendsScroll} showsVerticalScrollIndicator={false}>
                {/* Me row */}
                <TouchableOpacity
                  style={[
                    styles.friendItem,
                    { borderBottomColor: isDark ? '#333' : '#eee' },
                    !selectedFriend && { backgroundColor: isDark ? '#1a3a1a' : '#e8f5e9' },
                  ]}
                  onPress={handleGoToMe}
                  activeOpacity={0.7}
                >
                  <View style={[styles.friendDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.friendInfo}>
                    <ThemedText style={styles.friendItemName}>Me</ThemedText>
                    <ThemedText style={styles.friendItemStatus}>
                      <ThemedText style={{ color: '#4CAF50', fontWeight: '600', fontSize: 12 }}>Live</ThemedText>
                    </ThemedText>
                  </View>
                  {!selectedFriend && <Ionicons name="checkmark" size={18} color="#4CAF50" />}
                  <Ionicons name="navigate-outline" size={18} color="#4CAF50" />
                </TouchableOpacity>

                {/* Friend rows */}
                {friendLocations.map((friend) => {
                  const isLive = friend.sharing_enabled;
                  const dotColor = isLive ? '#007AFF' : '#999';
                  const isSelected = selectedFriend?.user_id === friend.user_id;
                  return (
                    <TouchableOpacity
                      key={friend.user_id}
                      style={[
                        styles.friendItem,
                        { borderBottomColor: isDark ? '#333' : '#eee' },
                        isSelected && { backgroundColor: isDark ? '#1a2a3a' : '#e3f2fd' },
                      ]}
                      onPress={() => handleGoToFriend(friend)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.friendDot, { backgroundColor: dotColor }]} />
                      <View style={styles.friendInfo}>
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
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#007AFF" />}
                      <Ionicons name="navigate-outline" size={18} color={dotColor} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ThemedView>
          )}

          {/* Tasks dropdown list */}
          {showTasksList && (
            <ThemedView style={[styles.tasksDropdown, { borderColor: isDark ? '#333' : '#ddd' }]}>
              <ScrollView style={styles.friendsScroll} showsVerticalScrollIndicator={false}>
                {displayTasks.filter(t => !t.completed).length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ThemedText style={{ opacity: 0.5, fontSize: 14 }}>
                      {selectedFriend ? `No active tasks for ${selectedFriend.profile.username}` : 'No active tasks'}
                    </ThemedText>
                  </View>
                ) : (
                  displayTasks.filter(t => !t.completed).map((task) => {
                    const priorityColor = task.priority === 'high' ? '#ff6b6b' : task.priority === 'medium' ? '#ffa500' : '#4CAF50';
                    const ownerName = 'profile' in task ? (task as FriendTask).profile?.username : undefined;
                    return (
                      <View
                        key={task.id}
                        style={[styles.taskItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                      >
                        <TouchableOpacity
                          style={styles.taskItemContent}
                          onPress={() => handleGoToTask(task)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.taskPriorityDot, { backgroundColor: priorityColor }]} />
                          <View style={styles.taskItemInfo}>
                            <ThemedText style={styles.taskItemTitle} numberOfLines={1}>
                              {task.title}
                            </ThemedText>
                            <ThemedText style={styles.taskItemMeta}>
                              {ownerName ? `${ownerName} · ` : ''}
                              {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
                              {task.dueDate ? ` · ${task.dueDate}` : ''}
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                        {task.latitude != null && task.longitude != null && (
                          <TouchableOpacity
                            style={styles.directionsButton}
                            onPress={() => handleDirectionsToTask(task)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="navigate" size={18} color="#007AFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </ThemedView>
          )}

          {selectedFriend ? (
            <View style={styles.addressPill}>
              <Ionicons name="person" size={14} color="#007AFF" />
              <ThemedText style={styles.addressPillText} numberOfLines={1}>
                {selectedFriend.profile.username}
                {selectedFriendAddress ? ` — ${selectedFriendAddress}` : ''}
              </ThemedText>
              <TouchableOpacity onPress={() => { setSelectedFriend(null); setSelectedFriendAddress(null); }}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          ) : address ? (
            <View style={styles.addressPill}>
              <Ionicons name="location" size={14} color="#4CAF50" />
              <ThemedText style={styles.addressPillText} numberOfLines={1}>{address}</ThemedText>
            </View>
          ) : null}

          <View style={styles.fabGroup}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={handleRefresh}
              activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabButton, selectedFriend ? { backgroundColor: '#007AFF' } : {}]}
              onPress={handleOpenMaps}
              activeOpacity={0.8}>
              <Ionicons name="navigate" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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
  topBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  userSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userSelectorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  taskSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  taskSelectorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  friendsDropdown: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
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
  tasksDropdown: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    maxHeight: 320,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  taskItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  taskPriorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskItemInfo: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskItemMeta: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  directionsButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  addressPill: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addressPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fabGroup: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 10,
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
