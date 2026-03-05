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
import {
    addFriend,
    getFriends,
    getProfile,
    getSettings,
    removeFriend,
    updateProfile,
    updateSettings,
} from '@/utils/api';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline';
}

interface UserProfile {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  joinDate: string;
}

interface Settings {
  notifications: boolean;
  darkMode: boolean;
  privateProfile: boolean;
  showOnlineStatus: boolean;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    username: '@johndoe',
    email: 'john@example.com',
    bio: 'Task manager enthusiast',
    avatar: 'user',
    joinDate: 'Joined March 2024',
  });

  const [friends, setFriends] = useState<Friend[]>([]);

  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    darkMode: colorScheme === 'dark',
    privateProfile: false,
    showOnlineStatus: true,
  });

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editedName, setEditedName] = useState(profile.name);
  const [editedBio, setEditedBio] = useState(profile.bio);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const profileResult = await getProfile();
    if (profileResult.success && profileResult.data) {
      setProfile(profileResult.data);
      setEditedName(profileResult.data.name);
      setEditedBio(profileResult.data.bio);
    }

    const friendsResult = await getFriends();
    if (friendsResult.success && friendsResult.data) {
      setFriends(friendsResult.data);
    }

    const settingsResult = await getSettings();
    if (settingsResult.success && settingsResult.data) {
      setSettings(settingsResult.data);
    }

    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!friendInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    const result = await addFriend(friendInput);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to add friend');
      return;
    }

    if (result.data) {
      setFriends([...friends, result.data]);
    }
    setFriendInput('');
    setShowAddFriend(false);
    Alert.alert('Success', `Added ${friendInput} to your friends!`);
  };

  const handleRemoveFriend = (id: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(id);
            if (!result.success) {
              Alert.alert('Error', 'Failed to remove friend');
              return;
            }
            setFriends(friends.filter((f) => f.id !== id));
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    const result = await updateProfile({
      name: editedName,
      bio: editedBio,
    });

    if (!result.success) {
      Alert.alert('Error', 'Failed to update profile');
      return;
    }

    setProfile({
      ...profile,
      name: editedName,
      bio: editedBio,
    });
    setShowEditProfile(false);
    Alert.alert('Success', 'Profile updated!');
  };

  const toggleSetting = async (key: keyof Settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    const result = await updateSettings(newSettings);

    if (!result.success) {
      Alert.alert('Error', 'Failed to update settings');
      return;
    }

    setSettings(newSettings);
  };

  const getAvatarColor = () => {
    return colorScheme === 'dark' ? '#333' : '#e8f5e9';
  };

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </ThemedView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <ThemedView style={styles.header}>
          <ThemedView
            style={[
              styles.avatarContainer,
              { backgroundColor: getAvatarColor() },
            ]}>
            <ThemedText style={styles.avatar}>{profile.avatar}</ThemedText>
          </ThemedView>

          <ThemedText type="title" style={styles.name}>
            {profile.name}
          </ThemedText>
          <ThemedText style={styles.username}>{profile.username}</ThemedText>
          <ThemedText style={styles.bio}>{profile.bio}</ThemedText>
          <ThemedText style={styles.joinDate}>{profile.joinDate}</ThemedText>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditedName(profile.name);
              setEditedBio(profile.bio);
              setShowEditProfile(true);
            }}>
            <Ionicons name="pencil" size={16} color="#fff" />
            <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Friends Section */}
        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Friends ({friends.length})
            </ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddFriend(true)}>
              <Ionicons name="add" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </ThemedView>

          {friends.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={40}
                color={colorScheme === 'dark' ? '#666' : '#ccc'}
              />
              <ThemedText style={styles.emptyText}>No friends yet. Add one!</ThemedText>
            </ThemedView>
          ) : (
            <ThemedView>
              {friends.map((friend) => (
                <ThemedView key={friend.id} style={styles.friendItem}>
                  <ThemedView style={styles.friendInfo}>
                    <ThemedView style={styles.friendAvatar}>
                      <ThemedText style={styles.friendAvatarText}>
                        {friend.avatar}
                      </ThemedText>
                      <ThemedView
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor:
                              friend.status === 'online' ? '#4CAF50' : '#ccc',
                          },
                        ]}
                      />
                    </ThemedView>
                    <ThemedView style={styles.friendDetails}>
                      <ThemedText style={styles.friendName}>
                        {friend.name}
                      </ThemedText>
                      <ThemedText style={styles.friendUsername}>
                        {friend.username}
                      </ThemedText>
                      <ThemedView style={styles.friendStatus}>
                        <Ionicons
                          name="radio-button-on"
                          size={10}
                          color={friend.status === 'online' ? '#4CAF50' : '#ccc'}
                        />
                        <ThemedText style={{ fontSize: 12, marginLeft: 4 }}>
                          {friend.status === 'online' ? 'Online' : 'Offline'}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                  </ThemedView>
                  <TouchableOpacity
                    onPress={() => handleRemoveFriend(friend.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
          )}
        </ThemedView>

        {/* Settings Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Settings
          </ThemedText>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingLabel}>
              <Ionicons
                name="notifications"
                size={20}
                color="#4CAF50"
              />
              <ThemedView style={{ marginLeft: 12 }}>
                <ThemedText style={styles.settingName}>Notifications</ThemedText>
                <ThemedText style={styles.settingDesc}>
                  Get alerts for new tasks
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <TouchableOpacity
              onPress={() => toggleSetting('notifications')}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: settings.notifications ? '#4CAF50' : '#ccc',
                },
              ]}>
              <ThemedView
                style={[
                  styles.toggleThumb,
                  {
                    transform: [
                      {
                        translateX: settings.notifications ? 20 : 2,
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingLabel}>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#9c27b0"
              />
              <ThemedView style={{ marginLeft: 12 }}>
                <ThemedText style={styles.settingName}>Private Profile</ThemedText>
                <ThemedText style={styles.settingDesc}>
                  Control who can see your profile
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <TouchableOpacity
              onPress={() => toggleSetting('privateProfile')}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: settings.privateProfile ? '#4CAF50' : '#ccc',
                },
              ]}>
              <ThemedView
                style={[
                  styles.toggleThumb,
                  {
                    transform: [
                      {
                        translateX: settings.privateProfile ? 20 : 2,
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingLabel}>
              <Ionicons
                name="radio"
                size={20}
                color="#1976d2"
              />
              <ThemedView style={{ marginLeft: 12 }}>
                <ThemedText style={styles.settingName}>Show Online Status</ThemedText>
                <ThemedText style={styles.settingDesc}>
                  Let friends know when you're active
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <TouchableOpacity
              onPress={() => toggleSetting('showOnlineStatus')}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: settings.showOnlineStatus ? '#4CAF50' : '#ccc',
                },
              ]}>
              <ThemedView
                style={[
                  styles.toggleThumb,
                  {
                    transform: [
                      {
                        translateX: settings.showOnlineStatus ? 20 : 2,
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out" size={20} color="#ff6b6b" />
          <ThemedText style={styles.logoutButtonText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal visible={showAddFriend} animationType="slide" transparent>
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="title">Add Friend</ThemedText>
              <TouchableOpacity onPress={() => setShowAddFriend(false)}>
                <Ionicons name="close" size={28} color="#888" />
              </TouchableOpacity>
            </ThemedView>

            <ThemedText style={styles.modalLabel}>Username</ThemedText>
            <TextInput
              style={[
                styles.modalInput,
                { color: colorScheme === 'dark' ? '#fff' : '#000' },
              ]}
              placeholder="e.g., sarah_smith"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
              value={friendInput}
              onChangeText={setFriendInput}
            />

            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={handleAddFriend}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <ThemedText style={styles.addFriendButtonText}>Add Friend</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="title">Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={28} color="#888" />
              </TouchableOpacity>
            </ThemedView>

            <ThemedText style={styles.modalLabel}>Full Name</ThemedText>
            <TextInput
              style={[
                styles.modalInput,
                { color: colorScheme === 'dark' ? '#fff' : '#000' },
              ]}
              placeholder="Your name"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
              value={editedName}
              onChangeText={setEditedName}
            />

            <ThemedText style={styles.modalLabel}>Bio</ThemedText>
            <TextInput
              style={[
                styles.modalInputMultiline,
                { color: colorScheme === 'dark' ? '#fff' : '#000' },
              ]}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
              value={editedBio}
              onChangeText={setEditedBio}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            </TouchableOpacity>
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
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 36,
  },
  name: {
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  joinDate: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.6,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'space-between',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  friendAvatar: {
    position: 'relative',
  },
  friendAvatarText: {
    fontSize: 28,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontWeight: '600',
    fontSize: 14,
  },
  friendUsername: {
    fontSize: 12,
    opacity: 0.6,
  },
  friendStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingName: {
    fontWeight: '600',
    fontSize: 14,
  },
  settingDesc: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontWeight: '600',
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
    textAlignVertical: 'top',
  },
  addFriendButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  addFriendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
