import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
let count = 0;
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'node_modules') continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) await scan(path);
    else if (path.endsWith('.js')) { new vm.Script(await readFile(path, 'utf8'), { filename: path }); count++; }
  }
}
await scan('.');
console.log(`Syntax OK: ${count} JavaScript files`);
