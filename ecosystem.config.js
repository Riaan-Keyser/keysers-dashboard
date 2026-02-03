/**
 * PM2 Ecosystem configuration for Keysers Dashboard
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop keysers-dashboard
 *   pm2 restart keysers-dashboard
 *   pm2 logs keysers-dashboard
 *   pm2 monit
 */

module.exports = {
  apps: [{
    name: 'keysers-dashboard',
    
    // Start script
    script: 'npm',
    args: 'start',
    
    // Working directory
    cwd: '/home/riaan/keysers-dashboard',
    
    // Interpreter
    interpreter: 'none',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Instances (1 for Next.js)
    instances: 1,
    exec_mode: 'fork',
    
    // Auto restart
    autorestart: true,
    watch: false,
    
    // Max memory restart (restart if memory exceeds 1GB)
    max_memory_restart: '1G',
    
    // Logging
    error_file: '/home/riaan/keysers-dashboard/logs/pm2-error.log',
    out_file: '/home/riaan/keysers-dashboard/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Merge logs
    merge_logs: true,
    
    // Restart delay
    restart_delay: 4000,
    
    // Min uptime before considering app as stable
    min_uptime: '10s',
    
    // Max restarts within max_restarts_time
    max_restarts: 10,
    
    // Kill timeout (time to wait before force kill)
    kill_timeout: 5000,
    
    // Wait for app to be ready
    listen_timeout: 10000,
  }]
};
