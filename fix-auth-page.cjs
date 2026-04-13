const fs = require('fs');
let code = fs.readFileSync('src/components/AuthPage.tsx', 'utf8');

const replacement = `
  const handleGoogleSignIn = async () => {
    clearState();
    setGoogleLoading(true);
    // Dummy delay
    setTimeout(() => {
      setError("Google Sign-In is temporarily disabled.");
      setGoogleLoading(false);
    }, 1000);
  };

  const storeToken = (userData) => {
    const payload = btoa(JSON.stringify({ ...userData, iat: Date.now() }));
    const token = \`dummy.\${payload}.sig\`;
    localStorage.setItem('token', token);
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();

    if (mode === "forgot") {
      if (!email.trim()) { setError("Please enter your email address."); return; }
      setLoading(true);
      setTimeout(() => {
        setSuccessMessage("Password reset email sent! Check your inbox.");
        setLoading(false);
      }, 1000);
      return;
    }

    if (mode === "signup") {
      if (!displayName.trim()) { setError("Please enter your full name."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, displayName: displayName.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to sign up');
        storeToken(data.user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // signin
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      storeToken(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(/const handleGoogleSignIn = async \(\) => \{[\s\S]*?finally \{\n\s+setLoading\(false\);\n\s+\}\n\s+\};/m, replacement.trim());

fs.writeFileSync('src/components/AuthPage.tsx', code);
