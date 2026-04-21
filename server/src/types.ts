export interface Room {
  id: string;
  name: string;
  type: 'room' | 'dm';
  is_private: number;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  room_id: string;
  username: string;
  avatar_id: number;
  content: string;
  type: 'user' | 'system';
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  forwarded: number;
  reply_to_id: number | null;
  reply_to_content: string | null;
  reply_to_username: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
}
