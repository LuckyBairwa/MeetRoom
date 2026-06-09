import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';

import {
  saveOffer,
  saveAnswer,
  listenMeeting,
  addIceCandidate,
} from './meetingService';

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export const createPeer = () => {
  return new RTCPeerConnection(configuration);
};

export const createLocalStream = async (): Promise<MediaStream> => {
  return await mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
};

export const createOffer = async (pc: RTCPeerConnection, meetingId: string) => {
  const offer = await pc.createOffer();

  await pc.setLocalDescription(offer);

  await saveOffer(meetingId, offer);
};

export const createAnswer = async (
  pc: RTCPeerConnection,
  meetingId: string,
  offerData: string,
) => {
  await pc.setRemoteDescription(
    new RTCSessionDescription(JSON.parse(offerData)),
  );

  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  await saveAnswer(meetingId, answer);
};

export const listenAnswer = (pc: RTCPeerConnection, meetingId: string) => {
  return listenMeeting(meetingId, async (data: Record<string, any>) => {
    if (data?.answer && !pc.remoteDescription) {
      await pc.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(data.answer)),
      );
    }
  });
};

export const setupIceCandidate = (
  pc: RTCPeerConnection,
  meetingId: string,
  role: string,
) => {
  (pc as any).onicecandidate = async (event: any) => {
    if (event.candidate) {
      await addIceCandidate(meetingId, event.candidate, role);
    }
  };
};
