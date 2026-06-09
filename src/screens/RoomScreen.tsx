import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  InteractionManager,
} from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCView,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import { useRoute, useNavigation } from '@react-navigation/native';
import { auth } from '../config/firebase';
import {
  registerParticipant,
  listenParticipants,
  saveSignal,
  listenSignals,
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
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'f474671da0a33ef72f19fec3',
      credential: '7SglLqB4iEJNckNn',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: 'f474671da0a33ef72f19fec3',
      credential: '7SglLqB4iEJNckNn',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'f474671da0a33ef72f19fec3',
      credential: '7SglLqB4iEJNckNn',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: 'f474671da0a33ef72f19fec3',
      credential: '7SglLqB4iEJNckNn',
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
  const offerPending = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<{ [userId: string]: any[] }>({});
  const appState = useRef(AppState.currentState);
  const setupDone = useRef(false);
  const cleanupFns = useRef<(() => void)[]>([]);

  const [participants, setParticipants] = useState<{
    [userId: string]: string;
  }>({});
  const [localStreamState, setLocalStreamState] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    { userId: string; stream: any }[]
  >([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  const createPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    // ✅ FIX: Agar peer already exists toh close karke naya banao
    if (peers.current[remoteUserId]) {
      peers.current[remoteUserId].close();
      delete peers.current[remoteUserId];
    }

    const peer = new RTCPeerConnection(configuration);

    // ✅ FIX: Tracks add karo peer creation ke turant baad
    if (localStream.current) {
      localStream.current.getTracks().forEach((track: any) => {
        peer.addTrack(track, localStream.current);
      });
    }

    peer.addEventListener('track', (event: any) => {
      console.log(
        `[TRACK ${remoteUserId}] received streams:`,
        event.streams?.length,
      );
      const remoteStream = event.streams?.[0];
      if (!remoteStream) return;

      setRemoteStreams(prev => {
        const exists = prev.find(s => s.userId === remoteUserId);
        if (exists) {
          return prev.map(s =>
            s.userId === remoteUserId ? { ...s, stream: remoteStream } : s,
          );
        }
        return [...prev, { userId: remoteUserId, stream: remoteStream }];
      });
    });

    peer.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        console.log(`[ICE ${remoteUserId}] Sending candidate`);
        saveSignal(meetingId, myId, remoteUserId, {
          ice: JSON.stringify(event.candidate.toJSON()),
          from: myId,
        });
      }
    });

    peer.addEventListener('connectionstatechange', () => {
      console.log(
        `[PEER ${remoteUserId}] connectionState:`,
        peer.connectionState,
      );
      if (peer.connectionState === 'failed') {
        console.log(`[PEER ${remoteUserId}] Failed — restarting ICE`);
        peer.restartIce();
      }
      if (
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'closed'
      ) {
        setRemoteStreams(prev => prev.filter(s => s.userId !== remoteUserId));
        delete peers.current[remoteUserId];
        offerPending.current.delete(remoteUserId);
      }
    });

    peer.addEventListener('iceconnectionstatechange', () => {
      console.log(
        `[ICE ${remoteUserId}] iceConnectionState:`,
        peer.iceConnectionState,
      );
    });

    peers.current[remoteUserId] = peer;
    return peer;
  };

  // ✅ FIX: ICE candidates ko safely add karne ka helper
  const drainIceQueue = async (peer: RTCPeerConnection, fromId: string) => {
    const queue = iceCandidateQueue.current[fromId] || [];
    console.log(
      `[ICE DRAIN ${fromId}] Processing ${queue.length} queued candidates`,
    );
    for (const c of queue) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.log(`[ICE DRAIN ${fromId}] Error:`, e);
      }
    }
    iceCandidateQueue.current[fromId] = [];
  };

  const setupCall = async () => {
    try {
      IncallManager.start({ media: 'video', auto: false, ringback: '' });
      IncallManager.setSpeakerphoneOn(true);
    } catch (e) {
      console.log('[INCALL] Start error:', e);
    }

    await new Promise<void>(resolve => setTimeout(resolve, 1500));

    try {
      IncallManager.setSpeakerphoneOn(true);
      IncallManager.setForceSpeakerphoneOn(true);
    } catch (e) {
      console.log('[INCALL] Speaker error:', e);
    }

    // ✅ FIX: getUserMedia with retry logic
    let stream: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!stream && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[MEDIA] getUserMedia attempt ${attempts}`);
        stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } as any,
          video: { facingMode: 'user' },
        });
      } catch (mediaError: any) {
        console.log(`[MEDIA] Attempt ${attempts} failed:`, mediaError?.message);
        if (attempts < maxAttempts) {
          // Wait before retry
          await new Promise<void>(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('[MEDIA] All attempts failed');
          throw mediaError;
        }
      }
    }

    if (!stream) return;

    localStream.current = stream;
    setLocalStreamState(stream);

    // ✅ Audio tracks ensure enabled hain
    stream.getAudioTracks().forEach((track: any) => {
      track.enabled = true;
      console.log(
        '[MEDIA] Audio track enabled:',
        track.enabled,
        'id:',
        track.id,
      );
    });

    stream.getVideoTracks().forEach((track: any) => {
      track.enabled = true;
      console.log(
        '[MEDIA] Video track enabled:',
        track.enabled,
        'id:',
        track.id,
      );
    });

    await registerParticipant(
      meetingId,
      myId,
      auth.currentUser?.email || '',
      auth.currentUser?.displayName || '',
    );

    const unsubParticipants = listenParticipants(
      meetingId,
      async (parts: any[]) => {
        const nameMap: { [userId: string]: string } = {};
        parts.forEach((p: any) => {
          nameMap[p.userId] = p.name || p.userEmail || 'User';
        });
        setParticipants(nameMap);

        for (const p of parts) {
          if (p.userId === myId) continue;
          if (peers.current[p.userId]) continue;
          if (offerPending.current.has(p.userId)) continue;

          offerPending.current.add(p.userId);

          const shouldOffer = myId < p.userId;

          if (!shouldOffer) {
            console.log(`[OFFER] Waiting for offer from ${p.userId}`);
            createPeerConnection(p.userId);
            continue;
          }

          console.log(`[OFFER] Creating offer for ${p.userId}`);

          try {
            const peer = createPeerConnection(p.userId);
            const offer = await peer.createOffer({});
            await peer.setLocalDescription(offer);
            await saveSignal(meetingId, myId, p.userId, {
              offer: JSON.stringify(offer),
              from: myId,
            });
          } catch (e) {
            console.log(`[OFFER] Error for ${p.userId}:`, e);
            offerPending.current.delete(p.userId);
          }
        }
      },
    );

    const unsubSignals = listenSignals(
      meetingId,
      myId,
      async (fromId: string, data: any) => {
        try {
          if (data.offer) {
            if (
              peers.current[fromId] &&
              (peers.current[fromId].connectionState === 'connected' ||
                peers.current[fromId].connectionState === 'connecting')
            ) {
              console.log(
                `[SIGNAL] Already connecting/connected to ${fromId}, ignoring offer`,
              );
              return;
            }

            console.log(`[SIGNAL] Got offer from ${fromId}`);
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

            await drainIceQueue(peer, fromId);
          }

          
          if (data.answer) {
            const peer = peers.current[fromId];
            if (!peer) {
              console.log(`[SIGNAL] Answer received but no peer for ${fromId}`);
              return;
            }
            if (peer.remoteDescription) {
              console.log(`[SIGNAL] Duplicate answer from ${fromId}, ignoring`);
              return;
            }

            console.log(`[SIGNAL] Got answer from ${fromId}`);
            await peer.setRemoteDescription(
              new RTCSessionDescription(JSON.parse(data.answer)),
            );

            // Queued ICE candidates drain karo
            await drainIceQueue(peer, fromId);
          }

          // ✅ FIX: ICE candidate handle
          if (data.ice) {
            const candidate = JSON.parse(data.ice);
            const peer = peers.current[fromId];

            if (peer?.remoteDescription) {
              try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.log(`[ICE] Add error for ${fromId}:`, e);
              }
            } else {
              // Queue karo remote description set hone tak
              if (!iceCandidateQueue.current[fromId]) {
                iceCandidateQueue.current[fromId] = [];
              }
              iceCandidateQueue.current[fromId].push(candidate);
              console.log(
                `[ICE] Queued candidate for ${fromId}, queue size:`,
                iceCandidateQueue.current[fromId].length,
              );
            }
          }
        } catch (e) {
          console.log(`[SIGNAL] Handler error from ${fromId}:`, e);
        }
      },
    );

    cleanupFns.current = [unsubParticipants, unsubSignals];

    return () => {
      unsubParticipants();
      unsubSignals();
    };
  };

  const cleanupCall = () => {
    console.log('[CLEANUP] Cleaning up call');
    cleanupFns.current.forEach(fn => fn());
    cleanupFns.current = [];

    localStream.current?.getTracks().forEach((t: any) => {
      t.stop();
    });
    localStream.current = null;

    Object.values(peers.current).forEach(p => {
      try {
        p.close();
      } catch (e) {}
    });
    peers.current = {};
    offerPending.current.clear();
    iceCandidateQueue.current = {};

    try {
      IncallManager.setSpeakerphoneOn(false);
      IncallManager.setForceSpeakerphoneOn(false);
      IncallManager.stop();
    } catch (e) {
      console.log('[INCALL] Stop error:', e);
    }
  };

  // ✅ Pura useEffect replace karo
  useEffect(() => {
    let task: any;

    task = InteractionManager.runAfterInteractions(() => {
      const init = async () => {
        if (setupDone.current) return;
        setupDone.current = true;
        try {
          await setupCall();
        } catch (e) {
          console.log('[SETUP] Fatal error:', e);
        }
      };
      init();
    });

    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          if (!localStream.current) {
            console.log('[APPSTATE] Foreground — restarting call');
            setupDone.current = false;
            try {
              await setupCall();
            } catch (e) {
              console.log('[APPSTATE] Restart error:', e);
            }
          }
        }
        appState.current = nextState;
      },
    );

    return () => {
      task?.cancel();
      subscription.remove();
      cleanupCall();
    };
  }, []);

  const toggleMute = () => {
    const audioTracks = localStream.current?.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) return;
    const newMuted = !isMuted;
    audioTracks.forEach((track: any) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
  };

  const toggleCamera = () => {
    const videoTracks = localStream.current?.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) return;
    const newCameraOff = !isCameraOff;
    videoTracks.forEach((track: any) => {
      track.enabled = !newCameraOff;
    });
    setIsCameraOff(newCameraOff);
  };

  const flipCamera = async () => {
    try {
      const newFacing = facing === 'front' ? 'back' : 'front';
      const videoTrack = localStream.current?.getVideoTracks()[0];

      if (videoTrack && videoTrack._switchCamera) {
        videoTrack._switchCamera();
        setFacing(newFacing);
        return;
      }

      const newStream = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacing === 'front' ? 'user' : 'environment' },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      localStream.current?.getVideoTracks().forEach((t: any) => t.stop());

      Object.values(peers.current).forEach(peer => {
        const sender = peer
          .getSenders()
          .find((s: any) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      });

      localStream.current?.removeTrack(localStream.current.getVideoTracks()[0]);
      localStream.current?.addTrack(newVideoTrack);
      setLocalStreamState({ ...localStream.current });
      setFacing(newFacing);
    } catch (e) {
      console.log('[FLIP] Error:', e);
    }
  };

  const endCall = () => {
    cleanupCall();
    navigation.goBack();
  };

  const renderLocalTile = () => (
    <View style={styles.remoteGridItem}>
      {!isCameraOff && localStreamState ? (
        <RTCView
          streamURL={localStreamState.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={facing === 'front'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.avatarContainer]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {auth.currentUser?.displayName?.charAt(0).toUpperCase() || 'Y'}
            </Text>
          </View>
          <Text style={styles.avatarText}>
            {auth.currentUser?.displayName || 'You'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderRemoteStreams = () => {
    if (remoteStreams.length === 0) {
      return (
        <View style={styles.waitingBox}>
          <Text style={styles.waiting}>⏳ Waiting for others...</Text>
        </View>
      );
    }

    if (remoteStreams.length === 1) {
      const { userId, stream } = remoteStreams[0];
      const userName = participants[userId] || 'User';
      const videoEnabled = stream?.getVideoTracks?.()[0]?.enabled !== false;

      return (
        <View style={styles.remoteFull}>
          {videoEnabled ? (
            <RTCView
              streamURL={stream.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
            />
          ) : (
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.avatarText}>{userName}</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.remoteGrid}>
        {renderLocalTile()}
        {remoteStreams.map(({ userId, stream }) => {
          const videoEnabled = stream?.getVideoTracks?.()[0]?.enabled !== false;
          const userName = participants[userId] || 'User';
          return (
            <View key={userId} style={styles.remoteGridItem}>
              {videoEnabled ? (
                <RTCView
                  streamURL={stream.toURL()}
                  style={StyleSheet.absoluteFill}
                  objectFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.avatarContainer]}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.avatarText}>{userName}</Text>
                </View>
              )}
            </View>
          );
        })}
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
          <Text style={styles.requestsBtnText}>Requests</Text>
        </TouchableOpacity>
      )}

      {renderRemoteStreams()}

      {remoteStreams.length === 1 && (
        <View style={styles.local}>
          {!isCameraOff && localStreamState ? (
            <RTCView
              streamURL={localStreamState.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
              mirror={facing === 'front'}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.localAvatar]}>
              <Text style={styles.localAvatarText}>
                {auth.currentUser?.displayName?.charAt(0).toUpperCase() || 'Y'}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.countBadge}>
        <Text style={styles.countText}>👥 {remoteStreams.length + 1}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, isMuted && styles.btnActive]}
          onPress={toggleMute}
        >
          {isMuted ? (
            <MicOff size={24} color="#fff" />
          ) : (
            <Mic size={24} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, isCameraOff && styles.btnActive]}
          onPress={toggleCamera}
        >
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
  container: { flex: 1, backgroundColor: '#000' },
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
  remoteGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  remoteGridItem: { width: '50%', aspectRatio: 3 / 4, backgroundColor: '#111' },
  btnActive: { backgroundColor: '#A855F7' },
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
    overflow: 'hidden',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '800' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  localAvatar: {
    backgroundColor: '#2D1B4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localAvatarText: { color: '#A855F7', fontSize: 32, fontWeight: '800' },
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
