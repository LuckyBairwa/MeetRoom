export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  JoinMeeting: undefined;
  MeetingRequests: {
    meetingId: string;
  };
  WaitingRoom: {
    meetingId: string;
    userId?: string;
  };
  Room: {
  meetingId: string;
  role: 'host' | 'guest';
};
};
