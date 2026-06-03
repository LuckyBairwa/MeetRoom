export interface Meeting {
  meetingId: string;
  hostId: string;
  hostEmail: string;
  status: 'active' | 'ended';
  createdAt: number;
}