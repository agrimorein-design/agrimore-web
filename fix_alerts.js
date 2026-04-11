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
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Add Alert and Platform import if missing but window is used
  if ((content.includes('window.confirm') || content.includes('window.alert')) && !content.includes("from 'react-native'")) {
    // If react-native is completely missing
    content = `import { Platform, Alert } from 'react-native';\n` + content;
  } else if ((content.includes('window.confirm') || content.includes('window.alert')) && content.includes("from 'react-native'")) {
    if (!content.includes('Alert')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"];/, (match, p1) => {
        return `import { ${p1.trim()}, Alert, Platform } from 'react-native';`;
      });
    }
  }

  // Replace single line: if (window.confirm('...')) doSomething();
  // We'll replace window.alert with Alert.alert
  if (content.includes('window.alert')) {
    content = content.replace(/window\.alert\((.*?)\)/g, "Platform.OS === 'web' ? window.alert($1) : Alert.alert('Notice', $1)");
    changed = true;
  }

  // Note: changing window.confirm automatically is very risky if it wraps a block. 
  // e.g. if (window.confirm("...")) { ... }
  // Since it's complex, we handle the most common patterns in this codebase:
  
  // Pattern 1: if (window.confirm(msg)) doApprove();
  const confirmRegex1 = /if\s*\(\s*window\.confirm\(([^)]+)\)\s*\)\s*([^{}\n]+;)/g;
  if (confirmRegex1.test(content)) {
    content = content.replace(confirmRegex1, "if (Platform.OS === 'web') { if (window.confirm($1)) $2 } else { Alert.alert('Confirm', $1, [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress: () => { $2 } }]); }");
    changed = true;
  }

  // Pattern 2: if (window.confirm(msg)) { ... } 
  // Let's use a simpler heuristic for blocks: 
  // const confirmResult = window.confirm('Are you sure you want to log out?');
  const confirmRegex2 = /const\s+([^=\s]+)\s*=\s*window\.confirm\(([^)]+)\);/g;
  if (confirmRegex2.test(content)) {
    // This requires manual fix if it happens, but let's see. 
    // In Profile.tsx and AdminSettings.tsx: 
    // const confirmResult = window.confirm(...); if (confirmResult) { ... }
    
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
  }
}

console.log(`Replaced window objects in ${changedFiles} files.`);
