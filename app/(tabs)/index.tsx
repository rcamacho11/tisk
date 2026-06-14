import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApi, useMutation } from '@/src/hooks/useApi';
import { categoryService } from '@/src/services/categoryService';
import { subtaskService } from '@/src/services/subtaskService';
import { taskService } from '@/src/services/taskService';
import { Category, CreateTaskInput, Subtask, Task, UpdateTaskInput } from '@/src/types/api';

type Priority = 'low' | 'medium' | 'high';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

const generatePickerMapHTML = (latitude: number, longitude: number, isDark: boolean, pinLat?: number, pinLng?: number) => {
  const initPinLat = pinLat ?? latitude;
  const initPinLng = pinLng ?? longitude;
  const bgColor = isDark ? '#1a1a2e' : '#ffffff';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = isDark
    ? '&copy; OpenStreetMap contributors &copy; CARTO'
    : '&copy; OpenStreetMap contributors';
  const bannerBg = isDark ? 'rgba(30,30,46,0.88)' : 'rgba(255,255,255,0.92)';
  const bannerText = isDark ? '#e0e0e0' : '#333';
  const bannerBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: ${bgColor}; }
        #map { height: 100vh; width: 100vw; }
        .banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: ${bannerBg};
          color: ${bannerText};
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          border: 1px solid ${bannerBorder};
          pointer-events: none;
          white-space: nowrap;
        }
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
      <div class="banner">Tap anywhere to drop a pin</div>
      <script>
        const map = L.map('map').setView([${latitude}, ${longitude}], 16);
        L.tileLayer('${tileUrl}', {
          attribution: '${tileAttribution}',
          maxZoom: 19
        }).addTo(map);

        // User location marker
        const userIcon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjNENBRjUwIiBmaWxsLW9wYWNpdHk9IjAuMjUiIHN0cm9rZT0iIzRDQUY1MCIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0iIzRDQUY1MCIvPjwvc3ZnPg==',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([${latitude}, ${longitude}], { icon: userIcon, interactive: false }).addTo(map);

        // Task pin marker
        const pinIcon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMEM3LjE2NCAwIDAgNy4xNjQgMCAxNmMwIDEyIDE2IDMyIDE2IDMyUzMyIDI4IDMyIDE2QzMyIDcuMTY0IDI0LjgzNiAwIDE2IDBaIiBmaWxsPSIjRkY2QjZCIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==',
          iconSize: [32, 48],
          iconAnchor: [16, 48],
        });

        let marker = L.marker([${initPinLat}, ${initPinLng}], { icon: pinIcon }).addTo(map);

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
          document.querySelector('.banner').style.display = 'none';
        });

        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ${initPinLat}, lng: ${initPinLng} }));
      </script>
    </body>
    </html>
  `;
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#333' : '#ddd';
  const textColor = isDark ? '#fff' : '#000';
  const placeholderColor = isDark ? '#666' : '#aaa';
  const chipBg = isDark ? '#2a2a2a' : '#f0f0f0';

  const { data: tasks, loading, refetch: refetchTasks } = useApi(() =>
    taskService.getTasks()
  );
  const { data: categoriesData, refetch: refetchCategories } = useApi(() =>
    categoryService.getCategories()
  );

  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : [];

  const { mutate: createTask } = useMutation(
    (data: CreateTaskInput) => taskService.createTask(data)
  );

  const { mutate: updateTask } = useMutation(
    (data: { id: string; updates: UpdateTaskInput }) =>
      taskService.updateTask(data.id, data.updates)
  );

  const { mutate: deleteTask } = useMutation(
    (id: string) => taskService.deleteTask(id)
  );

  const { mutate: completeTask } = useMutation(
    ({ id, lat, lng }: { id: string; lat: number; lng: number }) => taskService.completeTask(id, lat, lng)
  );

  const { mutate: uncompleteTask } = useMutation(
    (id: string) => taskService.uncompleteTask(id)
  );

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [popupTaskId, setPopupTaskId] = useState<string | null>(null);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskInputRef = useRef<TextInput>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'completed'>('all');
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('task_view_layout').then((val) => {
        setViewLayout(val === 'grid' ? 'grid' : 'list');
      });
    }, [])
  );

  useEffect(() => {
    if (!popupTaskId) return;
    subtaskService.getSubtasks(popupTaskId).then(({ data }) => {
      if (data && Array.isArray(data)) {
        setSubtasksMap((prev) => ({ ...prev, [popupTaskId]: data }));
      }
    });
  }, [popupTaskId]);

  const handleAddSubtask = async (taskId: string) => {
    if (!newSubtaskInput.trim() || addingSubtask) return;
    setAddingSubtask(true);
    const { error } = await subtaskService.createSubtask(taskId, { title: newSubtaskInput.trim() });
    setAddingSubtask(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setNewSubtaskInput('');
    const { data } = await subtaskService.getSubtasks(taskId);
    if (data && Array.isArray(data)) setSubtasksMap((prev) => ({ ...prev, [taskId]: data }));
    setTimeout(() => subtaskInputRef.current?.focus(), 100);
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    const { error } = await subtaskService.deleteSubtask(subtaskId);
    if (error) { Alert.alert('Error', error.message); return; }
    const { data } = await subtaskService.getSubtasks(taskId);
    if (data && Array.isArray(data)) setSubtasksMap((prev) => ({ ...prev, [taskId]: data }));
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    const { error } = completed
      ? await subtaskService.uncompleteSubtask(subtaskId)
      : await subtaskService.completeSubtask(subtaskId);
    if (error) { Alert.alert('Error', error.message); return; }
    const { data } = await subtaskService.getSubtasks(taskId);
    if (data && Array.isArray(data)) setSubtasksMap((prev) => ({ ...prev, [taskId]: data }));
  };

  const [modalInput, setModalInput] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPriority, setModalPriority] = useState<Priority>('medium');
  const [modalCategoryId, setModalCategoryId] = useState<string | null>(null);
  const [modalDueDate, setModalDueDate] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const pickedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [mapPickerHtml, setMapPickerHtml] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [tooFarDistance, setTooFarDistance] = useState<number | null>(null);
  const [showTaskComplete, setShowTaskComplete] = useState(false);
  const [showTaskSaved, setShowTaskSaved] = useState<'created' | 'updated' | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setModalInput(task.title);
      setModalDescription(task.description || '');
      setModalPriority((task.priority as Priority) || 'medium');
      setModalCategoryId((task as any).category_id || null);
      setModalDueDate(task.dueDate || '');
      setPickedLocation(
        task.latitude != null && task.longitude != null
          ? { lat: task.latitude, lng: task.longitude }
          : null
      );
    } else {
      setEditingTask(null);
      setModalInput('');
      setModalDescription('');
      setModalPriority('medium');
      setModalCategoryId(null);
      setModalDueDate('');
      setPickedLocation(null);
    }
    setShowModal(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await categoryService.createCategory({ name: newCategoryName.trim() });
    if (error) { Alert.alert('Error', error.message); return; }
    setNewCategoryName('');
    if (data) setModalCategoryId((data as any).id);
    refetchCategories();
  };

  const handleSaveTask = async () => {
    if (!modalInput.trim()) {
      Alert.alert('Error', 'Task title cannot be empty');
      return;
    }

    if (!editingTask && !pickedLocation) {
      Alert.alert('Error', 'Please drop a pin on the map for this task');
      return;
    }

    if (editingTask) {
      const { error } = await updateTask({
        id: editingTask.id,
        updates: {
          title: modalInput.trim(),
          description: modalDescription.trim(),
          priority: modalPriority,
          dueDate: modalDueDate || undefined,
          ...(modalCategoryId ? { category_id: modalCategoryId } : {}),
          ...(pickedLocation ? { latitude: pickedLocation.lat, longitude: pickedLocation.lng } : {}),
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setShowModal(false);
      setShowTaskSaved('updated');
    } else {
      const { error } = await createTask({
        title: modalInput.trim(),
        description: modalDescription.trim() || undefined,
        priority: modalPriority,
        dueDate: modalDueDate || undefined,
        latitude: pickedLocation!.lat,
        longitude: pickedLocation!.lng,
        ...(modalCategoryId ? { category_id: modalCategoryId } : {}),
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setShowModal(false);
      setShowTaskSaved('created');
    }

    refetchTasks();
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    if (completed) {
      const { error } = await uncompleteTask(id);
      if (error) { Alert.alert('Error', error.message); return; }
      refetchTasks();
      return;
    }

    const task = (Array.isArray(tasks) ? tasks : []).find((t) => t.id === id);
    if (task?.latitude != null && task?.longitude != null) {
      setCompletingTaskId(id);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Error', 'Location permission is required to complete tasks');
          setCompletingTaskId(null);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const distance = haversineDistance(
          loc.coords.latitude, loc.coords.longitude,
          task.latitude!, task.longitude!
        );
        if (distance > 50) {
          setTooFarDistance(Math.round(distance));
          setCompletingTaskId(null);
          return;
        }
        const { error } = await completeTask({ id, lat: loc.coords.latitude, lng: loc.coords.longitude });
        if (error) { Alert.alert('Error', error.message); setCompletingTaskId(null); return; }
      } catch {
        Alert.alert('Error', 'Failed to get your location');
        setCompletingTaskId(null);
        return;
      }
      setCompletingTaskId(null);
    } else {
      const { error } = await completeTask({ id, lat: 0, lng: 0 });
      if (error) { Alert.alert('Error', error.message); return; }
    }
    setShowTaskComplete(true);
    refetchTasks();
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirmTaskId(id);
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmTaskId) return;
    const { error } = await deleteTask(deleteConfirmTaskId);
    setDeleteConfirmTaskId(null);
    if (error) { Alert.alert('Error', error.message); return; }
    refetchTasks();
  };

  const getFilteredAndSortedTasks = () => {
    if (!tasks || !Array.isArray(tasks)) return [];

    let filtered = [...tasks];

    if (filterBy === 'active') {
      filtered = filtered.filter((t) => !t.completed);
    } else if (filterBy === 'completed') {
      filtered = filtered.filter((t) => t.completed);
    }

    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort(
        (a, b) =>
          priorityOrder[(a.priority as Priority) || 'medium'] -
          priorityOrder[(b.priority as Priority) || 'medium']
      );
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    } else {
      filtered.sort((a, b) => {
        const parseDate = (d?: string | null) => d ? new Date(d.includes('T') ? d : d + 'T00:00:00').getTime() : 0;
        return parseDate(a.dueDate) - parseDate(b.dueDate);
      });
    }

    return filtered;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa500';
      case 'low': return '#4CAF50';
      default: return '#888';
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${date} ${h12}:${minutes} ${ampm}`;
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      const combined = new Date(tempDate);
      combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const yyyy = combined.getFullYear();
      const mm = String(combined.getMonth() + 1).padStart(2, '0');
      const dd = String(combined.getDate()).padStart(2, '0');
      const hh = String(combined.getHours()).padStart(2, '0');
      const min = String(combined.getMinutes()).padStart(2, '0');
      setModalDueDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    }
  };

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    const d = new Date(dueDate.includes('T') ? dueDate : dueDate + 'T23:59:59');
    return d < new Date();
  };

  const filteredTasks = getFilteredAndSortedTasks();
  const taskList = Array.isArray(tasks) ? tasks : [];
  const completedCount = taskList.filter((t) => t.completed).length;
  const totalCount = taskList.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading tasks...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Filter Counters */}
      <ThemedView style={styles.counterRow}>
        {([
          { key: 'all' as const, label: 'All', count: totalCount, icon: 'list' as const },
          { key: 'active' as const, label: 'Active', count: totalCount - completedCount, icon: 'radio-button-on' as const },
          { key: 'completed' as const, label: 'Completed', count: completedCount, icon: 'checkmark-done' as const },
        ]).map(({ key, label, count, icon }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.counterCard,
              { borderColor },
              filterBy === key && styles.counterCardActive,
            ]}
            onPress={() => setFilterBy(key)}
          >
            <View style={styles.counterIconRow}>
              <Ionicons
                name={icon}
                size={16}
                color={filterBy === key ? '#fff' : '#888'}
              />
              <ThemedText style={[styles.counterLabel, filterBy === key && styles.counterTextActive]}>
                {label}
              </ThemedText>
            </View>
            <ThemedText style={[styles.counterCount, filterBy === key && styles.counterTextActive]}>
              {count}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <ThemedView style={[styles.progressBarBg, { backgroundColor: chipBg }]}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </ThemedView>
      )}

      {/* Sort Controls */}
      <ThemedView style={styles.controlsContainer}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['date', 'priority', 'category'] as const).map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.chipButton,
                { borderColor },
                sortBy === sort && styles.chipButtonActive,
              ]}
              onPress={() => setSortBy(sort)}
            >
              <Ionicons
                name={sort === 'date' ? 'calendar-outline' : sort === 'priority' ? 'flag-outline' : 'folder-outline'}
                size={14}
                color={sortBy === sort ? '#fff' : '#888'}
              />
              <ThemedText
                style={[
                  styles.chipButtonText,
                  sortBy === sort && styles.chipButtonTextActive,
                ]}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>

      {/* Tasks List */}
      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: 80 }, viewLayout === 'grid' && styles.gridContainer]}>
        {filteredTasks.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={64}
              color={isDark ? '#444' : '#ccc'}
            />
            <ThemedText style={styles.emptyText}>
              {filterBy === 'completed' ? 'No completed tasks yet' : 'No tasks yet'}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap + to create your first task
            </ThemedText>
          </ThemedView>
        ) : viewLayout === 'grid' ? (
          filteredTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.gridCard,
                { borderColor, backgroundColor: isDark ? '#1e2022' : '#fff' },
                task.completed && styles.taskCardCompleted,
                isOverdue(task.dueDate) && !task.completed && styles.taskCardOverdue,
              ]}
              activeOpacity={0.7}
              onPress={() => { setNewSubtaskInput(''); setShowSubtaskInput(false); setPopupTaskId(task.id); }}
            >
              <View style={styles.gridCardTop}>
                <TouchableOpacity
                  onPress={() => handleToggleTask(task.id, task.completed)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={task.completed ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={task.completed ? '#4CAF50' : '#888'}
                  />
                </TouchableOpacity>
                <View style={[styles.gridPriorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
              </View>
              <ThemedText
                style={[styles.gridCardTitle, task.completed && styles.completedTaskText]}
                numberOfLines={2}
              >
                {task.title}
              </ThemedText>
              {task.dueDate && (
                <ThemedText
                  style={[
                    styles.gridCardDate,
                    isOverdue(task.dueDate) && !task.completed && { color: '#ff6b6b' },
                  ]}
                  numberOfLines={1}
                >
                  {formatDateDisplay(task.dueDate!)}
                </ThemedText>
              )}
              <View style={styles.gridCardIcons}>
                {task.latitude != null && (
                  <Ionicons name="location" size={12} color="#e91e63" />
                )}
                {(task as any).category_id && (
                  <Ionicons name="pricetag" size={12} color="#1976d2" />
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          filteredTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                { borderColor },
                task.completed && styles.taskCardCompleted,
                isOverdue(task.dueDate) && !task.completed && styles.taskCardOverdue,
              ]}
              activeOpacity={0.7}
              onPress={() => { setNewSubtaskInput(''); setShowSubtaskInput(false); setPopupTaskId(task.id); }}
            >
              {completingTaskId === task.id ? (
                <View style={styles.checkbox}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleTask(task.id, task.completed)}
                >
                  <Ionicons
                    name={task.completed ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={task.completed ? '#4CAF50' : '#888'}
                  />
                </TouchableOpacity>
              )}

              <ThemedView style={styles.taskMainContent}>
                <ThemedText
                  style={[
                    styles.taskTitle,
                    task.completed && styles.completedTaskText,
                  ]}
                >
                  {task.title}
                </ThemedText>
                {task.description ? (
                  <ThemedText style={styles.taskDescription} numberOfLines={2}>
                    {task.description}
                  </ThemedText>
                ) : null}
                <ThemedView style={styles.taskMetaRow}>
                  {task.dueDate && (
                    <ThemedView style={[styles.metaTag, { backgroundColor: chipBg }]}>
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={isOverdue(task.dueDate) && !task.completed ? '#ff6b6b' : '#888'}
                      />
                      <ThemedText
                        style={[
                          styles.metaTagText,
                          isOverdue(task.dueDate) && !task.completed && { color: '#ff6b6b', fontWeight: '700' },
                        ]}
                      >
                        {formatDateDisplay(task.dueDate!)}
                      </ThemedText>
                    </ThemedView>
                  )}
                  <ThemedView
                    style={[
                      styles.priorityTag,
                      { borderColor: getPriorityColor(task.priority), backgroundColor: getPriorityColor(task.priority) + '18' },
                    ]}
                  >
                    <ThemedText
                      style={[styles.priorityTagText, { color: getPriorityColor(task.priority) }]}
                    >
                      {(task.priority as string)?.charAt(0).toUpperCase() + ((task.priority as string)?.slice(1) || '')}
                    </ThemedText>
                  </ThemedView>
                  {(task as any).category_id && (
                    <ThemedView style={[styles.metaTag, { backgroundColor: isDark ? '#1a2a3a' : '#e3f2fd' }]}>
                      <ThemedText style={[styles.metaTagText, { color: '#1976d2' }]}>
                        {categories.find((c) => c.id === (task as any).category_id)?.name ?? ''}
                      </ThemedText>
                    </ThemedView>
                  )}
                  {task.latitude != null && task.longitude != null && (
                    <ThemedView style={[styles.metaTag, { backgroundColor: isDark ? '#2a1a2a' : '#fce4ec' }]}>
                      <Ionicons name="location" size={12} color="#e91e63" />
                      <ThemedText style={[styles.metaTagText, { color: '#e91e63' }]}>
                        Pin
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
              </ThemedView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Task Modal */}
      <Modal visible={showModal} animationType="slide">
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={26} color="#888" />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>{editingTask ? 'Edit Task' : 'New Task'}</ThemedText>
            <TouchableOpacity onPress={handleSaveTask}>
              <ThemedText style={styles.modalSaveText}>
                {editingTask ? 'Save' : 'Create'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <ThemedText style={styles.label}>Title</ThemedText>
            <ThemedView style={[styles.inputContainer, { borderColor }]}>
              <Ionicons name="document-text-outline" size={20} color="#888" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Task title"
                placeholderTextColor={placeholderColor}
                value={modalInput}
                onChangeText={setModalInput}
              />
            </ThemedView>

            {/* Description */}
            <ThemedText style={styles.label}>Description</ThemedText>
            <ThemedView style={[styles.inputContainer, styles.inputContainerMultiline, { borderColor }]}>
              <Ionicons name="text-outline" size={20} color="#888" style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: textColor, minHeight: 60 }]}
                placeholder="Add details..."
                placeholderTextColor={placeholderColor}
                value={modalDescription}
                onChangeText={setModalDescription}
                multiline
              />
            </ThemedView>

            {/* Due Date & Time */}
            <ThemedText style={styles.label}>Due Date & Time</ThemedText>
            <TouchableOpacity
              style={[styles.inputContainer, { borderColor }]}
              onPress={() => {
                if (modalDueDate) {
                  setTempDate(new Date(modalDueDate.includes('T') ? modalDueDate : modalDueDate + 'T00:00:00'));
                } else {
                  setTempDate(new Date());
                }
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#888" />
              <ThemedText style={[styles.input, { color: modalDueDate ? textColor : placeholderColor }]}>
                {modalDueDate ? formatDateDisplay(modalDueDate) : 'MM/DD/YYYY HH:MM AM'}
              </ThemedText>
              {modalDueDate ? (
                <TouchableOpacity onPress={() => setModalDueDate('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor="#4CAF50"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDoneButton}
                    onPress={() => {
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                  >
                    <ThemedText style={{ color: '#4CAF50', fontWeight: '700', fontSize: 16 }}>Next: Pick Time</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {showTimePicker && (
              <View>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor="#4CAF50"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDoneButton}
                    onPress={() => {
                      const yyyy = tempDate.getFullYear();
                      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(tempDate.getDate()).padStart(2, '0');
                      const hh = String(tempDate.getHours()).padStart(2, '0');
                      const min = String(tempDate.getMinutes()).padStart(2, '0');
                      setModalDueDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                      setShowTimePicker(false);
                    }}
                  >
                    <ThemedText style={{ color: '#4CAF50', fontWeight: '700', fontSize: 16 }}>Done</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Priority */}
            <ThemedText style={styles.label}>Priority</ThemedText>
            <ThemedView style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    {
                      borderColor: getPriorityColor(p),
                      backgroundColor: modalPriority === p ? getPriorityColor(p) : 'transparent',
                    },
                  ]}
                  onPress={() => setModalPriority(p)}
                >
                  <ThemedText
                    style={{
                      fontWeight: '600',
                      fontSize: 13,
                      color: modalPriority === p ? '#fff' : getPriorityColor(p),
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>

            {/* Category */}
            <ThemedText style={styles.label}>Category</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.chipButton, { borderColor }, !modalCategoryId && styles.chipButtonActive]}
                onPress={() => setModalCategoryId(null)}
              >
                <ThemedText style={[styles.chipButtonText, !modalCategoryId && styles.chipButtonTextActive]}>
                  None
                </ThemedText>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chipButton, { borderColor }, modalCategoryId === cat.id && styles.chipButtonActive]}
                  onPress={() => setModalCategoryId(cat.id)}
                >
                  <ThemedText style={[styles.chipButtonText, modalCategoryId === cat.id && styles.chipButtonTextActive]}>
                    {cat.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedView style={[styles.inputContainer, { borderColor, marginBottom: 20 }]}>
              <Ionicons name="pricetag-outline" size={20} color="#888" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="New category name..."
                placeholderTextColor={placeholderColor}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity onPress={handleCreateCategory}>
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </ThemedView>

            {/* Location Pin */}
            <ThemedText style={styles.label}>Location Pin</ThemedText>
            <TouchableOpacity
              style={[
                styles.locationPickerButton,
                { borderColor: pickedLocation ? '#4CAF50' : borderColor },
              ]}
              onPress={() => {
                pickedLocationRef.current = pickedLocation;
                setMapPickerHtml(generatePickerMapHTML(
                  userLocation.lat,
                  userLocation.lng,
                  isDark,
                  pickedLocation?.lat,
                  pickedLocation?.lng
                ));
                setShowMapPicker(true);
              }}
            >
              <Ionicons
                name={pickedLocation ? 'location' : 'location-outline'}
                size={20}
                color={pickedLocation ? '#4CAF50' : '#888'}
              />
              <ThemedText style={{ flex: 1, fontSize: 14, color: pickedLocation ? textColor : placeholderColor }}>
                {pickedLocation
                  ? `${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}`
                  : 'Tap to drop a pin on the map'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveTask}>
              <Ionicons name={editingTask ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
              <ThemedText style={styles.saveButtonText}>
                {editingTask ? 'Save Changes' : 'Create Task'}
              </ThemedText>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <ThemedView style={{ flex: 1 }}>
          <ThemedView style={styles.mapPickerHeader}>
            <TouchableOpacity onPress={() => {
              pickedLocationRef.current = null;
              setShowMapPicker(false);
            }}>
              <ThemedText style={{ fontSize: 16, color: '#888' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>Drop a Pin</ThemedText>
            <TouchableOpacity onPress={() => {
              if (pickedLocationRef.current) {
                setPickedLocation(pickedLocationRef.current);
              }
              setShowMapPicker(false);
            }}>
              <ThemedText style={{ fontSize: 16, color: '#4CAF50', fontWeight: '700' }}>Done</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <WebView
            source={{ html: mapPickerHtml }}
            style={{ flex: 1 }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (typeof data.lat === 'number' && typeof data.lng === 'number') {
                  pickedLocationRef.current = { lat: data.lat, lng: data.lng };
                }
              } catch {}
            }}
          />
        </ThemedView>
      </Modal>

      {/* Task Action Popup */}
      <Modal visible={popupTaskId !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.tooFarOverlay} activeOpacity={1} onPress={() => setPopupTaskId(null)}>
          {(() => {
            const task = taskList.find((t) => t.id === popupTaskId);
            if (!task) return null;
            const subtasks = subtasksMap[task.id] || [];
            return (
              <ThemedView style={[styles.popupCard, { borderColor }]} onStartShouldSetResponder={() => true}>
                <TouchableOpacity style={styles.popupCloseX} onPress={() => setPopupTaskId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
                  {/* Header */}
                  <View style={styles.popupHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.popupTitle} numberOfLines={2}>{task.title}</ThemedText>
                      {task.description ? (
                        <ThemedText style={styles.popupDescription}>{task.description}</ThemedText>
                      ) : null}
                    </View>
                  </View>

                  {/* Meta info */}
                  <View style={styles.popupMetaRow}>
                    {task.dueDate && (
                      <View style={[styles.metaTag, { backgroundColor: chipBg }]}>
                        <Ionicons name="calendar-outline" size={12} color={isOverdue(task.dueDate) && !task.completed ? '#ff6b6b' : '#888'} />
                        <ThemedText style={[styles.metaTagText, isOverdue(task.dueDate) && !task.completed && { color: '#ff6b6b', fontWeight: '700' }]}>
                          {formatDateDisplay(task.dueDate!)}
                        </ThemedText>
                      </View>
                    )}
                    {task.latitude != null && (
                      <View style={[styles.metaTag, { backgroundColor: isDark ? '#2a1a2a' : '#fce4ec' }]}>
                        <Ionicons name="location" size={12} color="#e91e63" />
                        <ThemedText style={[styles.metaTagText, { color: '#e91e63' }]}>Pin</ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Subtasks */}
                  <View style={styles.popupSection}>
                    <View style={styles.subtaskHeaderRow}>
                      <ThemedText style={styles.popupSectionTitle}>Subtasks</ThemedText>
                      {subtasks.length > 0 && (
                        <View style={[styles.subtaskCountPill, { backgroundColor: chipBg }]}>
                          <ThemedText style={styles.subtaskCountText}>
                            {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    {subtasks.length > 0 && (
                      <View style={[styles.subtaskProgressBar, { backgroundColor: chipBg }]}>
                        <View
                          style={[
                            styles.subtaskProgressFill,
                            { width: `${(subtasks.filter((s) => s.completed).length / subtasks.length) * 100}%` },
                          ]}
                        />
                      </View>
                    )}

                    {subtasks.length === 0 && !showSubtaskInput && (
                      <View style={styles.subtaskEmptyState}>
                        <Ionicons name="list-outline" size={28} color={isDark ? '#444' : '#ccc'} />
                        <ThemedText style={styles.subtaskEmptyText}>Break it down into steps</ThemedText>
                      </View>
                    )}

                    {subtasks.map((subtask) => (
                      <View key={subtask.id} style={[styles.subtaskItem, { backgroundColor: chipBg }]}>
                        <TouchableOpacity
                          style={styles.subtaskCheckArea}
                          onPress={() => handleToggleSubtask(task.id, subtask.id, subtask.completed)}
                        >
                          <Ionicons
                            name={subtask.completed ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={subtask.completed ? '#4CAF50' : '#888'}
                          />
                          <ThemedText style={[styles.subtaskText, subtask.completed && styles.completedTaskText]}>
                            {subtask.title}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSubtask(task.id, subtask.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={16} color="#888" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {showSubtaskInput ? (
                      <View style={[styles.addSubtaskInputRow, { borderColor: '#4CAF50' }]}>
                        <TextInput
                          ref={subtaskInputRef}
                          style={[styles.subtaskInput, { color: textColor }]}
                          placeholder="What needs to be done?"
                          placeholderTextColor={placeholderColor}
                          value={newSubtaskInput}
                          onChangeText={setNewSubtaskInput}
                          onSubmitEditing={() => handleAddSubtask(task.id)}
                          onBlur={() => { if (!newSubtaskInput.trim()) { setShowSubtaskInput(false); } }}
                          returnKeyType="done"
                          autoFocus
                          editable={!addingSubtask}
                        />
                        {addingSubtask ? (
                          <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleAddSubtask(task.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color={newSubtaskInput.trim() ? '#4CAF50' : '#ccc'}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addSubtaskButton}
                        onPress={() => setShowSubtaskInput(true)}
                      >
                        <Ionicons name="add" size={18} color="#4CAF50" />
                        <ThemedText style={styles.addSubtaskButtonText}>Add subtask</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.popupActions}>
                    <TouchableOpacity
                      style={[styles.popupActionButton, { backgroundColor: 'rgba(76,175,80,0.1)' }]}
                      onPress={() => {
                        setPopupTaskId(null);
                        handleOpenModal(task);
                      }}
                    >
                      <Ionicons name="create-outline" size={22} color="#4CAF50" />
                      <ThemedText style={[styles.popupActionText, { color: '#4CAF50' }]}>Edit</ThemedText>
                    </TouchableOpacity>

                    {task.latitude != null && task.longitude != null && (
                      <TouchableOpacity
                        style={[styles.popupActionButton, { backgroundColor: 'rgba(0,122,255,0.1)' }]}
                        onPress={() => {
                          setPopupTaskId(null);
                          router.navigate({
                            pathname: '/(tabs)/explore',
                            params: { taskLat: task.latitude, taskLng: task.longitude, taskTitle: task.title },
                          });
                        }}
                      >
                        <Ionicons name="map-outline" size={22} color="#007AFF" />
                        <ThemedText style={[styles.popupActionText, { color: '#007AFF' }]}>View</ThemedText>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.popupActionButton, { backgroundColor: 'rgba(255,107,107,0.1)' }]}
                      onPress={() => {
                        setPopupTaskId(null);
                        handleDeleteTask(task.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
                      <ThemedText style={[styles.popupActionText, { color: '#ff6b6b' }]}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </ThemedView>
            );
          })()}
        </TouchableOpacity>
      </Modal>

      {/* Too Far Away Popup */}
      <Modal visible={tooFarDistance !== null} transparent animationType="fade">
        <View style={styles.tooFarOverlay}>
          <ThemedView style={[styles.tooFarCard, { borderColor }]}>
            <View style={styles.tooFarIconRow}>
              <View style={styles.tooFarIconCircle}>
                <Ionicons name="location-outline" size={32} color="#ff6b6b" />
              </View>
            </View>
            <ThemedText style={styles.tooFarTitle}>Too far away</ThemedText>
            <ThemedText style={styles.tooFarBody}>
              You need to be within <ThemedText style={styles.tooFarBold}>50 meters</ThemedText> of the task location to complete it.
            </ThemedText>
            <View style={styles.tooFarDistancePill}>
              <Ionicons name="navigate-outline" size={16} color="#ff6b6b" />
              <ThemedText style={styles.tooFarDistanceText}>
                You are {tooFarDistance}m away
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.tooFarButton}
              onPress={() => setTooFarDistance(null)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.tooFarButtonText}>Got it</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Task Completed Popup */}
      <Modal visible={showTaskComplete} transparent animationType="fade">
        <View style={styles.tooFarOverlay}>
          <ThemedView style={[styles.tooFarCard, { borderColor }]}>
            <View style={styles.tooFarIconRow}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={36} color="#4CAF50" />
              </View>
            </View>
            <ThemedText style={styles.tooFarTitle}>Task completed!</ThemedText>
            <ThemedText style={styles.tooFarBody}>
              Great job! You've successfully completed this task.
            </ThemedText>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowTaskComplete(false)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.tooFarButtonText}>Awesome</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Task Saved Popup */}
      <Modal visible={showTaskSaved !== null} transparent animationType="fade">
        <View style={styles.tooFarOverlay}>
          <ThemedView style={[styles.tooFarCard, { borderColor }]}>
            <View style={styles.tooFarIconRow}>
              <View style={styles.successIconCircle}>
                <Ionicons
                  name={showTaskSaved === 'created' ? 'add-circle' : 'create'}
                  size={36}
                  color="#4CAF50"
                />
              </View>
            </View>
            <ThemedText style={styles.tooFarTitle}>
              {showTaskSaved === 'created' ? 'Task created!' : 'Task updated!'}
            </ThemedText>
            <ThemedText style={styles.tooFarBody}>
              {showTaskSaved === 'created'
                ? 'Your new task has been added successfully.'
                : 'Your changes have been saved successfully.'}
            </ThemedText>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowTaskSaved(null)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.tooFarButtonText}>Got it</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Delete Confirmation Popup */}
      <Modal visible={deleteConfirmTaskId !== null} transparent animationType="fade">
        <View style={styles.tooFarOverlay}>
          <ThemedView style={[styles.tooFarCard, { borderColor }]}>
            <View style={styles.tooFarIconRow}>
              <View style={styles.tooFarIconCircle}>
                <Ionicons name="trash-outline" size={32} color="#ff6b6b" />
              </View>
            </View>
            <ThemedText style={styles.tooFarTitle}>Delete task?</ThemedText>
            <ThemedText style={styles.tooFarBody}>
              This action cannot be undone. Are you sure you want to delete this task?
            </ThemedText>
            <TouchableOpacity
              style={styles.tooFarButton}
              onPress={confirmDeleteTask}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.tooFarButtonText}>Delete</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setDeleteConfirmTaskId(null)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  counterCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterCardActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  counterCount: {
    fontSize: 22,
    fontWeight: '700',
  },
  counterIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  counterLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  counterTextActive: {
    color: '#fff',
    opacity: 1,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  controlsContainer: {
    marginBottom: 12,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  chipButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipButtonTextActive: {
    color: '#fff',
  },
  taskList: {
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.5,
  },
  emptySubtext: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.4,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  taskCardCompleted: {
    opacity: 0.5,
  },
  taskCardOverdue: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  taskMainContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDescription: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  popupCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  popupDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  popupMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  popupSection: {
    marginBottom: 16,
  },
  popupSectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  popupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  popupActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  popupActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  popupCloseX: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  subtaskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subtaskCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subtaskCountText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
  },
  subtaskProgressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  subtaskProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  subtaskEmptyState: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  subtaskEmptyText: {
    fontSize: 13,
    opacity: 0.4,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  subtaskCheckArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
  },
  addSubtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginTop: 4,
  },
  subtaskInputActions: {
    flexDirection: 'row',
    gap: 4,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 14,
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  addSubtaskButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  datePickerDoneButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  locationPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 20,
  },
  mapPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tooFarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tooFarCard: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  tooFarIconRow: {
    marginBottom: 16,
  },
  tooFarIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,107,107,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooFarTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  tooFarBody: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  tooFarBold: {
    fontWeight: '700',
    opacity: 1,
  },
  tooFarDistancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  tooFarDistanceText: {
    color: '#ff6b6b',
    fontWeight: '700',
    fontSize: 15,
  },
  tooFarButton: {
    width: '100%',
    backgroundColor: '#ff6b6b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76,175,80,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  tooFarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 16,
    opacity: 0.6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  gridCard: {
    width: (Dimensions.get('window').width - 64) / 3,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  gridCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  gridCardDate: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
  },
  gridCardIcons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
});
