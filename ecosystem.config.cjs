// Sandbox-only process manager config (not used by Vercel).
module.exports = {
  apps: [
    {
      name: 'chaos-pact',
      script: 'node_modules/.bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      env: { NODE_ENV: 'production', PORT: 3000 },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
