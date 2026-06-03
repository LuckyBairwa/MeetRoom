import React, { useState } from 'react';

import { View, Text, StyleSheet, Alert } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import { Hash } from 'lucide-react-native';

import { COLORS } from '../theme/colors';

import { auth } from '../config/firebase';

import { sendJoinRequest } from '../services/meetingService';

import { useNavigation } from '@react-navigation/native';

import NeonInput from '../components/NeonInput';
import NeonButton from '../components/NeonButton';

import { checkMeetingExists } from '../services/meetingService';



const JoinMeetingScreen = () => {
  const [meetingCode, setMeetingCode] = useState('');

  const navigation = useNavigation<any>();

  const handleJoinMeeting = async () => {
    if (!meetingCode.trim()) {
      Alert.alert('Error', 'Please enter meeting code');
      return;
    }

    try {
      const exists = await checkMeetingExists(meetingCode.toUpperCase());

      if (!exists) {
        Alert.alert('Meeting Not Found');
        return;
      }

      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not logged in');
      }

      await sendJoinRequest(
        meetingCode.toUpperCase(),
        user.uid,
        user.email || '',
      );

      navigation.replace('WaitingRoom', {
        meetingId: meetingCode.toUpperCase(),
        userId: user.uid,
      });
    } catch (error: any) {
      console.log(error);
    }
  };

  return (
    <LinearGradient
      colors={['#050816', '#080B1B', '#0D1027']}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Join Meeting</Text>

        <Text style={styles.subtitle}>Enter meeting code shared by host</Text>

        <NeonInput
          placeholder="Meeting Code"
          icon={Hash}
          value={meetingCode}
          onChangeText={setMeetingCode}
        />

        <NeonButton title="JOIN MEETING" onPress={handleJoinMeeting} />
      </View>
    </LinearGradient>
  );
};

export default JoinMeetingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: 'rgba(11,16,35,0.95)',

    borderRadius: 30,

    padding: 24,

    borderWidth: 1,

    borderColor: COLORS.primary,

    shadowColor: COLORS.primary,

    shadowOpacity: 0.8,

    shadowRadius: 20,

    elevation: 20,
  },

  title: {
    color: COLORS.text,

    fontSize: 30,

    fontWeight: '700',

    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.secondary,

    textAlign: 'center',

    marginTop: 10,

    marginBottom: 30,
  },
});
