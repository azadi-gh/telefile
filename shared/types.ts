export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// TeleFile specific types
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}
export interface File {
  id: string;
  name: string;
  folderId?: string | null;
  size: number;
  mime: string;
  createdAt: number;
  content?: string; // base64 for small files in demo
  telegram?: {
    file_id: string;
    file_name?: string;
  } | null;
}
export interface AppSettings {
  id: 'app'; // Singleton ID
  botToken?: string;
  channelId?: string;
  mockMode?: boolean;
}
// Minimal real-world chat example types (shared by frontend and worker) - from template
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}