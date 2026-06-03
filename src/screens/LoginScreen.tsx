import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import { login } from '../services/authService';
import { Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

import LinearGradient from 'react-native-linear-gradient';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

import { COLORS } from '../theme/colors';

import { Mail, Lock } from 'lucide-react-native';
import NeonInput from '../components/NeonInput';
import NeonButton from '../components/NeonButton';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(80);

  const orb1 = useSharedValue(0);
  const orb2 = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 1200,
    });

    cardTranslate.value = withTiming(0, {
      duration: 1200,
    });

    orb1.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 3000 }),
        withTiming(20, { duration: 3000 }),
      ),
      -1,
      true,
    );

    orb2.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 4000 }),
        withTiming(-20, { duration: 4000 }),
      ),
      -1,
      true,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      {
        translateY: cardTranslate.value,
      },
    ],
  }));

  const orbStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1.value }],
  }));

  const orbStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: orb2.value }],
  }));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await login(email, password);

      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <LinearGradient
      colors={['#050816', '#080B1B', '#0D1027']}
      style={styles.container}
    >
      <Animated.View style={[styles.orb1, orbStyle1]} />

      <Animated.View style={[styles.orb2, orbStyle2]} />

      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.logoContainer}>
          <LinearGradient colors={['#A855F7', '#D946EF']} style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </LinearGradient>

          <Text style={styles.title}>MeetRoom</Text>

          <Text style={styles.subtitle}>Connect Beyond Limits</Text>
        </View>

        {/* Email */}

        <NeonInput
          placeholder="Email"
          icon={Mail}
          value={email}
          onChangeText={setEmail}
        />

        {/* Password */}

        <NeonInput
          placeholder="Password"
          icon={Lock}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}

        <NeonButton title="LOGIN" onPress={handleLogin} />

        <View style={styles.bottom}>
          <Text style={styles.bottomText}>Don't have an account?</Text>

          <TouchableOpacity>
            <Text
              style={styles.signup}
              onPress={() => navigation.navigate('Signup')}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },

  orb1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 200,
    backgroundColor: COLORS.primary,
    opacity: 0.18,
    top: -60,
    right: -60,
  },

  orb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: '#D946EF',
    opacity: 0.15,
    bottom: -40,
    left: -60,
  },

  card: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(11,16,35,0.9)',
    borderRadius: 30,
    padding: 24,

    borderWidth: 1,
    borderColor: COLORS.primary,

    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 35,
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
    fontSize: 30,
    fontWeight: '700',
    marginTop: 15,
  },

  subtitle: {
    color: '#CFCFCF',
    marginTop: 8,
  },

  forgot: {
    color: '#C084FC',
    textAlign: 'right',
    marginBottom: 24,
  },

  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },

  bottomText: {
    color: '#AFAFAF',
  },

  signup: {
    color: '#C084FC',
    fontWeight: '700',
    marginLeft: 5,
  },
});
