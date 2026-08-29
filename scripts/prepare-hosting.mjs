import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist', 'front-sga-fenix');
const browserDir = join(dist, 'browser');
const csr = join(browserDir, 'index.csr.html');

if (!existsSync(csr)) {
  console.error('index.csr.html no encontrado en', browserDir);
  process.exit(1);
}

copyFileSync(csr, join(browserDir, 'index.html'));
console.log('index.csr.html -> index.html copiado en', browserDir);