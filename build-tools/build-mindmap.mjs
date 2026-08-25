import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const root = new URL('../public/mindmap-app/', import.meta.url);

async function minify(sourceName, outputName, loader) {
  const source = await readFile(new URL(sourceName, root), 'utf8');
  const result = await transform(source, {
    loader,
    charset: 'utf8',
    legalComments: 'none',
    minify: true,
    target: 'es2020',
  });
  await writeFile(new URL(outputName, root), result.code, 'utf8');
}

await Promise.all([
  minify('mindmap.css', 'mindmap.min.css', 'css'),
  minify('mindmap-bridge.js', 'mindmap-bridge.min.js', 'js'),
  minify('mindmap-app.js', 'mindmap-app.min.js', 'js'),
]);
