/** Static API contract inventory. Run with npm run audit:routes. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.(ts|tsx)$/.test(file) ? [file] : [];
  });
}

function literal(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map(span => ':dynamic' + span.literal.text).join('');
  }
  return null;
}

function resolveImport(file, specifier) {
  if (!specifier || (!specifier.startsWith('.') && !specifier.startsWith('@/'))) return null;
  const base = specifier.startsWith('@/') ? specifier.slice(2) : path.resolve(path.dirname(file), specifier);
  const stem = base.replace(/\.(js|mjs)$/, '');
  return [base, stem + '.ts', stem + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
    .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

const imports = new Map();
const routes = [];
const calls = [];
const mounts = [];
const routeCall = /^(app|router)\.(get|post|put|patch|delete|all)$/;
for (const file of ['server.ts', ...sourceFiles('src')]) {
  if (/(__tests__|\.(test|spec)\.)/.test(file)) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies = [];
  imports.set(path.resolve(file), dependencies);
  function trackImport(specifier) {
    const resolved = resolveImport(file, specifier);
    if (resolved) dependencies.push(path.resolve(resolved));
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) trackImport(literal(node.moduleSpecifier));
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) trackImport(literal(node.arguments[0]));
      const target = node.expression.getText(source);
      const argument = node.arguments[0];
      const url = literal(argument);
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (routeCall.test(target)) {
        const urls = argument && ts.isArrayLiteralExpression(argument) ? argument.elements.map(literal) : [url];
        for (const routeUrl of urls.filter(Boolean)) {
          routes.push({ file, line, method: target.split('.')[1].toUpperCase(), url: routeUrl });
        }
      }
      if (target === 'app.use' && url) mounts.push({ url, handler: node.arguments[1]?.getText(source) ?? '' });
      if ((target === 'fetch' || target.endsWith('.fetch')) && url?.startsWith('/api')) {
        let method = 'GET';
        const options = node.arguments[1];
        if (options && ts.isObjectLiteralExpression(options)) {
          const property = options.properties.find(p => p.name?.getText(source) === 'method');
          if (property && ts.isPropertyAssignment(property)) method = literal(property.initializer) ?? 'DYNAMIC';
        }
        calls.push({ file, line, method, url });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const factories = {
  'src/routes/items.ts': 'createItemsRouter',
  'src/routes/billing.ts': 'createBillingRouter',
  'src/routes/proctoring.ts': 'createProctoringRouter',
  'src/routes/psychometrics.ts': 'createPsychometricsRouter',
  'src/routes/admin-scoring.ts': 'createAdminScoringRouter',
  'src/routes/operations.ts': 'createOperationsRouter',
  'src/routes/rating.ts': 'createRatingRouter',
};
const active = routes.flatMap(route => {
  if (route.file === 'server.ts') return route.url.startsWith('/api') ? [route] : [];
  const factory = factories[route.file];
  const mount = factory && mounts.find(candidate => candidate.handler.includes(factory));
  return mount ? [{ ...route, url: mount.url + (route.url === '/' ? '' : route.url) }] : [];
});
function matches(route, url) {
  const escaped = route.url.split('/').map(segment => segment.startsWith(':') ? '[^/]+'
    : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
  return new RegExp('^' + escaped + '/?$').test(url);
}
const missing = calls.filter(call => !active.some(route =>
  (route.method === call.method || route.method === 'ALL') && matches(route, call.url.split('?')[0])));
const duplicate = active.filter((route, index) => active.findIndex(other =>
  other.method === route.method && other.url === route.url) !== index);
const reachable = new Set();
function mark(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of imports.get(file) ?? []) mark(dependency);
}
for (const root of ['src/main.tsx', 'src/App.tsx', 'src/entry-server.tsx']) mark(path.resolve(root));
const reachableMissing = missing.filter(call => reachable.has(path.resolve(call.file)));
const dormantMissing = missing.filter(call => !reachable.has(path.resolve(call.file)));
const unmountedRouters = Object.keys(factories).filter(file => !active.some(route => route.file === file));
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Literal/template fetch calls and Express method/path coverage. Computed URLs, runtime responses, authorization, and payload schemas require separate verification.',
  routeCount: active.length, callCount: calls.length, reachableMissing, dormantMissing, duplicate, unmountedRouters,
  dormantComponents: [...imports.keys()].filter(file => file.includes('/src/components/') && !reachable.has(file))
    .map(file => path.relative(process.cwd(), file)),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/platform-route-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ routeCount: active.length, callCount: calls.length, reachableMissing,
  dormantMissingCount: dormantMissing.length, duplicate, unmountedRouters }, null, 2));
process.exitCode = reachableMissing.length || duplicate.length ? 1 : 0;
