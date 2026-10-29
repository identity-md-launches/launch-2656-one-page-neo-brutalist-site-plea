import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Optional external install keeps this build usable in restricted workspaces.
export const toolRoot = process.env.PLEA_TOOLS ? resolve(process.env.PLEA_TOOLS) : process.cwd();
export const requireTool = createRequire(resolve(toolRoot, 'package.json'));
