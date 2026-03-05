import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setAuthToken, signIn, signUp } from '@/utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    const result = await signIn(formData.email, formData.password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Unable to sign in');
      return;
    }

    if (result.data?.session) {
      setAuthToken(result.data.session.access_token);
    }
    router.replace('/(tabs)');
  };

  const handleSignup = async () => {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await signUp(formData.email, formData.password, formData.name);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Signup Failed', result.error || 'Unable to create account');
      return;
    }

    if (result.data?.session) {
      setAuthToken(result.data.session.access_token);
    }
    Alert.alert('Success', 'Account created! Logging you in...');
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <ThemedView style={styles.logoSection}>
          <ThemedView style={styles.logoContainer}>
            <Ionicons name="checkmark-done-circle" size={80} color="#4CAF50" />
          </ThemedView>
          <ThemedText type="title" style={styles.appTitle}>
            Tisk
          </ThemedText>
          <ThemedText style={styles.appSubtitle}>
            Stay organized, stay productive
          </ThemedText>
        </ThemedView>

        {/* Login/Signup Form */}
        <ThemedView style={styles.formSection}>
          <ThemedText type="title" style={styles.formTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </ThemedText>

          {/* Name Field (Signup Only) */}
          {!isLogin && (
            <ThemedView>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <ThemedView style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#888" />
                <TextInput
                  style={[
                    styles.input,
                    { color: colorScheme === 'dark' ? '#fff' : '#000' },
                  ]}
                  placeholder="John Doe"
                  placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  editable={!loading}
                />
              </ThemedView>
            </ThemedView>
          )}

          {/* Email Field */}
          <ThemedView>
            <ThemedText style={styles.label}>Email</ThemedText>
            <ThemedView style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#888" />
              <TextInput
                style={[
                  styles.input,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
                placeholder="your@email.com"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </ThemedView>
          </ThemedView>

          {/* Password Field */}
          <ThemedView>
            <ThemedText style={styles.label}>Password</ThemedText>
            <ThemedView style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#888" />
              <TextInput
                style={[
                  styles.input,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Confirm Password Field (Signup Only) */}
          {!isLogin && (
            <ThemedView>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <ThemedView style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#888" />
                <TextInput
                  style={[
                    styles.input,
                    { color: colorScheme === 'dark' ? '#fff' : '#000' },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colorScheme === 'dark' ? '#888' : '#ccc'}
                  value={formData.confirmPassword}
                  onChangeText={(text) =>
                    setFormData({ ...formData, confirmPassword: text })
                  }
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={isLogin ? handleLogin : handleSignup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isLogin ? 'log-in' : 'person-add'}
                  size={20}
                  color="#fff"
                />
                <ThemedText style={styles.submitButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {/* Forgot Password Link (Login Only) */}
          {isLogin && (
            <TouchableOpacity style={styles.forgotButton}>
              <ThemedText style={styles.forgotButtonText}>
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Toggle Between Login and Signup */}
          <ThemedView style={styles.toggleContainer}>
            <ThemedText style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                });
              }}>
              <ThemedText style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Social Login */}
          <ThemedView style={styles.divider}>
            <ThemedView style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or continue with</ThemedText>
            <ThemedView style={styles.dividerLine} />
          </ThemedView>

          <ThemedView style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-facebook" size={24} color="#1976d2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="mail" size={24} color="#ff6b6b" />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  formSection: {
    gap: 16,
  },
  formTitle: {
    marginBottom: 8,
    fontSize: 28,
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
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    opacity: 0.6,
  },
  toggleLink: {
    color: '#4CAF50',
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontSize: 12,
    opacity: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
