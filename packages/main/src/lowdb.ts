import { app } from 'electron';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'node:path';
import fs from 'node:fs';

const folderPath = path.join(app.getPath('userData'), 'lowdb');
const dbFilePath = path.join(folderPath, 'db.json');

const dirPath = path.dirname(dbFilePath);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const adapter = new FileSync(path.join(folderPath, 'db.json'));
const lowDb = low(adapter);

lowDb.defaults({ settings: { chromeExecutablePath: '', runFlag: false } }).write();

export { lowDb };
