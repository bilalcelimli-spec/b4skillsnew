const fs = require('fs');

const updateAppTsc = () => {
    let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
    appContent = appContent.replace(/import \{ auth, db \} from "\.\/lib\/firebase";/g, '');
    appContent = appContent.replace(/import \{ onAuthStateChanged, User, signOut \} from "firebase\/auth";/g, 'type User = { uid: string; email: string; displayName?: string; role?: string };\nconst signOut = async (auth: any) => { localStorage.removeItem("token"); window.location.reload(); };');
    appContent = appContent.replace(/import \{ doc, getDoc, setDoc, collection, addDoc, serverTimestamp \} from "firebase\/firestore";/g, '');
    
    // Replace auth state logic
    appContent = appContent.replace(/useEffect\(\(\) => \{\n\s+const unsubscribe = onAuthStateChanged\(auth, async \(firebaseUser\) => \{([\s\S]*?)se setUserProfile\(null\);\n\s+\}\n\s+setUser\(firebaseUser\);\n\s+setIsLoading\(false\);\n\s+\}\);\n\n\s+return \(\) => unsubscribe\(\);\n\s+\}, \[\]\);/, `useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        // mock auth logic for now
        const mockUser: User = { uid: "user123", email: "user@test.com", role: "admin" };
        setUser(mockUser as any);
        setUserProfile(mockUser);
    } else {
        setUser(null);
        setUserProfile(null);
    }
    setIsLoading(false);
  }, []);`);
    fs.writeFileSync('src/App.tsx', appContent);
};

try {
    updateAppTsc();
    console.log("App.tsx modified");
} catch(e) {
    console.log(e);
}
