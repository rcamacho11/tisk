import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppThemeControl } from '@/src/contexts/ThemeContext';
import { useApi, useMutation } from '@/src/hooks/useApi';
import { useAuth } from '@/src/hooks/useAuth';
import { friendService } from '@/src/services/friendService';
import { profileService } from '@/src/services/profileService';
import { settingsService } from '@/src/services/settingsService';
import { UpdateProfileInput } from '@/src/types/api';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#333' : '#ddd';
  const textColor = isDark ? '#fff' : '#000';
  const placeholderColor = isDark ? '#666' : '#aaa';
  const cardBg = isDark ? '#1e2022' : '#fff';
  const separatorColor = isDark ? '#2a2a2a' : '#f0f0f0';

  const { setIsDark } = useAppThemeControl();
  const { user, logout } = useAuth();
  const { data: profile, loading: profileLoading, refetch: refetchProfile } = useApi(() =>
    profileService.getProfile()
  );
  const { data: settings, loading: settingsLoading } = useApi(() =>
    settingsService.getSettings()
  );
  const { data: friends, loading: friendsLoading, refetch: refetchFriends } = useApi(() =>
    friendService.getFriends()
  );
  const { data: friendRequests, refetch: refetchRequests } = useApi(() =>
    friendService.getFriendRequests()
  );

  const { mutate: updateSettings } = useMutation(
    (data: Parameters<typeof settingsService.updateSettings>[0]) =>
      settingsService.updateSettings(data)
  );

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<UpdateProfileInput>({
    username: profile?.username || '',
    name: profile?.name || '',
    bio: profile?.bio || '',
  });

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (key === 'dark_mode') setIsDark(value);
    const { error } = await updateSettings({ [key]: value });
    if (error) Alert.alert('Error', error.message);
  };

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');

  const { mutate: updateProfile, loading: updateLoading } = useMutation(
    (data: UpdateProfileInput) => profileService.updateProfile(data)
  );

  const { mutate: addFriend, loading: addingFriend } = useMutation(
    (username: string) => friendService.addFriend({ username })
  );

  const { mutate: respondToRequest } = useMutation(
    ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      friendService.respondToRequest(id, status)
  );

  const handleUpdateProfile = async () => {
    const { error } = await updateProfile(editData);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Success', 'Profile updated');
    setEditMode(false);
    refetchProfile();
  };

  const handleAddFriend = async () => {
    if (!friendUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    const { error } = await addFriend(friendUsername);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Success', 'Friend added!');
    setFriendUsername('');
    setShowAddFriend(false);
    refetchFriends();
  };

  const handleRespondToRequest = async (id: string, status: 'accepted' | 'rejected') => {
    const { error } = await respondToRequest({ id, status });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    refetchRequests();
    refetchFriends();
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    const { error } = await friendService.removeFriend(friendshipId);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    refetchFriends();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (profileLoading || settingsLoading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { borderColor: '#4CAF50' }]}>
            <Ionicons name="person" size={44} color="#4CAF50" />
          </View>
          <ThemedText type="subtitle" style={styles.name}>
            {profile?.name || user?.name || 'User'}
          </ThemedText>
          <ThemedText style={styles.email}>{user?.email}</ThemedText>
        </View>

        {/* Profile Info (read mode) */}
        {!editMode && (
          <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Profile Information</ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setEditData({
                    username: profile?.username || '',
                    name: profile?.name || '',
                    bio: profile?.bio || '',
                  });
                  setEditMode(true);
                }}
              >
                <ThemedText style={styles.editLink}>Edit</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: separatorColor }]}>
              <ThemedText style={styles.infoLabel}>Username</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.username || 'Not set'}</ThemedText>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: separatorColor }]}>
              <ThemedText style={styles.infoLabel}>Bio</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.bio || 'No bio added'}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Member Since</ThemedText>
              <ThemedText style={styles.infoValue}>
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Edit Mode */}
        {editMode && (
          <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { marginBottom: 16 }]}>
              Edit Profile
            </ThemedText>

            <ThemedText style={styles.label}>Username</ThemedText>
            <View style={[styles.inputContainer, { borderColor }]}>
              <Ionicons name="at" size={20} color="#888" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={editData.username}
                onChangeText={(text) => setEditData({ ...editData, username: text })}
                placeholder="username"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
              />
            </View>

            <ThemedText style={styles.label}>Name</ThemedText>
            <View style={[styles.inputContainer, { borderColor }]}>
              <Ionicons name="person-outline" size={20} color="#888" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Your name"
                placeholderTextColor={placeholderColor}
              />
            </View>

            <ThemedText style={styles.label}>Bio</ThemedText>
            <View style={[styles.inputContainer, styles.inputContainerMultiline, { borderColor }]}>
              <Ionicons name="document-text-outline" size={20} color="#888" style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: textColor, minHeight: 60 }]}
                value={editData.bio || ''}
                onChangeText={(text) => setEditData({ ...editData, bio: text })}
                placeholder="Tell us about yourself"
                placeholderTextColor={placeholderColor}
                multiline
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor }]}
                onPress={() => setEditMode(false)}
              >
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleUpdateProfile}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <ThemedText style={styles.primaryButtonText}>Save</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending Friend Requests */}
        {friendRequests && friendRequests.length > 0 && (
          <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { marginBottom: 12 }]}>
              Friend Requests ({friendRequests.length})
            </ThemedText>
            {friendRequests.map((request) => (
              <View key={request.id} style={[styles.friendRow, { borderBottomColor: separatorColor }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.friendName}>{request.requester.username}</ThemedText>
                  {request.requester.name && (
                    <ThemedText style={styles.friendSubtext}>{request.requester.name}</ThemedText>
                  )}
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleRespondToRequest(request.id, 'accepted')}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRespondToRequest(request.id, 'rejected')}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friends */}
        <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              Friends ({friends?.length || 0})
            </ThemedText>
            <TouchableOpacity onPress={() => setShowAddFriend(true)}>
              <Ionicons name="person-add" size={22} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          {friendsLoading ? (
            <ActivityIndicator color="#4CAF50" style={{ paddingVertical: 16 }} />
          ) : friends && friends.length > 0 ? (
            friends.map((friend) => (
              <View key={friend.friendship_id} style={[styles.friendRow, { borderBottomColor: separatorColor }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.friendName}>{friend.username}</ThemedText>
                  {friend.name && (
                    <ThemedText style={styles.friendSubtext}>{friend.name}</ThemedText>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemoveFriend(friend.friendship_id)}>
                  <Ionicons name="close-circle" size={22} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyCardText}>No friends yet</ThemedText>
          )}
        </View>

        {/* Settings */}
        <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
          <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { marginBottom: 8 }]}>
            Preferences
          </ThemedText>

          <View style={[styles.settingRow, { borderBottomColor: separatorColor }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => handleToggleSetting('dark_mode', v)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }} thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: separatorColor }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
            </View>
            <Switch
              value={!!settings?.notifications_enabled}
              onValueChange={(v) => handleToggleSetting('notifications_enabled', v)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }} thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: separatorColor }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.settingLabel}>Private Profile</ThemedText>
            </View>
            <Switch
              value={!!settings?.private_profile}
              onValueChange={(v) => handleToggleSetting('private_profile', v)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }} thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.settingLabel}>Share Location</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Let friends see your location on the map
              </ThemedText>
            </View>
            <Switch
              value={!!settings?.share_location}
              onValueChange={(v) => handleToggleSetting('share_location', v)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }} thumbColor="#fff"
            />
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal visible={showAddFriend} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Add Friend</ThemedText>
              <TouchableOpacity onPress={() => setShowAddFriend(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.label}>Username</ThemedText>
            <View style={[styles.inputContainer, { borderColor }]}>
              <Ionicons name="person-outline" size={20} color="#888" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Enter username"
                placeholderTextColor={placeholderColor}
                value={friendUsername}
                onChangeText={setFriendUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor }]}
                onPress={() => setShowAddFriend(false)}
              >
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddFriend}
                disabled={addingFriend}
              >
                {addingFriend ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <ThemedText style={styles.primaryButtonText}>Add</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.5,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
  },
  editLink: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.5,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendSubtext: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    opacity: 0.4,
    textAlign: 'center',
    paddingVertical: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
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
    color: '#ff6b6b',
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
});
