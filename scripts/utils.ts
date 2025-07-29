import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json';
import { execSync } from 'node:child_process';

//  __dirname is not defined in ES module scope
const filename = fileURLToPath(import.meta.url);
const newDirname = dirname(filename);
const PROJECT_ROOT = join(newDirname, '../../../');

export const r = (...args: string[]) => resolve(newDirname, '..', ...args).replace(/\\/g, '/');

export function getExternals() {
  return Object.keys(pkg.dependencies);
}

export function isDevBranch() {
  const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const isDev = branchName !== 'main';

  return isDev;
}
