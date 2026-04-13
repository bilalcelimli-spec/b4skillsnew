const fs = require('fs');
let code = fs.readFileSync('src/components/CandidatePlayer.tsx', 'utf8');

// remove imports
code = code.replace(/import \{ db, auth, storage \} from "@\/src\/lib\/firebase";\n/, '');
code = code.replace(/import \{ collection, addDoc, updateDoc, doc, serverTimestamp \} from "firebase\/firestore";\n/, '');
code = code.replace(/import \{ ref, uploadBytes, getDownloadURL, uploadBytesResumable \} from "firebase\/storage";\n/, '');

// patch out the addDoc/updateDoc logic with fetch or dummy
code = code.replace(/await addDoc\(responseRef, \{([\s\S]*?)\}\);/g, `await fetch('/api/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({$1}) });`);
code = code.replace(/const sessionRef = doc\(db, "organizations", organizationId, "sessions", sessionId\);\n\s*await updateDoc\(sessionRef, \{([\s\S]*?)\}\);/g, `await fetch('/api/sessions/' + sessionId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({$1}) });`);

fs.writeFileSync('src/components/CandidatePlayer.tsx', code);
