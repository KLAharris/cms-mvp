/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-outside-imports',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/domain/',
      },
      to: {
        pathNot: '^src/modules/$1/domain/',
      },
    },
    {
      name: 'application-no-adapter-imports',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/application/',
      },
      to: {
        path: '^src/modules/[^/]+/adapter/',
      },
    },
    {
      name: 'adapter-no-other-module-internals',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/adapter/',
      },
      to: {
        path: '^src/modules/(?!$1/)[^/]+/(domain|application|adapter)/',
      },
    },
    {
      name: 'no-cross-module-internal-imports',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/',
      },
      to: {
        path: '^src/modules/(?!$1/)[^/]+/(domain|application|adapter)/',
      },
    },
    {
      name: 'adapter-in-no-adapter-out-imports',
      severity: 'error',
      from: {
        path: '^src/modules/[^/]+/adapter/http/',
      },
      to: {
        path: '^src/modules/[^/]+/adapter/persistence/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: '(^|/)node_modules/|(^|/)dist/|(^|/)coverage/|(^|/)playwright-report/',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
  },
};
