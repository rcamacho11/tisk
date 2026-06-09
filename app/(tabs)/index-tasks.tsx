import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApi } from '@/src/hooks/useApi';
import { taskService } from '@/src/services/taskService';
import { CreateTaskInput, Task } from '@/src/types/api';

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#333' : '#ddd';
  const textColor = isDark ? '#fff' : '#000';
  const placeholderColor = isDark ? '#666' : '#aaa';
  const chipBg = isDark ? '#2a2a2a' : '#f0f0f0';

  const { data: tasks, loading, error, refetch } = useApi(() => taskService.getTasks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'work',
  });

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const { error } = await taskService.createTask(newTask);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      category: 'work',
    });
    setShowAddModal(false);
    refetch();
  };

  const handleCompleteTask = async (id: string) => {
    const task = tasks?.find((t) => t.id === id);
    if (!task) return;

    const { error } = await taskService.updateTask(id, {
      completed: !task.completed,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    refetch();
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await taskService.deleteTask(id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    refetch();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa500';
      case 'low': return '#4CAF50';
      default: return '#888';
    }
  };

  const renderTaskItem = ({ item: task }: { item: Task }) => (
    <ThemedView style={[styles.taskCard, { borderColor }]}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleCompleteTask(task.id)}
      >
        <Ionicons
          name={task.completed ? 'checkbox' : 'square-outline'}
          size={24}
          color={task.completed ? '#4CAF50' : '#888'}
        />
      </TouchableOpacity>

      <ThemedView style={styles.taskContent}>
        <ThemedText
          style={[
            styles.taskTitle,
            task.completed && styles.completedTask,
          ]}
        >
          {task.title}
        </ThemedText>
        {task.description ? (
          <ThemedText style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </ThemedText>
        ) : null}
        <ThemedView style={styles.taskMeta}>
          {task.priority && (
            <ThemedView
              style={[
                styles.metaTag,
                { backgroundColor: getPriorityColor(task.priority) + '18', borderColor: getPriorityColor(task.priority) },
              ]}
            >
              <ThemedText style={[styles.metaTagText, { color: getPriorityColor(task.priority) }]}>
                {task.priority}
              </ThemedText>
            </ThemedView>
          )}
          {task.category && (
            <ThemedView style={[styles.metaTag, { backgroundColor: chipBg }]}>
              <ThemedText style={styles.metaTagText}>{task.category}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTask(task.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading && !tasks) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading tasks...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>

      {error && (
        <ThemedView style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
          <ThemedText style={styles.errorText}>{error.message}</ThemedText>
        </ThemedView>
      )}

      <FlatList
        data={tasks || []}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={64}
              color={isDark ? '#444' : '#ccc'}
            />
            <ThemedText style={styles.emptyText}>No tasks yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap + to create your first task
            </ThemedText>
          </ThemedView>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="subtitle">New Task</ThemedText>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.label}>Title</ThemedText>
              <ThemedView style={[styles.inputContainer, { borderColor }]}>
                <Ionicons name="document-text-outline" size={20} color="#888" />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Enter task title"
                  placeholderTextColor={placeholderColor}
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({ ...newTask, title: text })}
                />
              </ThemedView>

              <ThemedText style={styles.label}>Description</ThemedText>
              <ThemedView style={[styles.inputContainer, styles.inputContainerMultiline, { borderColor }]}>
                <Ionicons name="text-outline" size={20} color="#888" style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: textColor, minHeight: 60 }]}
                  placeholder="Task description"
                  placeholderTextColor={placeholderColor}
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  multiline
                />
              </ThemedView>

              <ThemedText style={styles.label}>Priority</ThemedText>
              <ThemedView style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      {
                        borderColor: getPriorityColor(p),
                        backgroundColor: newTask.priority === p ? getPriorityColor(p) : 'transparent',
                      },
                    ]}
                    onPress={() => setNewTask({ ...newTask, priority: p })}
                  >
                    <ThemedText
                      style={{
                        fontWeight: '600',
                        fontSize: 13,
                        color: newTask.priority === p ? '#fff' : getPriorityColor(p),
                      }}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>

              <ThemedText style={styles.label}>Category</ThemedText>
              <ThemedView style={[styles.inputContainer, { borderColor }]}>
                <Ionicons name="folder-outline" size={20} color="#888" />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="e.g., work, personal"
                  placeholderTextColor={placeholderColor}
                  value={newTask.category}
                  onChangeText={(text) => setNewTask({ ...newTask, category: text })}
                />
              </ThemedView>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddTask}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <ThemedText style={styles.submitButtonText}>Add Task</ThemedText>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ff6b6b18',
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 80,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  metaTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metaTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    paddingLeft: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.5,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.4,
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
