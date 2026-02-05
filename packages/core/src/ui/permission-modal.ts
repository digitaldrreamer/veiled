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
        transition: opacity 0.25s ease-out;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      }
      
      .veiled-permission-modal.veiled-modal--visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* * RED LIGHTNING EFFECT - backdrop glow */
      .veiled-modal__backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at top, rgba(248, 113, 113, 0.35), transparent 55%),
                    radial-gradient(circle at bottom, rgba(185, 28, 28, 0.3), transparent 55%),
                    rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
      
      .veiled-modal__content {
        position: relative;
        max-width: 520px;
        width: min(520px, 100% - 32px);
        max-height: 80vh;
        padding: 20px 22px 16px;
        border-radius: 18px;
        /* * Match main widget background */
        background: linear-gradient(-30deg, rgba(192, 192, 192, 0.1), transparent, rgba(192, 192, 192, 0.1)),
                    linear-gradient(to bottom, oklch(0.185 0 0), oklch(0.185 0 0));
        /* * Match main widget border */
        border: 2px solid rgba(192, 192, 192, 0.5);
        /* * RED LIGHTNING EFFECT - box shadow glows */
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.9),
          0 18px 55px rgba(15, 23, 42, 0.85),
          0 0 35px rgba(248, 113, 113, 0.25),
          0 0 55px rgba(185, 28, 28, 0.25);
        overflow-y: auto;
        /* * Match main widget text color */
        color: rgba(255, 255, 255, 0.95);
      }
      
      .veiled-modal__header h2 {
        margin: 0 0 6px 0;
        font-size: 18px;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        /* * Match main widget header color */
        color: rgba(255, 255, 255, 0.95);
      }
      
      .veiled-modal__header p {
        margin: 0;
        font-size: 13px;
        /* * Match main widget description color */
        color: rgba(255, 255, 255, 0.6);
      }
      
      .veiled-modal__permissions {
        margin: 18px 0 16px;
      }
      
      .permission-item {
        display: flex;
        gap: 10px;
        padding: 10px 11px;
        border-radius: 11px;
        margin-bottom: 10px;
        /* * Match main widget border and background */
        border: 2px solid rgba(192, 192, 192, 0.3);
        background: rgba(255, 255, 255, 0.05);
      }
      
      .permission-item.high {
        border-color: rgba(192, 192, 192, 0.5);
        box-shadow: 0 0 16px rgba(192, 192, 192, 0.2);
      }
      
      .permission-item.medium {
        border-color: rgba(192, 192, 192, 0.4);
        box-shadow: 0 0 16px rgba(192, 192, 192, 0.15);
      }
      
      .permission-item.critical {
        border-color: rgba(192, 192, 192, 0.6);
        box-shadow: 0 0 20px rgba(192, 192, 192, 0.25);
      }
      
      .permission-icon {
        font-size: 22px;
        flex-shrink: 0;
      }
      
      .permission-details {
        flex: 1;
      }
      
      .permission-name {
        font-weight: 600;
        /* * Match main widget text color */
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 2px;
        font-size: 14px;
      }
      
      .permission-description {
        font-size: 12px;
        /* * Match main widget description color */
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 2px;
      }
      
      .permission-risk {
        font-size: 11px;
        /* * Match main widget accent color (silver) */
        color: rgba(192, 192, 192, 0.8);
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      
      .veiled-modal__reason {
        /* * Match main widget background */
        background: rgba(255, 255, 255, 0.05);
        padding: 10px 12px;
        border-radius: 10px;
        margin-bottom: 14px;
        font-size: 12px;
        /* * Match main widget text color */
        color: rgba(255, 255, 255, 0.8);
        /* * Match main widget border */
        border: 1px solid rgba(192, 192, 192, 0.4);
      }
      
      .veiled-modal__privacy-impact {
        /* * Match main widget background */
        background: rgba(255, 255, 255, 0.05);
        /* * Match main widget border */
        border: 1px solid rgba(192, 192, 192, 0.4);
        border-radius: 12px;
        padding: 13px 12px;
        margin-bottom: 16px;
      }
      
      .privacy-score {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .score-before {
        /* * Match main widget accent color */
        color: rgba(192, 192, 192, 0.9);
      }
      
      .score-after.critical {
        /* * Match main widget accent color */
        color: rgba(192, 192, 192, 0.9);
      }
      
      .score-after.high {
        /* * Match main widget accent color */
        color: rgba(192, 192, 192, 0.8);
      }
      
      .score-after.medium {
        /* * Match main widget accent color */
        color: rgba(192, 192, 192, 0.7);
      }
      
      .score-after.low {
        /* * Match main widget accent color */
        color: rgba(192, 192, 192, 0.8);
      }
      
      .privacy-warning {
        text-align: center;
        margin: 0;
        /* * Match main widget text color */
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      }
      
      .veiled-modal__actions {
        display: flex;
        gap: 10px;
        margin-top: 6px;
      }
      
      .btn-deny,
      .btn-allow {
        flex: 1;
        padding: 10px 18px;
        border: none;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.12s ease-out, box-shadow 0.12s ease-out, background 0.12s ease-out;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* * Match main widget button style */
      .btn-deny {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
        border: 2px solid rgba(192, 192, 192, 0.4);
        box-shadow: 0 0 0 1px rgba(192, 192, 192, 0.2);
      }
      
      .btn-deny:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(192, 192, 192, 0.6);
        box-shadow: 0 0 0 1px rgba(192, 192, 192, 0.3), 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      
      /* * Match main widget button style */
      .btn-allow {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
        border: 2px solid rgba(232, 232, 232, 0.6);
        box-shadow: 0 0 0 1px rgba(232, 232, 232, 0.3);
      }
      
      .btn-allow:hover {
        transform: translateY(-1px);
        background: rgba(232, 232, 232, 0.1);
        border-color: rgba(232, 232, 232, 0.8);
        box-shadow: 0 0 0 1px rgba(232, 232, 232, 0.4), 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      
      .veiled-modal__footer {
        margin-top: 10px;
        text-align: center;
        /* * Match main widget description color */
        color: rgba(255, 255, 255, 0.6);
        font-size: 11px;
      }
    `;
    
    document.head.appendChild(style);
  }
}
