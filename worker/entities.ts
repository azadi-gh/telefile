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
  static seedData: readonly Folder[] = [
    { id: 'f1', name: 'Documents', createdAt: Date.now() - 86400000 },
    { id: 'f2', name: 'Images', createdAt: Date.now() - 172800000 },
    { id: 'f3', name: 'Misc', createdAt: Date.now() }
  ];
}
// FILE ENTITY
export class FileEntity extends IndexedEntity<File> {
  static readonly entityName = "file";
  static readonly indexName = "files";
  static readonly initialState: File = { id: "", name: "", size: 0, mime: "", createdAt: 0 };
  static seedData: readonly File[] = [
    { id: 'file1', name: 'report.txt', folderId: 'f1', size: 1024, mime: 'text/plain', createdAt: Date.now() - 10000, content: btoa('This is a sample text file for the TeleFile application demo. It demonstrates text file previews.') },
    { id: 'file2', name: 'vacation-photo.jpg', folderId: 'f2', size: 204800, mime: 'image/jpeg', createdAt: Date.now() - 20000, telegram: { file_id: 'mock_tg_id_1' } },
    { id: 'file3', name: 'project-archive.zip', folderId: 'f1', size: 1500000, mime: 'application/zip', createdAt: Date.now() - 30000 },
    { id: 'file4', name: 'logo-design.svg', folderId: 'f2', size: 15360, mime: 'image/svg+xml', createdAt: Date.now() - 40000, content: btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" /></svg>') },
    { id: 'file5', name: 'meeting-notes.md', folderId: null, size: 2048, mime: 'text/markdown', createdAt: Date.now() - 50000, content: btoa('# Meeting Notes\n\n- Discuss project timeline\n- Review Q3 budget') },
    { id: 'file6', name: 'audio-clip.mp3', folderId: 'f3', size: 800000, mime: 'audio/mpeg', createdAt: Date.now() - 60000 },
  ];
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
  static seedData: readonly AppSettings[] = [{ id: 'app', mockMode: true }];
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