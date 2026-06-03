import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

import { Alert } from 'react-native';
import { signUp } from '../services/authService';

import { useNavigation } from '@react-navigation/native';

import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

import { COLORS } from '../theme/colors';

import NeonInput from '../components/NeonInput';
import NeonButton from '../components/NeonButton';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const SignupScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, {
      duration: 1000,
    });

    opacity.value = withTiming(1, {
      duration: 1000,
    });

    rotate.value = withRepeat(
      withTiming(360, {
        duration: 15000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        scale: scale.value,
      },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotate.value}deg`,
      },
    ],
  }));

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');

      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');

      return;
    }

    try {
      await signUp(email, password, fullName);
      navigation.replace('Home');

      Alert.alert('Success', 'Account Created Successfully');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    }
  };

  return (
    <LinearGradient
      colors={['#050816', '#080B1B', '#0D1027']}
      style={styles.container}
    >
      <Animated.View style={[styles.ring, ringStyle]} />

      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            style={styles.logo}
          >
            <Text style={styles.logoText}>M</Text>
          </LinearGradient>

          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>Join MeetRoom Today</Text>
        </View>

        <NeonInput
          placeholder="Full Name"
          icon={User}
          value={fullName}
          onChangeText={setFullName}
        />

        <NeonInput
          placeholder="Email"
          icon={Mail}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <NeonInput
            placeholder="Password"
            icon={Lock}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={COLORS.primary} />
            ) : (
              <Eye size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <NeonInput
            placeholder="Confirm Password"
            icon={Lock}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color={COLORS.primary} />
            ) : (
              <Eye size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && (
          <Text
            style={[
              styles.matchText,
              {
                color: passwordsMatch ? COLORS.success : COLORS.danger,
              },
            ]}
          >
            {passwordsMatch ? 'Passwords Match ✓' : 'Passwords Do Not Match ✕'}
          </Text>
        )}

        <NeonButton title="CREATE ACCOUNT" onPress={handleSignup} />

        <View style={styles.bottom}>
          <Text style={styles.bottomText}>Already have an account?</Text>

          <TouchableOpacity>
            <Text
              style={styles.login}
              onPress={() => navigation.navigate('Login')}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',

    width: 350,
    height: 350,

    borderRadius: 200,

    borderWidth: 2,

    borderColor: COLORS.primary,

    opacity: 0.25,

    top: -120,
    right: -100,
  },

  card: {
    marginHorizontal: 24,

    padding: 24,

    borderRadius: 30,

    backgroundColor: 'rgba(11,16,35,0.92)',

    borderWidth: 1,

    borderColor: COLORS.primary,

    shadowColor: COLORS.primary,

    shadowRadius: 30,

    shadowOpacity: 0.9,

    elevation: 25,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    width: 85,
    height: 85,

    borderRadius: 50,

    justifyContent: 'center',

    alignItems: 'center',
  },

  logoText: {
    color: COLORS.text,

    fontSize: 40,

    fontWeight: '800',
  },

  title: {
    color: COLORS.text,

    fontSize: 28,

    fontWeight: '700',

    marginTop: 15,
  },

  subtitle: {
    color: COLORS.textSecondary,

    marginTop: 8,
  },

  passwordContainer: {
    position: 'relative',
  },

  eyeButton: {
    position: 'absolute',

    right: 15,

    top: 18,
  },

  matchText: {
    marginBottom: 15,

    fontWeight: '600',
  },

  bottom: {
    flexDirection: 'row',

    justifyContent: 'center',

    marginTop: 24,
  },

  bottomText: {
    color: '#AFAFAF',
  },

  login: {
    color: COLORS.secondary,

    fontWeight: '700',

    marginLeft: 5,
  },
});
