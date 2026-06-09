import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useApi, useMutation } from '@/src/hooks/useApi';
import { categoryService } from '@/src/services/categoryService';
import { subtaskService } from '@/src/services/subtaskService';
import { taskService } from '@/src/services/taskService';
import { Category, CreateTaskInput, Subtask, Task, UpdateTaskInput } from '@/src/types/api';

type Priority = 'low' | 'medium' | 'high';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

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
    (id: string) => taskService.completeTask(id)
  );

  const { mutate: uncompleteTask } = useMutation(
    (id: string) => taskService.uncompleteTask(id)
  );

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!expandedTaskId) return;
    subtaskService.getSubtasks(expandedTaskId).then(({ data }) => {
      if (data && Array.isArray(data)) {
        setSubtasksMap((prev) => ({ ...prev, [expandedTaskId]: data }));
      }
    });
  }, [expandedTaskId]);

  const handleAddSubtask = async (taskId: string) => {
    if (!newSubtaskInput.trim()) return;
    const { error } = await subtaskService.createSubtask(taskId, { title: newSubtaskInput.trim() });
    if (error) { Alert.alert('Error', error.message); return; }
    setNewSubtaskInput('');
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

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setModalInput(task.title);
      setModalDescription(task.description || '');
      setModalPriority((task.priority as Priority) || 'medium');
      setModalCategoryId((task as any).category_id || null);
      setModalDueDate(task.dueDate || '');
    } else {
      setEditingTask(null);
      setModalInput('');
      setModalDescription('');
      setModalPriority('medium');
      setModalCategoryId(null);
      setModalDueDate('');
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

    if (editingTask) {
      const { error } = await updateTask({
        id: editingTask.id,
        updates: {
          title: modalInput.trim(),
          description: modalDescription.trim(),
          priority: modalPriority,
          dueDate: modalDueDate || undefined,
          ...(modalCategoryId ? { category_id: modalCategoryId } : {}),
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      Alert.alert('Success', 'Task updated');
    } else {
      const { error } = await createTask({
        title: modalInput.trim(),
        description: modalDescription.trim(),
        priority: modalPriority,
        dueDate: modalDueDate || undefined,
        ...(modalCategoryId ? { category_id: modalCategoryId } : {}),
      } as any);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      Alert.alert('Success', 'Task created');
    }

    setShowModal(false);
    refetchTasks();
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    if (completed) {
      const { error } = await uncompleteTask(id);
      if (error) { Alert.alert('Error', error.message); return; }
    } else {
      const { error } = await completeTask(id);
      if (error) { Alert.alert('Error', error.message); return; }
    }
    refetchTasks();
  };

  const handleDeleteTask = async (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          const { error } = await deleteTask(id);
          if (error) { Alert.alert('Error', error.message); return; }
          refetchTasks();
        },
      },
    ]);
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
        const dateA = new Date(a.dueDate || 0).getTime();
        const dateB = new Date(b.dueDate || 0).getTime();
        return dateB - dateA;
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

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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
      {/* Stats */}
      <ThemedView style={styles.statsRow}>
        <ThemedText style={styles.statsText}>
          {completedCount} of {totalCount} completed
        </ThemedText>
        {totalCount > 0 && (
          <ThemedView style={[styles.progressBarBg, { backgroundColor: chipBg }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </ThemedView>
        )}
      </ThemedView>

      {/* Filter & Sort Controls */}
      <ThemedView style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.chipButton,
                { borderColor },
                filterBy === filter && styles.chipButtonActive,
              ]}
              onPress={() => setFilterBy(filter)}
            >
              <ThemedText
                style={[
                  styles.chipButtonText,
                  filterBy === filter && styles.chipButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
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
        ) : (
          filteredTasks.map((task) => (
            <View key={task.id}>
              <TouchableOpacity
                style={[
                  styles.taskCard,
                  { borderColor },
                  task.completed && styles.taskCardCompleted,
                  isOverdue(task.dueDate) && !task.completed && styles.taskCardOverdue,
                ]}
                activeOpacity={0.7}
                onPress={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              >
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
                          {task.dueDate}
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
                  </ThemedView>
                </ThemedView>

                <TouchableOpacity onPress={() => handleOpenModal(task)} style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Expanded Task Details */}
              {expandedTaskId === task.id && (
                <ThemedView style={[styles.expandedContent, { borderColor: '#4CAF50' }]}>
                  <ThemedText style={styles.subtaskTitle}>Subtasks</ThemedText>
                  {(subtasksMap[task.id] || []).map((subtask) => (
                    <TouchableOpacity
                      key={subtask.id}
                      style={[styles.subtaskItem, { backgroundColor: chipBg }]}
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
                  ))}
                  <ThemedView style={[styles.addSubtaskRow, { borderColor }]}>
                    <TextInput
                      style={[styles.subtaskInput, { color: textColor }]}
                      placeholder="Add subtask..."
                      placeholderTextColor={placeholderColor}
                      value={newSubtaskInput}
                      onChangeText={setNewSubtaskInput}
                    />
                    <TouchableOpacity onPress={() => handleAddSubtask(task.id)}>
                      <Ionicons name="add-circle" size={28} color="#4CAF50" />
                    </TouchableOpacity>
                  </ThemedView>

                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <ThemedText style={styles.deleteButtonText}>Delete Task</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="subtitle">{editingTask ? 'Edit Task' : 'New Task'}</ThemedText>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
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

              {/* Due Date */}
              <ThemedText style={styles.label}>Due Date (YYYY-MM-DD)</ThemedText>
              <ThemedView style={[styles.inputContainer, { borderColor }]}>
                <Ionicons name="calendar-outline" size={20} color="#888" />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="2024-12-25"
                  placeholderTextColor={placeholderColor}
                  value={modalDueDate}
                  onChangeText={setModalDueDate}
                />
              </ThemedView>

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

              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTask}>
                <Ionicons name={editingTask ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                <ThemedText style={styles.saveButtonText}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </ThemedText>
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
  statsRow: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
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
  editButton: {
    padding: 8,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: -4,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    gap: 10,
  },
  subtaskTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  modalScroll: {
    flex: 1,
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
});
