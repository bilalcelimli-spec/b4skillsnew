const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Pass it to CandidateManagement
content = content.replace('<CandidateManagement orgId="default-org" />', '<CandidateManagement orgId="default-org" onGenerateCodes={() => setActiveTab("codes")} />');

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

let candContent = fs.readFileSync('src/components/admin/CandidateManagement.tsx', 'utf8');

candContent = candContent.replace('export const CandidateManagement: React.FC<{ orgId: string }> = ({ orgId }) => {', 'export const CandidateManagement: React.FC<{ orgId: string, onGenerateCodes?: () => void }> = ({ orgId, onGenerateCodes }) => {');

candContent = candContent.replace('<UserPlus size={14} className="mr-2" /> Add Candidate', '<Key size={14} className="mr-2" /> Generate Exam Codes');
candContent = candContent.replace('import { \n  Users', 'import { Key,\n  Users');

candContent = candContent.replace('className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest">', 'className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest" onClick={onGenerateCodes}>');

fs.writeFileSync('src/components/admin/CandidateManagement.tsx', candContent);

