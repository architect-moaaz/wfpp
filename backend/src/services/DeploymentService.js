/**
 * DeploymentService
 *
 * Handles deployment and execution of generated applications
 */

const { spawn } = require('child_process');
const path = require('path');

class DeploymentService {
  constructor() {
    this.runningApps = new Map(); // appId -> { process, port, startedAt }
  }

  async deploy(application, config) {
    console.log('[DeploymentService] Deploying:', application.name);

    const { type = 'standalone', port = 4000 } = config;
    const appPath = path.join(__dirname, '../../generated-apps', application.id);

    return {
      path: appPath,
      url: `http://localhost:${port}`,
      port,
      type
    };
  }

  async start(application) {
    console.log('[DeploymentService] Starting:', application.name);

    const appId = application.id;
    const port = application.runtime?.port || 4000;

    // Check if already running
    if (this.runningApps.has(appId)) {
      console.log('[DeploymentService] Application already running:', appId);
      const info = this.runningApps.get(appId);
      return {
        url: `http://localhost:${info.port}`,
        port: info.port,
        pid: info.process.pid,
        status: 'already_running'
      };
    }

    // TODO: Implement actual application starting
    // For now, return mock data
    const mockProcess = { pid: process.pid };
    this.runningApps.set(appId, {
      process: mockProcess,
      port,
      startedAt: new Date()
    });

    console.log(`[DeploymentService] Application started on port ${port}`);

    return {
      url: `http://localhost:${port}`,
      port,
      pid: mockProcess.pid,
      status: 'started'
    };
  }

  async stop(application) {
    console.log('[DeploymentService] Stopping:', application.name);

    const appId = application.id;

    if (!this.runningApps.has(appId)) {
      console.log('[DeploymentService] Application not running:', appId);
      return { status: 'not_running' };
    }

    const info = this.runningApps.get(appId);

    // TODO: Kill actual process
    // if (info.process && info.process.kill) {
    //   info.process.kill();
    // }

    this.runningApps.delete(appId);
    console.log('[DeploymentService] Application stopped:', appId);

    return { status: 'stopped' };
  }

  async getStatus(application) {
    const appId = application.id;

    if (!this.runningApps.has(appId)) {
      return {
        status: 'stopped',
        uptime: 0
      };
    }

    const info = this.runningApps.get(appId);
    const uptime = Date.now() - info.startedAt.getTime();

    return {
      status: 'running',
      uptime,
      port: info.port,
      pid: info.process.pid,
      url: `http://localhost:${info.port}`
    };
  }

  listRunning() {
    const running = [];
    for (const [appId, info] of this.runningApps.entries()) {
      running.push({
        appId,
        port: info.port,
        pid: info.process.pid,
        uptime: Date.now() - info.startedAt.getTime()
      });
    }
    return running;
  }
}

module.exports = DeploymentService;
