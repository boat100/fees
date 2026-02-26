module.exports = {
  apps: [{
    name: 'school-fees-system',
    script: 'pnpm',
    args: 'run start',
    cwd: '/workspace/projects',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
