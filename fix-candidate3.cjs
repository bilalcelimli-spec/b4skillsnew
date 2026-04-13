const fs = require('fs');
let code = fs.readFileSync('src/components/CandidatePlayer.tsx', 'utf8');

// Replace any leftover ref/upload stuff with the dummy promise
code = code.replace(/const storageRef = ref\([\s\S]*?;\n\s*const uploadTask = uploadBytesResumable\([\s\S]*?return new Promise<\w+>\(\(resolve, reject\) => \{[\s\S]*?uploadTask\.on\([\s\S]*?getDownloadURL\([\s\S]*?resolve\(url\);[\s\S]*?\}\);\n\s*\}\);/g, `
return new Promise((resolve) => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    setUploadProgress(progress);
    if (progress >= 100) {
      clearInterval(interval);
      resolve('https://dummy-url.com/file_' + Date.now());
    }
  }, 100);
});
`);

code = code.replace(/serverTimestamp\(\)/g, "new Date().toISOString()");

fs.writeFileSync('src/components/CandidatePlayer.tsx', code);
