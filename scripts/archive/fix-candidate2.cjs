const fs = require('fs');
let code = fs.readFileSync('src/components/CandidatePlayer.tsx', 'utf8');

code = code.replace(/import \{ db, auth, storage \} from "@\/src\/lib\/firebase";\n/, '');
code = code.replace(/import \{ collection, addDoc, updateDoc, doc, serverTimestamp \} from "firebase\/firestore";\n/, '');
code = code.replace(/import \{ ref, uploadBytes, getDownloadURL, uploadBytesResumable \} from "firebase\/storage";\n/, '');

// Replace the upload blocks
code = code.replace(/const storageRef = ref\(storage, [\s\S]*?;\n\s*const uploadTask = uploadBytesResumable\(storageRef, blob\);\n\s*return new Promise<\w+>\(\(resolve, reject\) => \{[\s\S]*?uploadTask\.on\([\s\S]*?getDownloadURL\(uploadTask\.snapshot\.ref\);[\s\S]*?resolve\(url\);[\s\S]*?\}\);\n\s*\}\);/g, `
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

// Replace other references to 'collection'
code = code.replace(/const responseRef = collection\(db, "organizations", organizationId, "sessions", sessionId, "responses"\);/g, 'const responseRef = "dummy";');

fs.writeFileSync('src/components/CandidatePlayer.tsx', code);
