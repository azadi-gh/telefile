/**
 * TeleFile Entities: Folder, File, AppSettings
 * Also includes original template entities for reference.
 */
import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, Folder, File, AppSettings } from "@shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS } from "@shared/mock-data";
// FOLDER ENTITY
export class FolderEntity extends IndexedEntity<Folder> {
  static readonly entityName = "folder";
  static readonly indexName = "folders";
  static readonly initialState: Folder = { id: "", name: "", createdAt: 0 };
}
// FILE ENTITY
export class FileEntity extends IndexedEntity<File> {
  static readonly entityName = "file";
  static readonly indexName = "files";
  static readonly initialState: File = { id: "", name: "", size: 0, mime: "", createdAt: 0 };
  async saveContent(base64: string): Promise<void> {
    await this.patch({ content: base64 });
  }
  async getContent(): Promise<string | null> {
    const state = await this.getState();
    return state.content ?? null;
  }
  async markAsForwarded(file_id: string, file_name?: string): Promise<void> {
    await this.patch({ telegram: { file_id, file_name } });
  }
}
// APP SETTINGS ENTITY (Singleton)
export class AppSettingsEntity extends IndexedEntity<AppSettings> {
  static readonly entityName = "settings";
  static readonly indexName = "settings"; // Not really used for a singleton
  static readonly initialState: AppSettings = { id: "app", mockMode: true };
}
// --- Template Entities Below ---
// USER ENTITY: one DO instance per user
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "" };
  static seedData = MOCK_USERS;
}
// CHAT BOARD ENTITY: one DO instance per chat board, stores its own messages
export type ChatBoardState = Chat & { messages: ChatMessage[] };
const SEED_CHAT_BOARDS: ChatBoardState[] = MOCK_CHATS.map(c => ({
  ...c,
  messages: MOCK_CHAT_MESSAGES.filter(m => m.chatId === c.id),
}));
export class ChatBoardEntity extends IndexedEntity<ChatBoardState> {
  static readonly entityName = "chat";
  static readonly indexName = "chats";
  static readonly initialState: ChatBoardState = { id: "", title: "", messages: [] };
  static seedData = SEED_CHAT_BOARDS;
  async listMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.getState();
    return messages;
  }
  async sendMessage(userId: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = { id: crypto.randomUUID(), chatId: this.id, userId, text, ts: Date.now() };
    await this.mutate(s => ({ ...s, messages: [...s.messages, msg] }));
    return msg;
  }
}