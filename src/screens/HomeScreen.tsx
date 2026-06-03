import React, { useState } from 'react';

import { View, Text, StyleSheet, Alert } from 'react-native';

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
      <Text style={styles.title}>MeetRoom</Text>

      <Text style={styles.subtitle}>Create and Manage Meetings</Text>

      <View style={styles.buttonContainer}>
        <NeonButton title="CREATE MEETING" onPress={handleCreateMeeting} />
      </View>

      <View style={styles.buttonContainer}>
        <NeonButton
          title="JOIN MEETING"
          onPress={() => navigation.navigate('JoinMeeting')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <NeonButton title="VIEW REQUESTS" onPress={handleViewRequests} />
      </View>

      {meetingCode ? (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Meeting Code</Text>

          <Text style={styles.codeText}>{meetingCode}</Text>

          <View style={{ marginTop: 20 }}>
            <NeonButton title="COPY CODE" onPress={handleCopyCode} />
          </View>

          <View style={{ marginTop: 15 }}>
            <NeonButton title="ENTER ROOM" onPress={handleEnterRoom} />
          </View>
        </View>
      ) : null}

      <View style={styles.logoutContainer}>
        <NeonButton title="LOGOUT" onPress={handleLogout} />
      </View>
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
