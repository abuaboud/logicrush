// Import-direction rules for the server package. Every rule here is already true
// of the tree, so `npm run lint:deps` is green on a clean checkout and any
// failure is a real regression. Style lives in CODING_STYLE.md, not here.
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A cycle means two modules are really one. Split them or move the shared part down.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'controllers-are-sinks',
      severity: 'error',
      comment:
        'A controller is an HTTP surface, not a dependency. Call the module\'s service instead. ' +
        'app.ts is the composition root and is exempt because it has no folder.',
      from: { path: '^packages/app/server/src/(.+)/[^/]+\\.ts$' },
      to: { path: '^packages/app/server/src/(?!$1/).*-controller\\.ts$' },
    },
    {
      name: 'scoring-is-pure',
      severity: 'error',
      comment:
        'Contest scoring and Elo rating are ported verbatim from the legacy Java and are pinned by ' +
        'golden-data tests. They must stay pure functions over their inputs: no database, no config, ' +
        'no clock. That is what makes the golden tests meaningful.',
      from: { path: '^packages/app/server/src/competition/(scoring|rating)\\.ts$' },
      to: { path: '^packages/app/server/src/(infra|configs)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|dist)/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'types'] },
  },
}
