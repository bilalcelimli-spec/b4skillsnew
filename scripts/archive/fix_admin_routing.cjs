const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace activeTab assignment
const oldActiveTabCode = `          if (data.user.role === "RATER" || data.user.role === "rater") setActiveTab("rating");
          else if (data.user.role === "ADMIN" || data.user.role === "admin") setActiveTab("admin");
          else if (data.user.role === "ORG_ADMIN" || data.user.role === "org_admin") setActiveTab("institutional");`;

const newActiveTabCode = `          const role = data.user.role?.toUpperCase();
          if (role === "RATER") setActiveTab("rating");
          else if (["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "ASSESSMENT_DIRECTOR"].includes(role)) setActiveTab("admin");
          else if (["ORG_ADMIN", "INST_ADMIN"].includes(role)) setActiveTab("institutional");`;

code = code.replace(oldActiveTabCode, newActiveTabCode);

// Replace isAdmin calculation
const oldRolesCode = `  const isAdmin = userProfile?.role === "admin";
  const isRater = userProfile?.role === "rater" || isAdmin;
  const isOrgAdmin = userProfile?.role === "org_admin" || isAdmin;`;

const newRolesCode = `  const profRole = userProfile?.role?.toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "ASSESSMENT_DIRECTOR"].includes(profRole);
  const isRater = profRole === "RATER" || isAdmin;
  const isOrgAdmin = ["ORG_ADMIN", "INST_ADMIN"].includes(profRole) || isAdmin;`;

code = code.replace(oldRolesCode, newRolesCode);

// Replace one more occurrence if checking user instead of userProfile anywhere? 
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for roles.");
