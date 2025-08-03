import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MobileDebugService {
  private debugElement: HTMLElement | null = null;
  private logs: string[] = [];

  constructor() {
    if ((environment as any).enableMobileDebugging) {
      this.initMobileDebugger();
    }
  }

  private initMobileDebugger() {
    // Only enable on mobile or when explicitly requested
    if (this.isMobileDevice() || this.isResponsiveTesting()) {
      this.createDebugPanel();
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private isResponsiveTesting(): boolean {
    // Check if we're in Chrome DevTools responsive mode
    return window.innerWidth <= 768 || 
           (window as any).chrome?.runtime?.onConnect || 
           navigator.userAgent.includes('Chrome') && window.innerWidth <= 768;
  }

  private createDebugPanel() {
    // Create floating debug panel
    this.debugElement = document.createElement('div');
    this.debugElement.id = 'mobile-debug-panel';
    this.debugElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 280px;
      max-height: 200px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-size: 11px;
      font-family: monospace;
      border-radius: 8px;
      padding: 8px;
      z-index: 9999;
      overflow-y: auto;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '🐛';
    toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      background: #ff6b35;
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 16px;
      z-index: 10000;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;

    toggleButton.onclick = () => {
      const isVisible = this.debugElement!.style.display !== 'none';
      this.debugElement!.style.display = isVisible ? 'none' : 'block';
      toggleButton.style.right = isVisible ? '10px' : '300px';
    };

    document.body.appendChild(this.debugElement);
    document.body.appendChild(toggleButton);

    this.log('Mobile Debug Panel Initialized');
    this.logDeviceInfo();
  }

  private logDeviceInfo() {
    this.log(`Screen: ${window.innerWidth}x${window.innerHeight}`);
    this.log(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);
    this.log(`Connection: ${(navigator as any).connection?.effectiveType || 'unknown'}`);
    this.log(`Online: ${navigator.onLine ? 'Yes' : 'No'}`);
  }

  public log(message: string, type: 'info' | 'error' | 'warning' = 'info') {
    if (!(environment as any).enableMobileDebugging) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    
    this.logs.push(logEntry);
    
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs.shift();
    }

    // Update debug panel
    if (this.debugElement) {
      const color = type === 'error' ? '#ff6b6b' : type === 'warning' ? '#ffa726' : '#4fc3f7';
      this.debugElement.innerHTML = this.logs
        .map(log => `<div style="margin-bottom: 2px; color: ${this.getLogColor(log)}">${log}</div>`)
        .join('');
      this.debugElement.scrollTop = this.debugElement.scrollHeight;
    }

    // Also log to console
    console.log(`[MOBILE DEBUG] ${logEntry}`);
  }

  private getLogColor(log: string): string {
    if (log.includes('ERROR')) return '#ff6b6b';
    if (log.includes('WARNING')) return '#ffa726';
    if (log.includes('API')) return '#66bb6a';
    return '#ffffff';
  }

  public logApiCall(url: string, method: string = 'GET') {
    this.log(`API ${method}: ${url.replace(environment.apiBaseUrl, '')}`);
  }

  public logApiError(url: string, error: any) {
    this.log(`API ERROR: ${url} - ${error.message || error}`, 'error');
  }

  public logApiSuccess(url: string, dataLength?: number) {
    this.log(`API SUCCESS: ${url} ${dataLength ? `(${dataLength} items)` : ''}`, 'info');
  }

  public checkConnectivity(): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      fetch(environment.apiBaseUrl + '/health', { 
        method: 'GET',
        mode: 'cors'
      })
      .then(response => {
        const responseTime = Date.now() - startTime;
        this.log(`API Health Check: ${response.status} (${responseTime}ms)`);
        resolve(response.ok);
      })
      .catch(error => {
        const responseTime = Date.now() - startTime;
        this.log(`API Health Check Failed: ${error.message} (${responseTime}ms)`, 'error');
        resolve(false);
      });
    });
  }

  public testNetworkSpeed(): Promise<string> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testSize = 1024; // 1KB test
      
      fetch(environment.apiBaseUrl + '/test-endpoint', {
        method: 'GET',
        mode: 'cors'
      })
      .then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const speed = (testSize / duration) * 1000; // bytes per second
        const speedKbps = (speed / 1024).toFixed(2);
        
        this.log(`Network Speed: ~${speedKbps} KB/s`);
        resolve(`${speedKbps} KB/s`);
      })
      .catch(() => {
        this.log('Network Speed Test Failed', 'warning');
        resolve('Unknown');
      });
    });
  }

  public clearLogs() {
    this.logs = [];
    if (this.debugElement) {
      this.debugElement.innerHTML = '<div style="color: #ffa726;">Logs cleared</div>';
    }
  }
}