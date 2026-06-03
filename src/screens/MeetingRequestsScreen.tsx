import React, { useEffect, useState } from 'react';

import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';

import { useRoute } from '@react-navigation/native';

import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

import { listenMeetingRequests } from '../services/meetingService';

import NeonButton from '../components/NeonButton';

import { COLORS } from '../theme/colors';

const MeetingRequestsScreen = () => {
  const route = useRoute<any>();

  const { meetingId } = route.params;

  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const unsub = listenMeetingRequests(meetingId, data => {
      setRequests(data);
    });
    return unsub;
  }, [meetingId]);

  const handleAccept = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId, 'requests', userId), {
        status: 'accepted',
      });

      Alert.alert('Success', 'User Accepted');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId, 'requests', userId), {
        status: 'rejected',
      });

      Alert.alert('Success', 'User Rejected');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.email}>{item.userEmail}</Text>

      <Text style={styles.status}>Status: {item.status}</Text>

      {item.status === 'pending' && (
        <>
          <NeonButton
            title="ACCEPT"
            onPress={() => handleAccept(item.userId)}
          />

          <View
            style={{
              height: 10,
            }}
          />

          <NeonButton
            title="REJECT"
            onPress={() => handleReject(item.userId)}
          />
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meeting Requests</Text>

      <Text style={styles.meetingId}>Meeting: {meetingId}</Text>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: 30,
        }}
      />
    </View>
  );
};

export default MeetingRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 20,
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },

  meetingId: {
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 25,
    marginTop: 10,
  },

  card: {
    backgroundColor: COLORS.card,

    borderWidth: 1,

    borderColor: COLORS.primary,

    borderRadius: 20,

    padding: 15,

    marginBottom: 20,
  },

  email: {
    color: COLORS.text,

    fontSize: 16,

    fontWeight: '600',
  },

  status: {
    color: COLORS.secondary,

    marginTop: 8,

    marginBottom: 15,
  },
});
