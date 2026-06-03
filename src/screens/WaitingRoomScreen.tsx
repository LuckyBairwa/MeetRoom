import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {doc, onSnapshot} from 'firebase/firestore';
import {db, auth} from '../config/firebase';

const WaitingRoomScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const {meetingId} = route.params;
  const user = auth.currentUser;

  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (!user) return;

    const ref = doc(
      db,
      'meetings',
      meetingId,
      'requests',
      user.uid,
    );

    const unsub = onSnapshot(ref, snapshot => {
      if (!snapshot.exists()) {
        Alert.alert('Error', 'Request not found');
        navigation.goBack();
        return;
      }

      const data = snapshot.data();
      setStatus(data.status);

      
      if (data.status === 'accepted') {
        navigation.replace('Room', {
          meetingId,
          role: 'guest',
        });
      }

      if (data.status === 'rejected') {
        Alert.alert('Rejected', 'Host rejected your request');
        navigation.goBack();
      }
    });

    return unsub;
  }, [meetingId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waiting Room ⏳</Text>

      <Text style={styles.sub}>
        Waiting for host approval...
      </Text>

      <View style={styles.card}>
        <Text style={styles.code}>Meeting: {meetingId}</Text>

        <Text style={styles.status}>
          Status: {status.toUpperCase()}
        </Text>

        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    </View>
  );
};

export default WaitingRoomScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  sub: {
    color: '#aaa',
    marginVertical: 15,
  },
  card: {
    width: '100%',
    backgroundColor: '#0B1023',
    padding: 20,
    borderRadius: 20,
    borderColor: '#A855F7',
    borderWidth: 1,
    alignItems: 'center',
  },
  code: {
    color: '#A855F7',
    fontSize: 20,
    fontWeight: '700',
  },
  status: {
    color: '#fff',
    marginVertical: 15,
  },
});