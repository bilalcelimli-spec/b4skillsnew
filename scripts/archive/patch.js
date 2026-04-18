const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the effect
code = code.replace(/useEffect\(\(\) => \{\n    const unsubscribe = onAuthStateChanged\(auth, async \(currentUser\)[^\0]+?    return \(\) => unsubscribe\(\);\n  \}, \[\]\);/, 
`useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Decode token or fetch user (for now fetch /api/auth/me)
      setLoading(true);
      fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token }
      }).then(res => res.json())
      .then(data => {
        if(data.user) {
           setUser(data.user);
           setUserProfile(data.user);
           setShowLanding(false);
           if(data.user.role === "RATER" || data.user.role === "rater") setActiveTab("rating");
           else if(data.user.role === "ADMIN" || data.user.role === "admin") setActiveTab("admin");
           else if(data.user.role === "ORG_ADMIN" || data.user.role === "org_admin") setActiveTab("institutional");
        }
      }).catch(err => console.error(err))
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);`);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
