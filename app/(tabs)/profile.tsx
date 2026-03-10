import { useApi, useMutation } from '@/src/hooks/useApi'
import { useAuth } from '@/src/hooks/useAuth'
import { friendService } from '@/src/services/friendService'
import { profileService } from '@/src/services/profileService'
import { settingsService } from '@/src/services/settingsService'
import { UpdateProfileInput } from '@/src/types/api'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { data: profile, loading: profileLoading, refetch: refetchProfile } = useApi(() =>
    profileService.getProfile()
  )
  const { data: settings, loading: settingsLoading } = useApi(() =>
    settingsService.getSettings()
  )
  const { data: friends, loading: friendsLoading, refetch: refetchFriends } = useApi(() =>
    friendService.getFriends()
  )

  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<UpdateProfileInput>({
    name: profile?.name || '',
    bio: profile?.bio || '',
  })
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [friendUsername, setFriendUsername] = useState('')

  const { mutate: updateProfile, loading: updateLoading } = useMutation(
    (data: UpdateProfileInput) => profileService.updateProfile(data)
  )

  const { mutate: addFriend, loading: addingFriend } = useMutation(
    (username: string) => friendService.addFriend({ friend_username: username })
  )

  const handleUpdateProfile = async () => {
    const { error } = await updateProfile(editData)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    Alert.alert('Success', 'Profile updated')
    setEditMode(false)
    refetchProfile()
  }

  const handleAddFriend = async () => {
    if (!friendUsername.trim()) {
      Alert.alert('Error', 'Please enter a username')
      return
    }

    const { error } = await addFriend(friendUsername)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    Alert.alert('Success', 'Friend added!')
    setFriendUsername('')
    setShowAddFriend(false)
    refetchFriends()
  }

  const handleRemoveFriend = async (friendId: string) => {
    const { error } = await friendService.removeFriend(friendId)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    refetchFriends()
  }

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout()
          router.replace('/login')
        },
      },
    ])
  }

  if (profileLoading || settingsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.name}>{profile?.name || user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Profile Info */}
      {!editMode && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <TouchableOpacity
              onPress={() => {
                setEditData({
                  name: profile?.name || '',
                  bio: profile?.bio || '',
                })
                setEditMode(true)
              }}
            >
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bio</Text>
            <Text style={styles.infoValue}>
              {profile?.bio || 'No bio added'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {profile?.updated_at
                ? new Date(profile.updated_at).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      {/* Edit Mode */}
      {editMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(text) =>
                setEditData({ ...editData, name: text })
              }
              placeholder="Your name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={editData.bio || ''}
              onChangeText={(text) =>
                setEditData({ ...editData, bio: text })
              }
              placeholder="Tell us about yourself"
              multiline
            />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setEditMode(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleUpdateProfile}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextWhite}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Friends */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends ({friends?.length || 0})</Text>
          <TouchableOpacity onPress={() => setShowAddFriend(true)}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {friendsLoading ? (
          <ActivityIndicator color="#007AFF" />
        ) : friends && friends.length > 0 ? (
          friends.map((friend) => (
            <View key={friend.id} style={styles.friendItem}>
              <View>
                <Text style={styles.friendName}>{friend.friend_username}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveFriend(friend.id)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No friends yet</Text>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>
              {settings?.dark_mode ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Ionicons
            name={settings?.dark_mode ? 'moon' : 'sunny'}
            size={24}
            color="#007AFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              {settings?.notifications_enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Ionicons
            name={settings?.notifications_enabled ? 'notifications' : 'notifications-off'}
            size={24}
            color="#007AFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Private Profile</Text>
            <Text style={styles.settingDescription}>
              {settings?.private_profile ? 'Private' : 'Public'}
            </Text>
          </View>
          <Ionicons
            name={settings?.private_profile ? 'lock-closed' : 'lock-open'}
            size={24}
            color="#007AFF"
          />
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddFriend(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={friendUsername}
              onChangeText={setFriendUsername}
            />

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowAddFriend(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleAddFriend}
                disabled={addingFriend}
              >
                {addingFriend ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonTextWhite}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  editButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
  },
  formGroup: {
    marginBottom: 16,
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
    fontSize: 14,
    color: '#000',
    marginBottom: 16,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
});
