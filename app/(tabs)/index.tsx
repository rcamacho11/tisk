import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTask, deleteTask, getTasks, updateTask } from '@/utils/api';

type Priority = 'low' | 'medium' | 'high';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  category: string;
  subtasks: Subtask[];
  createdAt: number;
}

const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Finance'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'completed'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPriority, setModalPriority] = useState<Priority>('medium');
  const [modalCategory, setModalCategory] = useState('Personal');
  const [modalDueDate, setModalDueDate] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const result = await getTasks();
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', 'Failed to load tasks');
      return;
    }

    if (result.data?.tasks) {
      setTasks(result.data.tasks);
    }
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setModalInput(task.title);
      setModalDescription(task.description);
      setModalPriority(task.priority);
      setModalCategory(task.category);
      setModalDueDate(task.dueDate || '');
    } else {
      setEditingTask(null);
      setModalInput('');
      setModalDescription('');
      setModalPriority('medium');
      setModalCategory('Personal');
      setModalDueDate('');
    }
    setSubtaskInput('');
    setShowModal(true);
  };

  const handleSaveTask = async () => {
    if (!modalInput.trim()) {
      Alert.alert('Error', 'Task title cannot be empty');
      return;
    }

    if (editingTask) {
      const result = await updateTask(editingTask.id, {
        title: modalInput.trim(),
        description: modalDescription.trim(),
        priority: modalPriority,
        category: modalCategory,
        dueDate: modalDueDate || null,
      });

      if (!result.success) {
        Alert.alert('Error', 'Failed to update task');
        return;
      }

      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: modalInput.trim(),
                description: modalDescription.trim(),
                priority: modalPriority,
                category: modalCategory,
                dueDate: modalDueDate || null,
              }
            : t
        )
      );
    } else {
      const result = await createTask({
        title: modalInput.trim(),
        description: modalDescription.trim(),
        priority: modalPriority,
        dueDate: modalDueDate || null,
        category: modalCategory,
      });

      if (!result.success) {
        Alert.alert('Error', 'Failed to create task');
        return;
      }

      const newTask: Task = {
        id: result.data?.id || Date.now().toString(),
        title: modalInput.trim(),
        description: modalDescription.trim(),
        completed: false,
        priority: modalPriority,
        dueDate: modalDueDate || null,
        category: modalCategory,
        subtasks: [],
        createdAt: Date.now(),
      };
      setTasks([newTask, ...tasks]);
    }
    setShowModal(false);
  };

  const addSubtask = (taskId: string) => {
    if (!subtaskInput.trim()) return;

    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                {
                  id: Date.now().toString(),
                  title: subtaskInput.trim(),
                  completed: false,
                },
              ],
            }
          : t
      )
    );
    setSubtaskInput('');
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : t
      )
    );
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.filter((st) => st.id !== subtaskId),
            }
          : t
      )
    );
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const result = await updateTask(id, {
      completed: !task.completed,
    });

    if (!result.success) {
      Alert.alert('Error', 'Failed to update task');
      return;
    }

    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const handleDeleteTask = async (id: string) => {
    const result = await deleteTask(id);

    if (!result.success) {
      Alert.alert('Error', 'Failed to delete task');
      return;
    }

    setTasks(tasks.filter((task) => task.id !== id));
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (filterBy === 'active') {
      filtered = filtered.filter((t) => !t.completed);
    } else if (filterBy === 'completed') {
      filtered = filtered.filter((t) => t.completed);
    }

    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      filtered.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
    }

    return filtered;
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffa500';
      case 'low':
        return '#4CAF50';
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeTasks = tasks.filter((t) => !t.completed);
  const filteredTasks = getFilteredTasks();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">My Tasks</ThemedText>
        <ThemedText style={styles.statsText}>
          {completedCount} of {tasks.length} completed
        </ThemedText>
      </ThemedView>

      {/* Quick Add Input */}
      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { color: colorScheme === 'dark' ? '#fff' : '#000' },
          ]}
          placeholder="Quick add task..."
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => {
            if (input.trim()) {
              const newTask: Task = {
                id: Date.now().toString(),
                title: input.trim(),
                description: '',
                completed: false,
                priority: 'medium',
                dueDate: null,
                category: 'Personal',
                subtasks: [],
                createdAt: Date.now(),
              };
              setTasks([newTask, ...tasks]);
              setInput('');
            }
          }}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </ThemedView>

      {/* Filter & Sort Buttons */}
      <ThemedView style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                filterBy === filter && styles.filterButtonActive,
              ]}
              onPress={() => setFilterBy(filter)}>
              <ThemedText
                style={[
                  styles.filterButtonText,
                  filterBy === filter && styles.filterButtonTextActive,
                ]}>
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
                styles.sortButton,
                sortBy === sort && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(sort)}>
              <Ionicons
                name={sortBy === sort ? 'filter' : 'filter-outline'}
                size={16}
                color={sortBy === sort ? '#fff' : '#888'}
              />
              <ThemedText
                style={[
                  styles.sortButtonText,
                  sortBy === sort && styles.sortButtonTextActive,
                ]}>
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>

      {/* Tasks List */}
      {loading ? (
        <ThemedView style={[styles.taskList, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </ThemedView>
      ) : (
        <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color={colorScheme === 'dark' ? '#666' : '#ccc'}
            />
            <ThemedText style={styles.emptyText}>
              {filterBy === 'completed'
                ? 'No completed tasks yet'
                : 'No tasks yet. Add one to get started!'}
            </ThemedText>
          </ThemedView>
        ) : (
          filteredTasks.map((task) => (
            <ThemedView key={task.id}>
              <TouchableOpacity
                style={[
                  styles.taskItem,
                  task.completed && styles.taskItemCompleted,
                  isOverdue(task.dueDate) &&
                    !task.completed &&
                    styles.taskItemOverdue,
                ]}
                onPress={() =>
                  setExpandedTaskId(
                    expandedTaskId === task.id ? null : task.id
                  )
                }>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleTask(task.id)}>
                  <Ionicons
                    name={task.completed ? 'checkbox' : 'checkbox-outline'}
                    size={24}
                    color={task.completed ? '#4CAF50' : '#888'}
                  />
                </TouchableOpacity>

                <ThemedView style={styles.taskMainContent}>
                  <ThemedText
                    style={[
                      styles.taskText,
                      task.completed && styles.completedTaskText,
                    ]}>
                    {task.title}
                  </ThemedText>
                  {task.description && (
                    <ThemedText style={styles.taskDescription}>
                      {task.description}
                    </ThemedText>
                  )}
                  <ThemedView style={styles.taskMetaContainer}>
                    {task.dueDate && (
                      <ThemedView style={styles.metaTag}>
                        <Ionicons
                          name="calendar"
                          size={12}
                          color={
                            isOverdue(task.dueDate) && !task.completed
                              ? '#ff6b6b'
                              : '#888'
                          }
                        />
                        <ThemedText
                          style={[
                            styles.metaText,
                            isOverdue(task.dueDate) &&
                              !task.completed &&
                              styles.overdueText,
                          ]}>
                          {task.dueDate}
                        </ThemedText>
                      </ThemedView>
                    )}
                    <ThemedView
                      style={[
                        styles.categoryTag,
                        { borderColor: getPriorityColor(task.priority) },
                      ]}>
                      <ThemedText
                        style={[
                          styles.categoryTagText,
                          { color: getPriorityColor(task.priority) },
                        ]}>
                        {task.priority.charAt(0).toUpperCase()}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.categoryBadge}>
                      <ThemedText style={styles.categoryBadgeText}>
                        {task.category}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>

                <TouchableOpacity
                  onPress={() => handleOpenModal(task)}
                  style={styles.editButton}>
                  <Ionicons name="pencil" size={18} color="#4CAF50" />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Expanded Task Details */}
              {expandedTaskId === task.id && (
                <ThemedView style={styles.expandedContent}>
                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <ThemedView style={styles.subtaskSection}>
                      <ThemedText style={styles.subtaskTitle}>
                        Subtasks ({task.subtasks.filter((s) => s.completed).length}/
                        {task.subtasks.length})
                      </ThemedText>
                      {task.subtasks.map((subtask) => (
                        <ThemedView key={subtask.id} style={styles.subtaskItem}>
                          <TouchableOpacity
                            onPress={() => toggleSubtask(task.id, subtask.id)}>
                            <Ionicons
                              name={
                                subtask.completed
                                  ? 'checkbox'
                                  : 'checkbox-outline'
                              }
                              size={20}
                              color={subtask.completed ? '#4CAF50' : '#888'}
                            />
                          </TouchableOpacity>
                          <ThemedText
                            style={[
                              styles.subtaskText,
                              subtask.completed && styles.completedTaskText,
                            ]}>
                            {subtask.title}
                          </ThemedText>
                          <TouchableOpacity
                            onPress={() =>
                              deleteSubtask(task.id, subtask.id)
                            }>
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#ff6b6b"
                            />
                          </TouchableOpacity>
                        </ThemedView>
                      ))}
                    </ThemedView>
                  )}

                  {/* Add Subtask */}
                  {!task.completed && (
                    <ThemedView style={styles.addSubtaskContainer}>
                      <TextInput
                        style={[
                          styles.subtaskInput,
                          {
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                          },
                        ]}
                        placeholder="Add subtask..."
                        placeholderTextColor={
                          colorScheme === 'dark' ? '#888' : '#ccc'
                        }
                        value={subtaskInput}
                        onChangeText={setSubtaskInput}
                      />
                      <TouchableOpacity
                        onPress={() => addSubtask(task.id)}
                        style={styles.addSubtaskBtn}>
                        <Ionicons name="add-circle" size={24} color="#4CAF50" />
                      </TouchableOpacity>
                    </ThemedView>
                  )}

                  {/* Delete Task */}
                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task.id)}
                    style={styles.deleteTaskButton}>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <ThemedText style={styles.deleteTaskButtonText}>
                      Delete Task
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}
            </ThemedView>
          ))
        )}
      </ScrollView>
      )}

      {/* Add/Edit Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="title">
                {editingTask ? 'Edit Task' : 'New Task'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#888" />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView style={styles.modalScroll}>
              {/* Title */}
              <ThemedText style={styles.modalLabel}>Title</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
                placeholder="Task title"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                value={modalInput}
                onChangeText={setModalInput}
              />

              {/* Description */}
              <ThemedText style={styles.modalLabel}>Description</ThemedText>
              <TextInput
                style={[
                  styles.modalInputMultiline,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
                placeholder="Add details..."
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                value={modalDescription}
                onChangeText={setModalDescription}
                multiline
              />

              {/* Due Date */}
              <ThemedText style={styles.modalLabel}>Due Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
                placeholder="2024-12-25"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                value={modalDueDate}
                onChangeText={setModalDueDate}
              />

              {/* Priority */}
              <ThemedText style={styles.modalLabel}>Priority</ThemedText>
              <ThemedView style={styles.priorityContainer}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      modalPriority === p && styles.priorityButtonActive,
                      {
                        borderColor: getPriorityColor(p),
                        backgroundColor:
                          modalPriority === p
                            ? getPriorityColor(p)
                            : 'transparent',
                      },
                    ]}
                    onPress={() => setModalPriority(p)}>
                    <ThemedText
                      style={[
                        styles.priorityButtonText,
                        modalPriority === p && styles.priorityButtonTextActive,
                        { color: getPriorityColor(p) },
                      ]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>

              {/* Category */}
              <ThemedText style={styles.modalLabel}>Category</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      modalCategory === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setModalCategory(cat)}>
                    <ThemedText
                      style={[
                        styles.categoryButtonText,
                        modalCategory === cat &&
                          styles.categoryButtonTextActive,
                      ]}>
                      {cat}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveTask}>
                <ThemedText style={styles.saveButtonText}>Save Task</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  taskList: {
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  taskItemCompleted: {
    opacity: 0.5,
  },
  taskItemOverdue: {
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
  taskText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDescription: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  taskMetaContainer: {
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
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  overdueText: {
    color: '#ff6b6b',
    fontWeight: '700',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e3f2fd',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1976d2',
  },
  editButton: {
    padding: 8,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderTopWidth: 0,
  },
  subtaskSection: {
    marginBottom: 16,
  },
  subtaskTitle: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
    gap: 8,
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  addSubtaskBtn: {
    padding: 4,
  },
  deleteTaskButton: {
    flexDirection: 'row',
    backgroundColor: '#ff6b6b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteTaskButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    paddingTop: 60,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    flex: 1,
  },
  modalLabel: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalInputMultiline: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonActive: {
    opacity: 0.8,
  },
  priorityButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
