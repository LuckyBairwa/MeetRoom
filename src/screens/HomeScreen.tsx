import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { auth } from '../config/firebase';

import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { logout } from '../services/authService';
import { createMeeting } from '../services/meetingService';
import { generateMeetingCode } from '../utils/generateMeetingCode';
import NeonButton from '../components/NeonButton';
import { COLORS } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [meetingCode, setMeetingCode] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const user = auth.currentUser;
  const firstLetter = user?.email?.charAt(0).toUpperCase() || 'U';

  const handleJoinByCode = () => {
    navigation.navigate('JoinMeeting', {
      meetingCode: joinCode,
    } as any);
  };

  const handleCreateMeeting = async () => {
    try {
      const code = generateMeetingCode();

      await createMeeting(code);

      setMeetingCode(code);

      Alert.alert('Success', `Meeting Created\n\nCode: ${code}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleViewRequests = () => {
    if (!meetingCode) {
      Alert.alert(
        'Create Meeting First',
        'Please create a meeting before viewing requests',
      );
      return;
    }

    navigation.navigate('MeetingRequests', {
      meetingId: meetingCode,
    });
  };

  const handleCopyCode = () => {
    Clipboard.setString(meetingCode);

    Alert.alert('Copied', 'Meeting code copied successfully');
  };

  const handleEnterRoom = () => {
    navigation.navigate('Room', {
      meetingId: meetingCode,
      role: 'host',
    });
  };

  const handleLogout = async () => {
    try {
      await logout();

      navigation.replace('Login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => setShowProfile(true)}
      >
        <Text style={styles.avatarText}>{firstLetter}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>MeetRoom</Text>
      <Text style={styles.welcome}>💜 Welcome To MeetRoom 💜</Text>

      <TouchableOpacity style={styles.actionBtn} onPress={handleJoinByCode}>
        <Text style={styles.actionBtnText}>Join Meeting</Text>
      </TouchableOpacity>

     <TouchableOpacity style={styles.actionBtn} onPress={handleCreateMeeting}>
        <Text style={styles.actionBtnText}>Create Meeting</Text>
      </TouchableOpacity>

      {meetingCode ? (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Meeting Code</Text>

          <Text style={styles.codeText}>{meetingCode}</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={handleCopyCode}>
            <Text style={styles.actionBtnText}>Copy Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleEnterRoom}>
            <Text style={styles.actionBtnText}>Enter Room</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showProfile} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfile(false)}
        >
          <View style={styles.profileCard}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{firstLetter}</Text>
            </View>

            <Text style={styles.profileName}>
              {user?.displayName || 'MeetRoom User'}
            </Text>

            <Text style={styles.profileEmail}>{user?.email}</Text>

            <TouchableOpacity
              style={[styles.actionBtn, styles.logoutBtn]}
              onPress={handleLogout}
            >
              <Text style={styles.actionBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },

  avatar: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionBtn: {
    width: '100%',
    height: 50,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  logoutBtn: {
    backgroundColor: COLORS.primary,
  },

  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  welcome: {
    color: COLORS.text,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 10,
  },

  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 15,
    backgroundColor: COLORS.card,
  },

  joinBtn: {
    marginLeft: 10,
    height: 55,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
  },

  joinBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileCard: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },

  bigAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bigAvatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
  },

  profileName: {
    color: '#fff',
    fontSize: 20,
    marginTop: 15,
    fontWeight: '700',
  },

  profileEmail: {
    color: '#aaa',
    marginTop: 5,
  },

  buttonContainer: {
    marginBottom: 20,
  },

  codeCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  codeLabel: {
    color: COLORS.secondary,
    fontSize: 14,
    marginBottom: 8,
  },

  codeText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },

  logoutContainer: {
    marginTop: 10,
  },
});
