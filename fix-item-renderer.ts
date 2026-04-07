import fs from 'fs';
const file = 'src/components/ItemRenderer.tsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement logic:
// change (option: string, index: number) to (option: any, index: number)
content = content.replace(/\(option: string, index: number\) => \(/g, 
  '(option: any, index: number) => {\n                const optionText = typeof option === "string" ? option : option.text;\n                return (');

// And replace {option} with {optionText}
content = content.replace(/>\{option\}<\/span>/g, '>{optionText}</span>');

// And replace : ${option} with : ${optionText}
content = content.replace(/\$\{option\}/g, '${optionText}');

// And since we changed `=> (` to `=> { ... return (`, we need to close the return with `)}` instead of `))`
// Let's be careful. Let's just do an exact match replace for the `))}` parts.

// Wait, doing this via script is risky. Let's use precise replace block tools or node string replace carefully.
