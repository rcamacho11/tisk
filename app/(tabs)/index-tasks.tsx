import { useApi } from '@/src/hooks/useApi'
import { taskService } from '@/src/services/taskService'
import { CreateTaskInput, Task } from '@/src/types/api'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'

export default function TasksScreen() {
  const { data: tasks, loading, error, refetch } = useApi(() => taskService.getTasks())
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'work',
  })

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title')
      return
    }

    const { error } = await taskService.createTask(newTask)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      category: 'work',
    })
    setShowAddModal(false)
    refetch()
  }

  const handleCompleteTask = async (id: string) => {
    const task = tasks?.find((t) => t.id === id)
    if (!task) return

    const { error } = await taskService.updateTask(id, {
      completed: !task.completed,
    })

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    refetch()
  }

  const handleDeleteTask = async (id: string) => {
    const { error } = await taskService.deleteTask(id)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    refetch()
  }

  const renderTaskItem = (task: Task) => (
    <View key={task.id} style={styles.taskItem}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleCompleteTask(task.id)}
      >
        {task.completed && (
          <Ionicons name="checkmark" size={20} color="#007AFF" />
        )}
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskTitle,
            task.completed && styles.completedTask,
          ]}
        >
          {task.title}
        </Text>
        {task.description && (
          <Text style={styles.taskDescription}>{task.description}</Text>
        )}
        <View style={styles.taskMeta}>
          <Text style={styles.priority}>{task.priority}</Text>
          <Text style={styles.category}>{task.category}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTask(task.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  )

  if (loading && !tasks) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}

      <FlatList
        data={tasks || []}
        renderItem={({ item }) => renderTaskItem(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first task
            </Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task title"
                value={newTask.title}
                onChangeText={(text) =>
                  setNewTask({ ...newTask, title: text })
                }
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Task description"
                value={newTask.description}
                onChangeText={(text) =>
                  setNewTask({ ...newTask, description: text })
                }
                multiline
              />

              <Text style={styles.label}>Priority</Text>
              <View style={styles.prioritySelector}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      newTask.priority === p &&
                        styles.priorityOptionSelected,
                    ]}
                    onPress={() =>
                      setNewTask({ ...newTask, priority: p })
                    }
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        newTask.priority === p &&
                          styles.priorityOptionTextSelected,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., work, personal"
                value={newTask.category}
                onChangeText={(text) =>
                  setNewTask({ ...newTask, category: text })
                }
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddTask}
            >
              <Text style={styles.submitButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  priority: {
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#666',
  },
  category: {
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#666',
  },
  deleteButton: {
    paddingLeft: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    padding: 12,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalForm: {
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    color: '#000',
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityOptionText: {
    color: '#000',
    fontWeight: '500',
  },
  priorityOptionTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
