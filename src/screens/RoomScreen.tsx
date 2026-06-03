import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCView,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  registerParticipant,
  listenParticipants,
  saveSignal,
  listenSignals,
  addIceCandidate,
} from '../services/meetingService';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RefreshCcw,
} from 'lucide-react-native';
import IncallManager from 'react-native-incall-manager';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const RoomScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { meetingId, role } = route.params;

  const myId = auth.currentUser?.uid!;
  const localStream = useRef<any>(null);
  const peers = useRef<{ [userId: string]: RTCPeerConnection }>({});

  const [localStreamState, setLocalStreamState] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    { userId: string; stream: any }[]
  >([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  // Naya participant ke saath peer connection banao
  const createPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection(configuration);

    // Apni tracks daal do
    localStream.current?.getTracks().forEach((track: any) => {
      peer.addTrack(track, localStream.current);
    });

    // Remote stream receive karo
    (peer as any).ontrack = (event: any) => {
      setRemoteStreams(prev => {
        const exists = prev.find(s => s.userId === remoteUserId);
        if (exists) return prev; // duplicate avoid
        return [...prev, { userId: remoteUserId, stream: event.streams[0] }];
      });
    };

    // ICE candidate Firebase pe bhejo
    (peer as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        saveSignal(meetingId, myId, remoteUserId, {
          ice: JSON.stringify(event.candidate.toJSON()),
          from: myId,
        });
      }
    };

    peers.current[remoteUserId] = peer;
    return peer;
  };

  const setupCall = async () => {
    // 1. Speaker on
    IncallManager.start({ media: 'video' });
    IncallManager.setSpeakerphoneOn(true);
    IncallManager.setForceSpeakerphoneOn(true);

    // 2. Local stream
    const stream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } as any,
      video: { facingMode: 'user' },
    });
    localStream.current = stream;
    setLocalStreamState(stream);

    // 3. Apne aap ko register karo
    await registerParticipant(
      meetingId,
      myId,
      auth.currentUser?.email || '',
      auth.currentUser?.displayName || '',
    );

    // 4. Existing participants se connect karo
    const unsubParticipants = listenParticipants(
      meetingId,
      async participants => {
        for (const p of participants) {
          if (p.userId === myId) continue; // khud ko skip karo
          if (peers.current[p.userId]) continue; // already connected

          // Main naya hun — main offer dunga
          const peer = createPeerConnection(p.userId);
          const offer = await peer.createOffer({});
          await peer.setLocalDescription(offer);
          await saveSignal(meetingId, myId, p.userId, {
            offer: JSON.stringify(offer),
            from: myId,
          });
        }
      },
    );

    // 5. Apne liye aane wale signals suno
    const unsubSignals = listenSignals(
      meetingId,
      myId,
      async (fromId, data) => {
        // Offer aaya — answer do
        if (data.offer && !peers.current[fromId]?.remoteDescription) {
          const peer = createPeerConnection(fromId);
          await peer.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(data.offer)),
          );
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await saveSignal(meetingId, myId, fromId, {
            answer: JSON.stringify(answer),
            from: myId,
          });
        }

        // Answer aaya — set karo
        if (
          data.answer &&
          peers.current[fromId] &&
          !peers.current[fromId].remoteDescription
        ) {
          await peers.current[fromId].setRemoteDescription(
            new RTCSessionDescription(JSON.parse(data.answer)),
          );
        }

        // ICE candidate aaya — add karo
        if (data.ice && peers.current[fromId]) {
          try {
            await peers.current[fromId].addIceCandidate(
              new RTCIceCandidate(JSON.parse(data.ice)),
            );
          } catch (e) {
            console.log('ICE error:', e);
          }
        }
      },
    );

    return () => {
      unsubParticipants();
      unsubSignals();
    };
  };

  const cleanupCall = () => {
    localStream.current?.getTracks().forEach((t: any) => t.stop());
    Object.values(peers.current).forEach(p => p.close());
    peers.current = {};
    IncallManager.stop();
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    setupCall().then(fn => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
      cleanupCall();
    };
  }, []);

  const toggleMute = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  };

  const toggleCamera = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  };

  const flipCamera = async () => {
    const newFacing = facing === 'front' ? 'back' : 'front';
    setFacing(newFacing);
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: newFacing === 'front' ? 'user' : 'environment' },
    });
    const videoTrack = stream.getVideoTracks()[0];
    Object.values(peers.current).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) sender.replaceTrack(videoTrack);
    });
    localStream.current = stream;
    setLocalStreamState(stream);
  };

  const endCall = () => {
    cleanupCall();
    navigation.goBack();
  };

  // Remote streams ka grid banao
  const renderRemoteStreams = () => {
    if (remoteStreams.length === 0) {
      return (
        <View style={styles.waitingBox}>
          <Text style={styles.waiting}>⏳ Waiting for others...</Text>
        </View>
      );
    }

    // 1 remote = fullscreen, 2+ = grid
    if (remoteStreams.length === 1) {
      return (
        <RTCView
          streamURL={remoteStreams[0].stream.toURL()}
          style={styles.remoteFull}
          objectFit="cover"
        />
      );
    }

    return (
      <View style={styles.remoteGrid}>
        {/* {remoteStreams.map(({ userId, stream }) => (
          <RTCView
            key={userId}
            streamURL={stream.toURL()}
            style={styles.remoteGridItem}
            objectFit="cover"
          />
        ))} */}
        {remoteStreams.map(({ userId, stream }: any) => (
          <View key={userId} style={styles.remoteGridItem}>
            {stream?.getVideoTracks?.()[0]?.enabled ? (
              <RTCView
                streamURL={stream.toURL()}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
              />
            ) : (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {stream.userName || 'User'}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {role === 'host' && (
        <TouchableOpacity
          style={styles.requestsBtn}
          onPress={() => navigation.navigate('MeetingRequests', { meetingId })}
        >
          <Text style={styles.requestsBtnText}>👥 Requests</Text>
        </TouchableOpacity>
      )}

      {renderRemoteStreams()}

      {/* Local PiP */}
      {localStreamState && (
        <RTCView
          streamURL={localStreamState.toURL()}
          style={styles.local}
          objectFit="cover"
          mirror={facing === 'front'}
        />
      )}

      {/* Participant count */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>👥 {remoteStreams.length + 1}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={toggleMute}>
          {isMuted ? (
            <MicOff size={24} color="#fff" />
          ) : (
            <Mic size={24} color="#fff" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={toggleCamera}>
          {isCameraOff ? (
            <VideoOff size={24} color="#fff" />
          ) : (
            <Video size={24} color="#fff" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={flipCamera}>
          <RefreshCcw size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={endCall}>
          <PhoneOff size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RoomScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // paddingTop: (StatusBar.currentHeight || 0) + 10,
  },
  requestsBtn: {
    position: 'absolute',
    top: 25,
    left: 15,
    zIndex: 10,
    backgroundColor: '#A855F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  requestsBtnText: { color: '#fff', fontWeight: '700' },
  remoteFull: { flex: 1, backgroundColor: '#111' },
  remoteGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  remoteGridItem: {
    width: '50%',
    aspectRatio: 3 / 4,
    backgroundColor: '#111',
  },
  waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waiting: { color: 'gray', fontSize: 16 },
  local: {
    width: 110,
    height: 160,
    position: 'absolute',
    top: 60,
    right: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A855F7',
  },

  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },

  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  countBadge: {
    position: 'absolute',
    top: 25,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#111',
  },
  btn: {
    backgroundColor: '#222',
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtn: { backgroundColor: '#FF3B30' },
});
