const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove firebase imports
code = code.replace(/import \{ auth, db \} from "\.\/lib\/firebase";\n/g, '');
code = code.replace(/import \{ onAuthStateChanged, User, signOut \} from "firebase\/auth";\n/g, '');
code = code.replace(/import \{ doc, getDoc, setDoc, collection, addDoc, serverTimestamp \} from "firebase\/firestore";\n/g, '');
code = code.replace(/const signOut = async \(auth: any\) => \{ localStorage.removeItem\("token"\); window.location.reload\(\); \};\n/g, '');
// Re-add signOut and User Type
let headerRepl = `type User = { uid: string; email: string; displayName?: string; role?: string };
const signOut = async () => { localStorage.removeItem("token"); window.location.reload(); };
`;
code = code.replace(/type User = \{ uid: string; email: string; displayName\?: string; role\?: string \};\n/, headerRepl);

const effectStart = code.indexOf('useEffect(() => {');
const effectEnd = code.indexOf('  }, []);', effectStart) + 9;

const newEffect = `useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoading(true);
      fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token }
      }).then(res => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then(async data => {
        if(data.user) {
           setUser(data.user);
           setUserProfile(data.user);
           setShowLanding(false);
           
           if(data.user.role === "RATER" || data.user.role === "rater") setActiveTab("rating");
           else if(data.user.role === "ADMIN" || data.user.role === "admin") setActiveTab("admin");
           else if(data.user.role === "ORG_ADMIN" || data.user.role === "org_admin") setActiveTab("institutional");
           
           // Fetch Branding if org is attached
           if (data.user.organizationId) {
             try {
               const res = await fetch(\`/api/branding/\${data.user.organizationId}\`);
               if (res.ok) {
                 const b = await res.json();
                 setBranding(b);
               }
             } catch (err) {}
           }
        }
      }).catch(err => {
        console.error(err);
        localStorage.removeItem("token");
        setUser(null);
        setShowLanding(true);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);`;

code = code.substring(0, effectStart) + newEffect + code.substring(effectEnd);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx imports and effects");
