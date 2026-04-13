import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createMutex } from './mutex.js';

const mutex = createMutex();

/**
 * Read a JSON file, returning a default value if the file does not exist.
 */
export async function readJson(filePath, defaultValue = []) {
  if (!existsSync(filePath)) return defaultValue;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Write a value as JSON to a file, using the mutex to prevent concurrent
 * write corruption.
 */
export async function writeJson(filePath, data) {
  const release = await mutex.acquire();
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } finally {
    release();
  }
}
