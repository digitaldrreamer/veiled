// * Permission Modal UI Component
// * Displays permission request dialog with privacy impact warnings

import { Permission } from '../types.js';

export class PermissionModal {
  private element: HTMLElement;
  private resolve: ((approved: boolean) => void) | null = null;

  constructor() {
    this.element = this.createModal();
  }

  async request(permissions: Permission[], reason?: string): Promise<boolean> {
    this.show(permissions, reason);
    
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private show(permissions: Permission[], reason?: string): void {
    // * Update modal content
    const permissionsHTML = permissions.map(p => this.renderPermission(p)).join('');
    const privacyImpact = this.calculatePrivacyImpact(permissions);
    
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this app';
    
    this.element.innerHTML = `
      <div class="veiled-modal__backdrop"></div>
      <div class="veiled-modal__content">
        <div class="veiled-modal__header">
          <h2>⚠️ Permission Request</h2>
          <p>${hostname} wants to access:</p>
        </div>
        
        <div class="veiled-modal__permissions">
          ${permissionsHTML}
        </div>
        
        ${reason ? `
          <div class="veiled-modal__reason">
            <strong>Why:</strong> ${reason}
          </div>
        ` : ''}
        
        <div class="veiled-modal__privacy-impact">
          <div class="privacy-score">
            <span class="score-before">Privacy: 10/10</span>
            <span class="arrow">→</span>
            <span class="score-after ${privacyImpact.class}">
              ${privacyImpact.score}/10
            </span>
          </div>
          <p class="privacy-warning">${privacyImpact.warning}</p>
        </div>
        
        <div class="veiled-modal__actions">
          <button class="btn-deny" id="veiled-deny">
            ❌ Deny (Stay Private)
          </button>
          <button class="btn-allow" id="veiled-allow">
            ⚠️ Allow
          </button>
        </div>
        
        <div class="veiled-modal__footer">
          <small>You can revoke this anytime in the Veiled extension</small>
        </div>
      </div>
    `;
    
    // * Add to DOM (only if in browser environment)
    if (typeof document !== 'undefined') {
      document.body.appendChild(this.element);
      this.element.classList.add('veiled-modal--visible');
      
      // * Attach event listeners
      const denyBtn = document.getElementById('veiled-deny');
      const allowBtn = document.getElementById('veiled-allow');
      if (denyBtn) denyBtn.onclick = () => this.handleDeny();
      if (allowBtn) allowBtn.onclick = () => this.handleAllow();
    }
  }

  private renderPermission(permission: Permission): string {
    const info = this.getPermissionInfo(permission);
    
    return `
      <div class="permission-item ${info.severity}">
        <div class="permission-icon">${info.icon}</div>
        <div class="permission-details">
          <div class="permission-name">${info.name}</div>
          <div class="permission-description">${info.description}</div>
          <div class="permission-risk">Risk: ${info.risk}</div>
        </div>
      </div>
    `;
  }

  private getPermissionInfo(permission: Permission): {
    icon: string;
    name: string;
    description: string;
    risk: string;
    severity: 'high' | 'medium' | 'low' | 'critical';
  } {
    const info: Record<Permission, {
      icon: string;
      name: string;
      description: string;
      risk: string;
      severity: 'high' | 'medium' | 'low' | 'critical';
    }> = {
      [Permission.RevealWalletAddress]: {
        icon: '🔑',
        name: 'Your Wallet Address',
        description: 'Reveals your identity on-chain',
        risk: 'HIGH - Enables tracking across all sites',
        severity: 'high',
      },
      [Permission.RevealExactBalance]: {
        icon: '💰',
        name: 'Your Exact Balance',
        description: 'Shows how much SOL you have',
        risk: 'MEDIUM - Exposes financial status',
        severity: 'medium',
      },
      [Permission.RevealTokenBalances]: {
        icon: '🪙',
        name: 'Your Token Holdings',
        description: 'Shows all your token balances',
        risk: 'MEDIUM - Exposes portfolio',
        severity: 'medium',
      },
      [Permission.RevealNFTList]: {
        icon: '🖼️',
        name: 'Your NFT Collection',
        description: 'Shows which NFTs you own',
        risk: 'MEDIUM - Reveals preferences & wealth',
        severity: 'medium',
      },
      [Permission.RevealTransactionHistory]: {
        icon: '📜',
        name: 'Your Transaction History',
        description: 'Complete history of your activity',
        risk: 'HIGH - Full financial surveillance',
        severity: 'high',
      },
      [Permission.RevealStakingPositions]: {
        icon: '🎯',
        name: 'Your Staking Positions',
        description: 'Shows where & how much you stake',
        risk: 'MEDIUM - Exposes investment strategy',
        severity: 'medium',
      },
      [Permission.RevealDeFiPositions]: {
        icon: '🏦',
        name: 'Your DeFi Positions',
        description: 'Shows all your DeFi positions',
        risk: 'HIGH - Complete financial picture',
        severity: 'high',
      },
      [Permission.SignTransactions]: {
        icon: '✍️',
        name: 'Sign Transactions',
        description: 'Allow app to request signatures',
        risk: 'CRITICAL - Can spend your funds',
        severity: 'critical',
      },
    };
    
    return info[permission] || { icon: '❓', name: permission, description: 'Unknown permission', risk: 'UNKNOWN', severity: 'medium' };
  }

  private calculatePrivacyImpact(permissions: Permission[]) {
    const highRisk = [
      Permission.RevealWalletAddress,
      Permission.RevealTransactionHistory,
      Permission.RevealDeFiPositions,
    ];
    
    const hasHighRisk = permissions.some(p => highRisk.includes(p));
    const hasCritical = permissions.includes(Permission.SignTransactions);
    
    if (hasCritical) {
      return {
        score: 0,
        class: 'critical',
        warning: '🔴 CRITICAL: This grants access to sign transactions with your wallet!'
      };
    }
    
    if (hasHighRisk) {
      return {
        score: 2,
        class: 'high',
        warning: '⚠️ HIGH RISK: This significantly compromises your privacy'
      };
    }
    
    if (permissions.length >= 3) {
      return {
        score: 4,
        class: 'medium',
        warning: '⚠️ MEDIUM RISK: Multiple permissions reduce privacy'
      };
    }
    
    return {
      score: 6,
      class: 'low',
      warning: 'ℹ️ LOW RISK: Limited data exposure'
    };
  }

  private handleDeny(): void {
    this.hide();
    if (this.resolve) {
      this.resolve(false);
      this.resolve = null;
    }
  }

  private handleAllow(): void {
    this.hide();
    if (this.resolve) {
      this.resolve(true);
      this.resolve = null;
    }
  }

  private hide(): void {
    this.element.classList.remove('veiled-modal--visible');
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'veiled-modal veiled-permission-modal';
    
    // * Load styles
    this.injectStyles();
    
    return modal;
  }

  private injectStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('veiled-permission-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'veiled-permission-styles';
    style.textContent = `
      .veiled-permission-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      
      .veiled-permission-modal.veiled-modal--visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      .veiled-modal__backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      
      .veiled-modal__content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .veiled-modal__header h2 {
        margin: 0 0 8px 0;
        color: #dc2626;
        font-size: 20px;
      }
      
      .veiled-modal__header p {
        margin: 0;
        color: #6b7280;
      }
      
      .veiled-modal__permissions {
        margin: 20px 0;
      }
      
      .permission-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        border: 2px solid #e5e7eb;
      }
      
      .permission-item.high {
        border-color: #dc2626;
        background: #fef2f2;
      }
      
      .permission-item.medium {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      
      .permission-item.critical {
        border-color: #991b1b;
        background: #fee2e2;
      }
      
      .permission-icon {
        font-size: 24px;
      }
      
      .permission-details {
        flex: 1;
      }
      
      .permission-name {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .permission-description {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 4px;
      }
      
      .permission-risk {
        font-size: 12px;
        color: #dc2626;
        font-weight: 600;
      }
      
      .veiled-modal__reason {
        background: #f3f4f6;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      }
      
      .veiled-modal__privacy-impact {
        background: #fef2f2;
        border: 2px solid #dc2626;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }
      
      .privacy-score {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .score-before {
        color: #10b981;
      }
      
      .score-after.critical {
        color: #991b1b;
      }
      
      .score-after.high {
        color: #dc2626;
      }
      
      .score-after.medium {
        color: #f59e0b;
      }
      
      .score-after.low {
        color: #3b82f6;
      }
      
      .privacy-warning {
        text-align: center;
        margin: 0;
        color: #991b1b;
        font-size: 14px;
      }
      
      .veiled-modal__actions {
        display: flex;
        gap: 12px;
      }
      
      .btn-deny,
      .btn-allow {
        flex: 1;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-deny {
        background: #10b981;
        color: white;
      }
      
      .btn-deny:hover {
        background: #059669;
      }
      
      .btn-allow {
        background: #dc2626;
        color: white;
      }
      
      .btn-allow:hover {
        background: #b91c1c;
      }
      
      .veiled-modal__footer {
        margin-top: 12px;
        text-align: center;
        color: #6b7280;
      }
    `;
    
    document.head.appendChild(style);
  }
}
