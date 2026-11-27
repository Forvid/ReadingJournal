import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const directories = ['', 'assets/'];
const paths = [];

for (const directory of directories) {
  const files = await readdir(new URL(directory, output), { withFileTypes: true });
  paths.push(...files.filter((file) => file.isFile() && file.name !== 'sw.js')
    .map((file) => directory + file.name));
}
paths.sort();

const template = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(template);

for (const path of paths) {
  hash.update(path);
  hash.update(await readFile(new URL(path, output)));
}

const version = hash.digest('hex').slice(0, 16);
const config = 'const VERSION = ' + JSON.stringify(version) + ';\n'
  + 'const SHELL_FILES = ' + JSON.stringify(paths) + ';\n';
await writeFile(new URL('sw.js', output), config + template);
