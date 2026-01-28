# Permission System - SDK Integration

**Add to packages/sdk/**

---

## Types

```typescript
// packages/sdk/src/types/permissions.ts

export enum Permission {
  RevealWalletAddress = 'reveal_wallet_address',
  RevealExactBalance = 'reveal_exact_balance',
  RevealTokenBalances = 'reveal_token_balances',
  RevealNFTList = 'reveal_nft_list',
  RevealTransactionHistory = 'reveal_transaction_history',
  RevealStakingPositions = 'reveal_staking_positions',
  RevealDeFiPositions = 'reveal_defi_positions',
  SignTransactions = 'sign_transactions',
}

export interface PermissionRequest {
  permissions: Permission[];
  reason?: string;
  duration?: number; // Seconds, default 3600 (1 hour)
}

export interface PermissionGrant {
  nullifier: string;
  appId: string;
  permissions: Permission[];
  grantedAt: number;
  expiresAt: number;
  revoked: boolean;
}

export interface PermissionAccess {
  permission: Permission;
  accessedAt: number;
  metadata?: string;
}
```

---

## Permission Modal

```typescript
// packages/sdk/src/ui/permission-modal.ts

import { Permission } from '../types/permissions';

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
    // Update modal content
    const permissionsHTML = permissions.map(p => this.renderPermission(p)).join('');
    const privacyImpact = this.calculatePrivacyImpact(permissions);
    
    this.element.innerHTML = `
      <div class="veiled-modal__backdrop"></div>
      <div class="veiled-modal__content">
        <div class="veiled-modal__header">
          <h2>⚠️ Permission Request</h2>
          <p>${window.location.hostname} wants to access:</p>
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
    
    // Add to DOM
    document.body.appendChild(this.element);
    this.element.classList.add('veiled-modal--visible');
    
    // Attach event listeners
    document.getElementById('veiled-deny')!.onclick = () => this.handleDeny();
    document.getElementById('veiled-allow')!.onclick = () => this.handleAllow();
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

  private getPermissionInfo(permission: Permission) {
    const info: Record<Permission, any> = {
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
    
    return info[permission];
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
    
    // Load styles
    this.injectStyles();
    
    return modal;
  }

  private injectStyles(): void {
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
```

---

## Update Veiled SDK

```typescript
// packages/sdk/src/veiled.ts

import { Permission, PermissionRequest, PermissionGrant } from './types/permissions';
import { PermissionModal } from './ui/permission-modal';
import { Program } from '@coral-xyz/anchor';

export class Veiled extends EventEmitter {
  private permissionModal: PermissionModal;
  private activePermissions: Map<string, PermissionGrant> = new Map();

  constructor(config: VeiledConfig) {
    super();
    // ... existing setup ...
    this.permissionModal = new PermissionModal();
  }

  /**
   * Sign in with optional permission requests
   */
  async signIn(options?: {
    prove?: ProofType[];
    permissions?: PermissionRequest;
  }): Promise<Session> {
    this.emit('auth:started');
    
    // 1. Generate proof (existing flow)
    const proof = await this.generateProof(options?.prove || ['owns_wallet']);
    
    // 2. Submit proof to Solana (existing flow)
    const signature = await this.submitProof(proof);
    
    // 3. Handle permissions if requested
    let grantedPermissions: Permission[] = [];
    if (options?.permissions) {
      grantedPermissions = await this.requestPermissions(
        proof.nullifier,
        options.permissions
      );
    }
    
    // 4. Create session
    const session: Session = {
      nullifier: Buffer.from(proof.nullifier).toString('base64'),
      signature,
      verified: true,
      permissions: grantedPermissions,
      expiresAt: Date.now() + (options?.permissions?.duration || 3600) * 1000,
    };
    
    this.emit('auth:success', session);
    return session;
  }

  /**
   * Request permissions from user
   */
  private async requestPermissions(
    nullifier: Uint8Array,
    request: PermissionRequest
  ): Promise<Permission[]> {
    // Show modal to user
    const approved = await this.permissionModal.request(
      request.permissions,
      request.reason
    );
    
    if (!approved) {
      this.emit('permissions:denied', request.permissions);
      return [];
    }
    
    // User approved - store on-chain
    try {
      const [permissionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('permission'),
          Buffer.from(nullifier),
          this.getAppId().toBuffer()
        ],
        this.program.programId
      );
      
      await this.program.methods
        .grantPermissions(
          Array.from(nullifier),
          this.getAppId(),
          request.permissions.map(p => this.convertPermissionToRust(p)),
          request.duration || 3600
        )
        .accounts({
          permissionGrant: permissionPDA,
          payer: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      this.emit('permissions:granted', request.permissions);
      return request.permissions;
      
    } catch (error) {
      this.emit('permissions:failed', error);
      throw new Error(`Failed to grant permissions: ${error.message}`);
    }
  }

  /**
   * Log permission access (for audit trail)
   */
  async logPermissionAccess(
    permission: Permission,
    metadata?: string
  ): Promise<void> {
    const session = this.getSession();
    if (!session || !session.permissions.includes(permission)) {
      throw new Error('Permission not granted');
    }
    
    const [permissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('permission'),
        Buffer.from(session.nullifier, 'base64'),
        this.getAppId().toBuffer()
      ],
      this.program.programId
    );
    
    const accessAccount = Keypair.generate();
    
    await this.program.methods
      .logPermissionAccess(
        this.convertPermissionToRust(permission),
        metadata || ''
      )
      .accounts({
        permissionAccess: accessAccount.publicKey,
        permissionGrant: permissionPDA,
        payer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([accessAccount])
      .rpc();
    
    this.emit('permission:accessed', { permission, metadata });
  }

  /**
   * Revoke permissions
   */
  async revokePermissions(): Promise<void> {
    const session = this.getSession();
    if (!session) {
      throw new Error('No active session');
    }
    
    const [permissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('permission'),
        Buffer.from(session.nullifier, 'base64'),
        this.getAppId().toBuffer()
      ],
      this.program.programId
    );
    
    await this.program.methods
      .revokePermissions()
      .accounts({
        permissionGrant: permissionPDA,
        authority: this.wallet.publicKey,
      })
      .rpc();
    
    // Clear from local cache
    this.activePermissions.delete(session.nullifier);
    this.emit('permissions:revoked');
  }

  /**
   * Get app ID (derived from domain)
   */
  private getAppId(): PublicKey {
    const domain = window.location.hostname;
    const [appPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('app'), Buffer.from(domain)],
      this.program.programId
    );
    return appPDA;
  }

  /**
   * Convert SDK permission enum to Rust enum
   */
  private convertPermissionToRust(permission: Permission): any {
    const map: Record<Permission, any> = {
      [Permission.RevealWalletAddress]: { revealWalletAddress: {} },
      [Permission.RevealExactBalance]: { revealExactBalance: {} },
      [Permission.RevealTokenBalances]: { revealTokenBalances: {} },
      [Permission.RevealNFTList]: { revealNftList: {} },
      [Permission.RevealTransactionHistory]: { revealTransactionHistory: {} },
      [Permission.RevealStakingPositions]: { revealStakingPositions: {} },
      [Permission.RevealDeFiPositions]: { revealDefiPositions: {} },
      [Permission.SignTransactions]: { signTransactions: {} },
    };
    return map[permission];
  }
}
```

---

## Usage Example

```typescript
// App requesting permissions
const veiled = new Veiled({ network: 'devnet' });

// Option 1: No permissions (maximum privacy)
const session = await veiled.signIn();
// User sees: nullifier only

// Option 2: Request permissions
const session = await veiled.signIn({
  permissions: {
    permissions: [
      Permission.RevealWalletAddress,
      Permission.RevealNFTList
    ],
    reason: 'To display your NFT gallery',
    duration: 7200 // 2 hours
  }
});

// If user approves, session.permissions = [RevealWalletAddress, RevealNFTList]
// If user denies, session.permissions = []

// Later, log when you actually use the permission
if (session.permissions.includes(Permission.RevealWalletAddress)) {
  const address = wallet.publicKey.toBase58();
  
  // Log access for audit trail
  await veiled.logPermissionAccess(
    Permission.RevealWalletAddress,
    'User viewed profile page'
  );
}
```

---

## Summary

**SDK adds:**
1. ✅ Permission modal with warnings
2. ✅ `signIn()` can request permissions
3. ✅ `logPermissionAccess()` for audit trail
4. ✅ `revokePermissions()` for user control
5. ✅ Privacy impact calculation
6. ✅ Visual indicators (HIGH/MEDIUM/LOW risk)

**Time estimate:** 2-3 days

**Next:** Simple browser extension to show access logs
