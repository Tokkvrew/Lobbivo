const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const jsFiles = fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => ({ name: f, code: fs.readFileSync('js/' + f, 'utf8') }));
const combinedJs = jsFiles.map(j => j.code).join('\n');

const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const missing = [];
let match;
while ((match = idRegex.exec(combinedJs)) !== null) {
  const id = match[1];
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    // Check if dynamically created in JS
    if (!combinedJs.includes(`id="${id}"`) && !combinedJs.includes(`id='${id}'`) && !combinedJs.includes(`id = '${id}'`) && !combinedJs.includes(`id = "${id}"`)) {
      missing.push(id);
    }
  }
}
console.log('Unique missing IDs in HTML/Dynamic JS:', [...new Set(missing)]);

const handlerRegex = /on(?:click|change|submit)=["']([a-zA-Z0-9_$.]+)\(/g;
const missingHandlers = [];
while ((match = handlerRegex.exec(html)) !== null) {
  const fn = match[1];
  if (!combinedJs.includes(`function ${fn}`) && !combinedJs.includes(`${fn} =`) && !combinedJs.includes(`${fn}=`) && !combinedJs.includes(`${fn}:`)) {
    missingHandlers.push(fn);
  }
}
console.log('Missing inline handlers:', [...new Set(missingHandlers)]);
