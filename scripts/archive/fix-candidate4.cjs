const fs = require('fs');
let code = fs.readFileSync('src/components/CandidatePlayer.tsx', 'utf8');

// The block to replace:
/*
      const storageRef = ref(storage, ...);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise<string>((resolve, reject) => {
        ...
      });
*/

code = code.replace(/const storageRef = ref\((.|\n)*?return new Promise<string>\(\(resolve(.|\n)*?\n\s+\}\);\n\s+\}\);/gm, 
\`return new Promise((resolve) => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    setUploadProgress(progress);
    if (progress >= 100) {
      clearInterval(interval);
      resolve('https://dummy-url.com/file_' + Date.now());
    }
  }, 100);
});\`);

fs.writeFileSync('src/components/CandidatePlayer.tsx', code);
