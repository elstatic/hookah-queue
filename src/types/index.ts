export interface Room {
  id: string;
  name: string;
  owner_token: string;
  created_at: number;
  updated_at: number;
  is_active: number;
}

export interface Participant {
  id: string;
  room_id: string;
  name: string;
  user_token: string;
  position: number;
  status: "waiting" | "active" | "done";
  joined_at: number;
  activated_at: number | null;
}

// Socket.io events: Client → Server
export interface ClientToServerEvents {
  "room:join": (data: {
    roomId: string;
    ownerToken?: string;
    participantToken?: string;
  }) => void;
  "queue:join": (data: { roomId: string; name: string }) => void;
  "queue:leave": (data: {
    roomId: string;
    participantToken: string;
  }) => void;
  "queue:advance": (data: { roomId: string; ownerToken: string }) => void;
  "queue:remove": (data: {
    roomId: string;
    ownerToken: string;
    participantId: string;
  }) => void;
  "queue:reorder": (data: {
    roomId: string;
    ownerToken: string;
    orderedIds: string[];
  }) => void;
  "room:close": (data: { roomId: string; ownerToken: string }) => void;
}

// Socket.io events: Server → Client
export interface ServerToClientEvents {
  "queue:updated": (data: QueueState) => void;
  "room:error": (data: { message: string }) => void;
  "queue:joined": (data: { participantToken: string; participantId: string }) => void;
  "room:closed": () => void;
}

export interface QueueState {
  participants: Participant[];
}

export interface RoomIdentity {
  ownerToken?: string;
  participantToken?: string;
  participantId?: string;
  name?: string;
}
