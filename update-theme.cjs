const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

const regex = /const T = \{[\s\S]*?\};/g;

const newT = `const T = {
  violet:'#8A2BE2', slate:'#1E1E24', teal:'#00F0FF', coral:'#FF3366',
  amber:'#F59E0B', sky:'#3B82F6', emerald:'#2ECC71', rose:'#FF3366',
  bg:'#15151A', surface:'#1E1E24', border:'#2C2C35', muted:'#A0A0A5',
  text:'#FDFBF7', textSec:'#D1D1D6', beige50:'#0A0A0C', beige100:'#121216', beige200:'#1A1A1E',
};`;

let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    const updated = content.replace(regex, newT);
    fs.writeFileSync(file, updated, 'utf8');
    count++;
  }
});

console.log(`Updated T constant in ${count} files.`);
