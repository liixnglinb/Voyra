import { readFile, writeFile } from 'node:fs/promises';
import { buildSpecMarkdown } from '../src/data/software-ui-spec.js';
const target = new URL('../docs/voyra-software-ui-spec.md',import.meta.url);
const content = buildSpecMarkdown();
if (process.argv.includes('--check')) {
  const actual = await readFile(target,'utf8');
  if (actual.replace(/\r\n/g,'\n') !== content) throw new Error('Design spec is stale. Run npm run ui:spec.');
  console.log('Design spec matches the website data.');
} else {
  // A mechanical export of the public specification, not a new hand-maintained copy.
  await writeFile(target,content,'utf8');
  console.log('Generated docs/voyra-software-ui-spec.md');
}
