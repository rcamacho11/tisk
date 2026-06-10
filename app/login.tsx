import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { authService } from '@/src/services/authService';

type BannerType = 'error' | 'info' | 'success';
type ScreenMode = 'login' | 'signup' | 'forgot-email' | 'forgot-code' | 'forgot-password';

interface Banner {
  type: BannerType;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

const OTP_LENGTH = 6;

export default function LoginScreen() {
  const router = useRouter();
  const { login, signup, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const [mode, setMode] = useState<ScreenMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const otpInputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const [popup, setPopup] = useState<{
    type: 'no-account' | 'wrong-password';
    emailForReset?: string;
  } | null>(null);

  const colors = {
    bg: dark ? '#151718' : '#F2F2F7',
    card: dark ? '#1C1E1F' : '#FFFFFF',
    inputBg: dark ? '#2C2E2F' : '#F6F6F6',
    inputBorder: dark ? '#3A3C3D' : '#E5E5EA',
    text: dark ? '#ECEDEE' : '#11181C',
    textSecondary: dark ? '#9BA1A6' : '#8E8E93',
    placeholder: dark ? '#6C7075' : '#C7C7CC',
  };

  const showBanner = useCallback((b: Banner) => {
    setBanner(b);
    bannerOpacity.setValue(0);
    Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [bannerOpacity]);

  const hideBanner = useCallback(() => {
    Animated.timing(bannerOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setBanner(null));
  }, [bannerOpacity]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const friendlyError = (raw: string): string => {
    const lower = raw.toLowerCase();
    if (lower.includes('email not confirmed') || lower.includes('confirm your account'))
      return 'Please check your email and confirm your account before logging in.';
    if (lower.includes('rate limit') || lower.includes('too many requests'))
      return 'Too many attempts. Please wait a moment and try again.';
    if (lower.includes('network') || lower.includes('fetch'))
      return 'Unable to connect. Please check your internet connection.';
    if (lower.includes('invalid api key'))
      return 'App configuration error. Please contact support.';
    if (lower.includes('token has expired') || lower.includes('otp_expired'))
      return 'This code has expired. Please request a new one.';
    if (lower.includes('otp_disabled'))
      return 'Verification codes are not enabled. Please contact support.';
    return raw;
  };

  const switchMode = (newMode: ScreenMode, keepEmail = false) => {
    hideBanner();
    const email = keepEmail ? formData.email : '';
    setMode(newMode);
    resetForm();
    if (email) setFormData(f => ({ ...f, email }));
  };

  const handleLogin = async () => {
    hideBanner();
    const identifier = formData.email.trim();
    if (!identifier || !formData.password.trim()) {
      showBanner({ type: 'error', title: 'Missing Fields', message: 'Please fill in your email or username and password.' });
      return;
    }

    let emailToUse = identifier;
    const isEmail = validateEmail(identifier);

    if (!isEmail) {
      const resolved = await authService.resolveUsername(identifier);
      if (!resolved.email) {
        setPopup({ type: 'no-account' });
        return;
      }
      emailToUse = resolved.email;
    }

    const result = await login(emailToUse, formData.password);
    if (result.success) { router.replace('/(tabs)'); return; }

    const raw = result.error || '';
    if (raw.toLowerCase().includes('invalid login credentials')) {
      const exists = await authService.checkEmailExists(emailToUse);
      if (exists) {
        setPopup({ type: 'wrong-password', emailForReset: emailToUse });
      } else {
        setPopup({ type: 'no-account' });
      }
    } else {
      showBanner({ type: 'error', title: 'Login Failed', message: friendlyError(raw) });
    }
  };

  const handleSignup = async () => {
    hideBanner();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      showBanner({ type: 'error', title: 'Missing Fields', message: 'Please fill in all fields.' });
      return;
    }
    if (!validateEmail(formData.email)) {
      showBanner({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }
    if (formData.password.length < 6) {
      showBanner({ type: 'error', title: 'Weak Password', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showBanner({ type: 'error', title: 'Mismatch', message: 'Passwords do not match.' });
      return;
    }

    const result = await signup(formData.email, formData.password, formData.name);
    if (result.success) {
      Alert.alert('Success', 'Account created! Logging you in...');
      router.replace('/(tabs)');
    } else {
      const raw = result.error || 'Unable to create account';
      if (raw.includes('already in use') || raw.includes('already registered')) {
        showBanner({
          type: 'info', title: 'Email Already in Use',
          message: 'An account with this email already exists.',
          action: { label: 'Login Instead', onPress: () => switchMode('login', true) },
        });
      } else {
        showBanner({ type: 'error', title: 'Signup Failed', message: friendlyError(raw) });
      }
    }
  };

  const goToForgot = (email: string) => {
    hideBanner();
    setResetEmail(email);
    setFormData(f => ({ ...f, email }));
    setMode('forgot-email');
  };

  const handleSendCode = async () => {
    hideBanner();
    const email = formData.email.trim();
    if (!email) {
      showBanner({ type: 'error', title: 'Missing Email', message: 'Please enter your email address.' });
      return;
    }
    if (!validateEmail(email)) {
      showBanner({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }

    setIsSending(true);
    try {
      const exists = await authService.checkEmailExists(email);
      if (!exists) {
        showBanner({
          type: 'info', title: 'No Account Found',
          message: 'No account exists with this email.',
          action: { label: 'Create Account', onPress: () => switchMode('signup', true) },
        });
        return;
      }

      const result = await authService.sendResetCode(email);
      if (result.success) {
        setResetEmail(email);
        setOtpValue('');
        setMode('forgot-code');
        showBanner({
          type: 'success', title: 'Code Sent',
          message: `We sent a 6-digit code to ${email}. Check your inbox.`,
        });
      } else {
        showBanner({ type: 'error', title: 'Failed to Send', message: friendlyError(result.error || 'Please try again.') });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    hideBanner();
    const code = otpValue.replace(/[^0-9]/g, '');
    if (code.length < OTP_LENGTH) {
      showBanner({ type: 'error', title: 'Incomplete Code', message: 'Please enter the full 6-digit code.' });
      return;
    }

    setIsSending(true);
    try {
      const result = await authService.verifyResetCode(resetEmail, code);
      if (result.success) {
        setFormData(f => ({ ...f, password: '', confirmPassword: '' }));
        setShowPassword(false);
        setShowConfirmPassword(false);
        setMode('forgot-password');
      } else {
        const msg = result.error || '';
        if (msg.toLowerCase().includes('expired')) {
          showBanner({
            type: 'error', title: 'Code Expired',
            message: 'This code has expired.',
            action: { label: 'Resend Code', onPress: handleResendCode },
          });
        } else {
          showBanner({ type: 'error', title: 'Invalid Code', message: 'The code you entered is incorrect. Please try again.' });
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleResendCode = async () => {
    hideBanner();
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setIsSending(true);
    try {
      const result = await authService.sendResetCode(resetEmail);
      if (result.success) {
        showBanner({ type: 'success', title: 'Code Resent', message: `A new code has been sent to ${resetEmail}.` });
      } else {
        showBanner({ type: 'error', title: 'Failed to Resend', message: friendlyError(result.error || 'Please try again.') });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSetNewPassword = async () => {
    hideBanner();
    if (!formData.password.trim() || !formData.confirmPassword.trim()) {
      showBanner({ type: 'error', title: 'Missing Fields', message: 'Please fill in both password fields.' });
      return;
    }
    if (formData.password.length < 6) {
      showBanner({ type: 'error', title: 'Weak Password', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showBanner({ type: 'error', title: 'Mismatch', message: 'Passwords do not match.' });
      return;
    }

    setIsSending(true);
    try {
      const result = await authService.updatePassword(formData.password);
      if (result.success) {
        showBanner({
          type: 'success', title: 'Password Updated',
          message: 'Your password has been reset. You can now log in.',
          action: { label: 'Go to Login', onPress: () => switchMode('login', true) },
        });
      } else {
        showBanner({ type: 'error', title: 'Update Failed', message: friendlyError(result.error || 'Please try again.') });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (text: string) => {
    if (banner) hideBanner();
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtpValue(digits);
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  const bannerColors = {
    error: { bg: dark ? '#3A1C1C' : '#FFF2F2', border: '#FF3B30', icon: '#FF3B30' },
    info: { bg: dark ? '#1C2A3A' : '#F0F4FF', border: '#007AFF', icon: '#007AFF' },
    success: { bg: dark ? '#1C3A1C' : '#F0FFF0', border: '#34C759', icon: '#34C759' },
  };

  const bannerIcon: Record<BannerType, keyof typeof Ionicons.glyphMap> = {
    error: 'alert-circle',
    info: 'information-circle',
    success: 'checkmark-circle',
  };

  const isForgot = mode.startsWith('forgot');
  const busy = isLoading || isSending;

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-email': return 'Reset Password';
      case 'forgot-code': return 'Enter Code';
      case 'forgot-password': return 'New Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Use your email or username to continue';
      case 'signup': return 'Fill in the details to get started';
      case 'forgot-email': return "Enter your email and we'll send you a code";
      case 'forgot-code': return `Enter the 6-digit code sent to ${resetEmail}`;
      case 'forgot-password': return 'Choose a new password for your account';
    }
  };

  const getSubmitAction = () => {
    switch (mode) {
      case 'login': return handleLogin;
      case 'signup': return handleSignup;
      case 'forgot-email': return handleSendCode;
      case 'forgot-code': return handleVerifyCode;
      case 'forgot-password': return handleSetNewPassword;
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'login': return 'Login';
      case 'signup': return 'Create Account';
      case 'forgot-email': return 'Send Code';
      case 'forgot-code': return 'Verify Code';
      case 'forgot-password': return 'Reset Password';
    }
  };

  const getSubmitIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (mode) {
      case 'login': return 'log-in-outline';
      case 'signup': return 'person-add-outline';
      case 'forgot-email': return 'mail-outline';
      case 'forgot-code': return 'shield-checkmark-outline';
      case 'forgot-password': return 'lock-open-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={styles.flex}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets>

          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: dark ? '#1E3A1E' : '#E8F5E9' }]}>
              <Ionicons name="checkmark-done-circle" size={64} color="#4CAF50" />
            </View>
            <ThemedText type="title" style={styles.appTitle}>Tisk</ThemedText>
            <ThemedText style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              Stay organized, stay productive
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {isForgot && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => mode === 'forgot-email' ? switchMode('login', true) : setMode('forgot-email')}>
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                <ThemedText style={[styles.backButtonText, { color: colors.textSecondary }]}>
                  {mode === 'forgot-email' ? 'Back to Login' : 'Back'}
                </ThemedText>
              </TouchableOpacity>
            )}

            <ThemedText type="title" style={styles.formTitle}>{getTitle()}</ThemedText>
            <ThemedText style={[styles.formSubtitle, { color: colors.textSecondary }]}>{getSubtitle()}</ThemedText>

            {banner && (
              <Animated.View
                style={[
                  styles.banner,
                  { backgroundColor: bannerColors[banner.type].bg, borderColor: bannerColors[banner.type].border, opacity: bannerOpacity },
                ]}>
                <View style={styles.bannerContent}>
                  <Ionicons name={bannerIcon[banner.type]} size={20} color={bannerColors[banner.type].icon} style={styles.bannerIcon} />
                  <View style={styles.bannerText}>
                    <ThemedText style={[styles.bannerTitle, { color: bannerColors[banner.type].icon }]}>{banner.title}</ThemedText>
                    <ThemedText style={[styles.bannerMessage, { color: colors.text }]}>{banner.message}</ThemedText>
                  </View>
                  <TouchableOpacity onPress={hideBanner} hitSlop={8}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {banner.action && (
                  <TouchableOpacity
                    style={[styles.bannerAction, { borderColor: bannerColors[banner.type].border }]}
                    onPress={banner.action.onPress}>
                    <ThemedText style={[styles.bannerActionText, { color: bannerColors[banner.type].icon }]}>{banner.action.label}</ThemedText>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            {/* NAME — signup only */}
            {mode === 'signup' && (
              <View>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Full Name</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                  <TextInput style={[styles.input, { color: colors.text }]} placeholder="John Doe" placeholderTextColor={colors.placeholder}
                    value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} editable={!busy} />
                </View>
              </View>
            )}

            {/* EMAIL / USERNAME — login, signup, forgot-email */}
            {(mode === 'login' || mode === 'signup' || mode === 'forgot-email') && (
              <View>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  {mode === 'login' ? 'Email or Username' : 'Email'}
                </ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Ionicons name={mode === 'login' ? 'person-outline' : 'mail-outline'} size={20} color={colors.textSecondary} />
                  <TextInput style={[styles.input, { color: colors.text }]}
                    placeholder={mode === 'login' ? 'Email or username' : 'your@email.com'}
                    placeholderTextColor={colors.placeholder}
                    value={formData.email} onChangeText={(t) => { setFormData({ ...formData, email: t }); if (banner) hideBanner(); }}
                    keyboardType={mode === 'login' ? 'default' : 'email-address'} autoCapitalize="none" editable={!busy} />
                </View>
              </View>
            )}

            {/* OTP CODE — forgot-code */}
            {mode === 'forgot-code' && (
              <View>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Verification Code</ThemedText>
                <TouchableOpacity
                  style={styles.otpRow}
                  activeOpacity={1}
                  onPress={() => otpInputRef.current?.focus()}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                    const digit = otpValue[i] || '';
                    const isCursor = i === otpValue.length && otpValue.length < OTP_LENGTH;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: isCursor ? '#4CAF50' : digit ? '#4CAF50' : colors.inputBorder,
                          },
                        ]}>
                        <ThemedText style={[styles.otpDigit, { color: colors.text }]}>
                          {digit}
                        </ThemedText>
                      </View>
                    );
                  })}
                </TouchableOpacity>
                <TextInput
                  ref={otpInputRef}
                  value={otpValue}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  autoFocus
                  style={styles.otpHiddenInput}
                  editable={!busy}
                />
                <TouchableOpacity style={styles.resendButton} onPress={handleResendCode} disabled={busy}>
                  <ThemedText style={[styles.resendText, { color: '#4CAF50' }]}>
                    Didn't receive a code? Resend
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* PASSWORD — login, signup */}
            {(mode === 'login' || mode === 'signup') && (
              <View>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Password</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput style={[styles.input, { color: colors.text }]} placeholder="••••••••" placeholderTextColor={colors.placeholder}
                    value={formData.password} onChangeText={(t) => { setFormData({ ...formData, password: t }); if (banner) hideBanner(); }}
                    secureTextEntry={!showPassword} editable={!busy} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* NEW PASSWORD + CONFIRM — forgot-password */}
            {mode === 'forgot-password' && (
              <>
                <View>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>New Password</ThemedText>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="lock-open-outline" size={20} color={colors.textSecondary} />
                    <TextInput style={[styles.input, { color: colors.text }]} placeholder="••••••••" placeholderTextColor={colors.placeholder}
                      value={formData.password} onChangeText={(t) => { setFormData({ ...formData, password: t }); if (banner) hideBanner(); }}
                      secureTextEntry={!showPassword} editable={!busy} />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Confirm New Password</ThemedText>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                    <TextInput style={[styles.input, { color: colors.text }]} placeholder="••••••••" placeholderTextColor={colors.placeholder}
                      value={formData.confirmPassword} onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
                      secureTextEntry={!showConfirmPassword} editable={!busy} />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                      <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* CONFIRM PASSWORD — signup */}
            {mode === 'signup' && (
              <View>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput style={[styles.input, { color: colors.text }]} placeholder="••••••••" placeholderTextColor={colors.placeholder}
                    value={formData.confirmPassword} onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
                    secureTextEntry={!showConfirmPassword} editable={!busy} />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitButton, busy && { opacity: 0.7 }]}
              onPress={getSubmitAction()}
              activeOpacity={0.8}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={getSubmitIcon()} size={20} color="#fff" />
                  <ThemedText style={styles.submitButtonText}>{getSubmitLabel()}</ThemedText>
                </>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotButton} onPress={() => goToForgot(formData.email)}>
                <ThemedText style={[styles.forgotButtonText, { color: colors.textSecondary }]}>Forgot Password?</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {!isForgot && (
            <View style={styles.toggleContainer}>
              <ThemedText style={[styles.toggleText, { color: colors.textSecondary }]}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </ThemedText>
              <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                <ThemedText style={styles.toggleLink}>{mode === 'login' ? 'Sign Up' : 'Login'}</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* No Account Found Popup */}
      <Modal visible={popup?.type === 'no-account'} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: colors.card }]}>
            <View style={styles.popupIconRow}>
              <View style={[styles.popupIconCircle, { backgroundColor: 'rgba(0,122,255,0.12)' }]}>
                <Ionicons name="person-outline" size={32} color="#007AFF" />
              </View>
            </View>
            <ThemedText style={styles.popupTitle}>No Account Found</ThemedText>
            <ThemedText style={[styles.popupBody, { color: colors.textSecondary }]}>
              We couldn't find an account with that {validateEmail(formData.email.trim()) ? 'email' : 'username'}. Would you like to create one?
            </ThemedText>
            <TouchableOpacity
              style={[styles.popupPrimaryButton, { backgroundColor: '#007AFF' }]}
              onPress={() => setPopup(null)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.popupButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupSecondaryButton}
              onPress={() => { setPopup(null); switchMode('signup', true); }}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.popupSecondaryText, { color: colors.textSecondary }]}>Create Account</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Wrong Password Popup */}
      <Modal visible={popup?.type === 'wrong-password'} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: colors.card }]}>
            <View style={styles.popupIconRow}>
              <View style={[styles.popupIconCircle, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                <Ionicons name="lock-closed-outline" size={32} color="#ff6b6b" />
              </View>
            </View>
            <ThemedText style={styles.popupTitle}>Incorrect Password</ThemedText>
            <ThemedText style={[styles.popupBody, { color: colors.textSecondary }]}>
              The password you entered is incorrect. You can try again or reset your password.
            </ThemedText>
            <TouchableOpacity
              style={[styles.popupPrimaryButton, { backgroundColor: '#ff6b6b' }]}
              onPress={() => setPopup(null)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.popupButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupSecondaryButton}
              onPress={() => { setPopup(null); goToForgot(popup?.emailForReset || formData.email); }}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.popupSecondaryText, { color: colors.textSecondary }]}>Reset Password</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  appSubtitle: { fontSize: 15 },
  card: {
    borderRadius: 20, padding: 24, gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -4 },
  backButtonText: { fontSize: 14, fontWeight: '600' },
  formTitle: { fontSize: 24, fontWeight: '700', marginBottom: -8 },
  formSubtitle: { fontSize: 14, marginBottom: 4 },
  banner: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  bannerContent: { flexDirection: 'row', alignItems: 'flex-start' },
  bannerIcon: { marginRight: 8, marginTop: 1 },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerMessage: { fontSize: 13, lineHeight: 18 },
  bannerAction: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginLeft: 28 },
  bannerActionText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1, height: 56, borderWidth: 1.5, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  otpDigit: { fontSize: 24, fontWeight: '700' },
  otpHiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  resendButton: { alignItems: 'center', paddingVertical: 10 },
  resendText: { fontSize: 13, fontWeight: '600' },
  submitButton: {
    flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  forgotButton: { alignItems: 'center', paddingVertical: 4 },
  forgotButtonText: { fontWeight: '600', fontSize: 14 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  toggleText: { fontSize: 14 },
  toggleLink: { color: '#4CAF50', fontWeight: '700', fontSize: 14 },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  popupCard: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  popupIconRow: {
    marginBottom: 16,
  },
  popupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  popupBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  popupPrimaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  popupButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  popupSecondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupSecondaryText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
