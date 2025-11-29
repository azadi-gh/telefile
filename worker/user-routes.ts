import { Hono } from "hono";
import type { Env } from './core-utils';
import { FolderEntity, FileEntity, AppSettingsEntity, UserEntity, ChatBoardEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { AppSettings, File as TeleFile } from "@shared/types";
// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- TeleFile Routes ---
  // FOLDERS
  app.get('/api/folders', async (c) => {
    const { items } = await FolderEntity.list(c.env);
    return ok(c, items);
  });
  app.post('/api/folders', async (c) => {
    const { name } = await c.req.json<{ name?: string }>();
    if (!isStr(name)) return bad(c, 'Folder name is required');
    const folder = await FolderEntity.create(c.env, { id: crypto.randomUUID(), name, createdAt: Date.now() });
    return ok(c, folder);
  });
  app.delete('/api/folders/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await FolderEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // FILES
  app.get('/api/files', async (c) => {
    const folderId = c.req.query('folderId');
    const { items } = await FileEntity.list(c.env);
    const filtered = folderId ? items.filter(f => f.folderId === folderId) : items.filter(f => !f.folderId);
    return ok(c, filtered);
  });
  app.get('/api/files/:id', async (c) => {
    const id = c.req.param('id');
    const file = new FileEntity(c.env, id);
    if (!(await file.exists())) return notFound(c, 'File not found');
    return ok(c, await file.getState());
  });
  app.delete('/api/files/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await FileEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // UPLOAD
  app.post('/api/upload', async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as unknown as Blob;
      const folderId = formData.get('folderId') as string | null;
      if (!file) return bad(c, 'File is required');
      if (file.size > 2 * 1024 * 1024) return bad(c, 'File size exceeds 2MB demo limit.');
      const fileId = crypto.randomUUID();
      const fileBuffer = await file.arrayBuffer();
      const base64Content = arrayBufferToBase64(fileBuffer);
      const fileData: TeleFile = {
        id: fileId,
        name: file.name,
        folderId: folderId && folderId !== 'null' ? folderId : null,
        size: file.size,
        mime: file.type,
        createdAt: Date.now(),
      };
      const fileEntity = new FileEntity(c.env, fileId);
      await fileEntity.save(fileData);
      await fileEntity.saveContent(base64Content);
      const settingsEntity = new AppSettingsEntity(c.env, 'app');
      const settings = await settingsEntity.getState();
      if (settings.botToken) {
        const tgFormData = new FormData();
        tgFormData.append('document', file, file.name);
        const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendDocument`, {
          method: 'POST',
          body: tgFormData,
        });
        if (res.ok) {
          const tgRes = await res.json<{ ok: boolean, result?: { document?: { file_id: string, file_name?: string } } }>();
          if (tgRes.ok && tgRes.result?.document) {
            await fileEntity.markAsForwarded(tgRes.result.document.file_id, tgRes.result.document.file_name);
          }
        }
      }
      return ok(c, await fileEntity.getState());
    } catch (e) {
      console.error('Upload failed:', e);
      return bad(c, 'Upload failed. Please try again.');
    }
  });
  // SETTINGS
  app.get('/api/settings', async (c) => {
    const settings = new AppSettingsEntity(c.env, 'app');
    return ok(c, await settings.getState());
  });
  app.post('/api/settings', async (c) => {
    const body = await c.req.json<Partial<AppSettings>>();
    const settings = new AppSettingsEntity(c.env, 'app');
    await settings.patch({ botToken: body.botToken, mockMode: body.mockMode });
    return ok(c, await settings.getState());
  });
  // --- Template Routes Below ---
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
  });
  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });
  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });
}