import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireTool } from './toolchain.mjs';

const folder = await mkdtemp(join(tmpdir(), 'plea-tsc-'));
try {
  const config = {
    extends: resolve('tsconfig.json'),
    compilerOptions: {
      paths: { viem: [dirname(requireTool.resolve('viem/package.json'))], 'viem/*': [join(dirname(requireTool.resolve('viem/package.json')), '*')] },
    },
    include: [resolve('src/**/*.ts')],
  };
  await writeFile(join(folder, 'tsconfig.json'), JSON.stringify(config));
  const compiler = join(dirname(requireTool.resolve('typescript/package.json')), 'bin/tsc');
  const result = spawnSync(process.execPath, [compiler, '--noEmit', '-p', join(folder, 'tsconfig.json')], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { await rm(folder, { recursive: true, force: true }); }
