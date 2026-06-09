import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db, auth } from '../config/firebase';

export const createMeeting = async (meetingCode: string) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not logged in');
  }

  await setDoc(doc(db, 'meetings', meetingCode), {
    meetingId: meetingCode,
    hostId: user.uid,
    hostname: user.displayName || 'Unknown',
    hostEmail: user.email,
    status: 'active',
    createdAt: serverTimestamp(),
  });
};

export const checkMeetingExists = async (meetingId: string) => {
  const meetingRef = doc(db, 'meetings', meetingId);
  const snapshot = await getDoc(meetingRef);
  return snapshot.exists();
};

export const sendJoinRequest = async (
  meetingId: string,
  userId: string,
  userEmail: string,
) => {
  await setDoc(doc(db, 'meetings', meetingId, 'requests', userId), {
    userId,
    userEmail,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

export const getMeetingRequests = async (meetingId: string) => {
  const snapshot = await getDocs(
    collection(db, 'meetings', meetingId, 'requests'),
  );
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getRequestStatus = async (meetingId: string, userId: string) => {
  const snapshot = await getDoc(
    doc(db, 'meetings', meetingId, 'requests', userId),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().status;
};

export const saveOffer = async (meetingId: string, offer: any) => {
  await setDoc(
    doc(db, 'meetings', meetingId),
    {
      offer: JSON.stringify(offer),
    },
    { merge: true },
  );
};

export const saveAnswer = async (meetingId: string, answer: any) => {
  await setDoc(
    doc(db, 'meetings', meetingId),
    {
      answer: JSON.stringify(answer),
    },
    { merge: true },
  );
};

export const listenMeeting = (meetingId: string, callback: any) => {
  return onSnapshot(doc(db, 'meetings', meetingId), snapshot => {
    callback(snapshot.data());
  });
};

export const addIceCandidate = async (
  meetingId: string,
  candidate: any,
  role: string,
) => {
  await addDoc(collection(db, 'meetings', meetingId, `${role}Candidates`), {
    candidate: JSON.stringify(candidate),
  });
};

// Real-time requests listener — MeetingRequestsScreen ke liye
export const listenMeetingRequests = (
  meetingId: string,
  callback: (requests: any[]) => void,
) => {
  return onSnapshot(
    collection(db, 'meetings', meetingId, 'requests'),
    snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(data);
    },
  );
};

// Participant ko meeting mein register karo
export const registerParticipant = async (
  meetingId: string,
  userId: string,
  userEmail: string,
  name: string,
) => {
  await setDoc(doc(db, 'meetings', meetingId, 'participants', userId), {
    userId,
    name,
    userEmail,
    joinedAt: serverTimestamp(),
  });
};

// Saare participants ki real-time list lo
export const listenParticipants = (
  meetingId: string,
  callback: (participants: any[]) => void,
) => {
  return onSnapshot(
    collection(db, 'meetings', meetingId, 'participants'),
    snapshot => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    },
  );
};

// Kisi specific pair ke beech signaling data save karo
export const saveSignal = async (
  meetingId: string,
  fromId: string,
  toId: string,
  data: any,
) => {
  if (data.ice) {
    await addDoc(collection(db, 'meetings', meetingId, 'iceCandidates'), {
      ice: data.ice,
      from: fromId,
      to: toId,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      doc(db, 'meetings', meetingId, 'signals', `${fromId}_${toId}`),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
};

// Apne liye aane wale signals suno
export const listenSignals = (
  meetingId: string,
  myId: string,
  callback: (fromId: string, data: any) => void,
) => {
  const unsubSdp = onSnapshot(
    collection(db, 'meetings', meetingId, 'signals'),
    snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const key = change.doc.id;
          const [fromId, toId] = key.split('_');
          if (toId === myId) {
            callback(fromId, change.doc.data());
          }
        }
      });
    },
  );

  const unsubIce = onSnapshot(
    collection(db, 'meetings', meetingId, 'iceCandidates' ),
    snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.to === myId) {
            callback(data.from, { ice: data.ice });
          }
        }
      });
    },
  );

  return () => {
    unsubSdp();
    unsubIce();
  };
};
