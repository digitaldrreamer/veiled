// * Framework-agnostic API wrapper for sign-in widget
// * Allows using the React widget from vanilla JavaScript

import { createRoot, type Root } from 'react-dom/client'
import React from 'react'
import { SignInWidget, type SignInWidgetRef } from './sign-in-widget.js'
import type { VeiledAuth } from '../veiled-auth.js'
import type { WidgetConfig, WidgetInstance, WidgetState } from '../types/widget.js'
import type { Session } from '../types.js'

class SignInWidgetAPI implements WidgetInstance {
  private veiled: VeiledAuth
  private root: Root | null = null
  private container: HTMLElement | null = null
  private config: WidgetConfig | null = null
  private widgetRef: React.RefObject<SignInWidgetRef>
  private buttonElement: HTMLElement | null = null
  private isModalMode: boolean = false
  private modalContainer: HTMLElement | null = null // * Reference to modal container created by openAuthModal

  constructor(veiled: VeiledAuth) {
    this.veiled = veiled
    this.widgetRef = React.createRef<SignInWidgetRef>()
  }

  mount(target: HTMLElement, config: WidgetConfig): void {
    if (this.root) {
      this.update(config)
      return
    }

    // * If target is the modal container (created by openAuthModal), store reference
    if (target.id === 'veiled-auth-modal-container') {
      this.modalContainer = target
    }

    // * Create container
    this.container = document.createElement('div')
    this.container.id = 'veiled-sign-in-widget-root'
    this.container.className = 'veiled-widget'
    target.appendChild(this.container)

    // * Create React root
    this.root = createRoot(this.container)
    this.config = config

    // * Render widget
    this.root.render(
      React.createElement(SignInWidget, {
        ref: this.widgetRef,
        veiled: this.veiled,
        config: config,
        onClose: () => {
          if (this.isModalMode) {
            this.destroy()
          }
        },
      })
    )
  }

  update(config: WidgetConfig): void {
    if (!this.root || !this.config) {
      throw new Error('Widget not mounted. Call mount() first.')
    }

    this.config = { ...this.config, ...config }
    this.widgetRef.current?.updateConfig(this.config)
  }

  destroy(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    // * CRITICAL: Remove modal container if it exists (created by openAuthModal)
    if (this.modalContainer) {
      this.modalContainer.remove()
      this.modalContainer = null
    }
    // * Also check for modal container by ID (fallback)
    const modalContainerById = document.getElementById('veiled-auth-modal-container')
    if (modalContainerById) {
      modalContainerById.remove()
    }
    if (this.buttonElement) {
      this.buttonElement.remove()
      this.buttonElement = null
    }
    this.config = null
    this.isModalMode = false
  }

  open(): void {
    if (!this.root) {
      throw new Error('Widget not mounted. Call mount() first.')
    }
    // * Ensure container is visible and can receive pointer events
    if (this.container) {
      this.container.style.display = 'block'
      this.container.style.pointerEvents = 'auto'
    }
    if (this.modalContainer) {
      this.modalContainer.style.pointerEvents = 'auto'
    }
    this.widgetRef.current?.open()
  }

  close(): void {
    this.widgetRef.current?.close()
    // * Disable pointer events on modal container when closing
    if (this.modalContainer) {
      this.modalContainer.style.pointerEvents = 'none'
    }
    if (this.isModalMode) {
      this.destroy()
    }
  }

  retry(): void {
    this.widgetRef.current?.retry()
  }

  getState(): WidgetState {
    return this.widgetRef.current?.getState() || 'IDLE'
  }

  getProgress(): number {
    return this.widgetRef.current?.getProgress() || 0
  }

  getSession(): Session | null {
    return this.veiled.getSession()
  }

  // * Internal: Set button element (for renderButton)
  setButton(element: HTMLElement): void {
    this.buttonElement = element
  }

  // * Internal: Set modal mode (for openAuthModal)
  setModalMode(isModal: boolean): void {
    this.isModalMode = isModal
    // * Ensure modal container is visible when in modal mode
    if (isModal && this.container) {
      this.container.style.display = 'block'
      this.container.style.position = 'fixed'
      this.container.style.inset = '0'
      this.container.style.zIndex = '10000'
    }
  }

  // * Internal: Set modal container reference (for openAuthModal cleanup)
  setModalContainer(container: HTMLElement): void {
    this.modalContainer = container
  }
}

/**
 * * Creates a new sign-in widget instance
 * * @param veiled - VeiledAuth instance
 * @returns WidgetInstance for mounting and controlling the widget
 */
export function createSignInWidget(veiled: VeiledAuth): WidgetInstance {
  return new SignInWidgetAPI(veiled)
}

/**
 * * Renders a button that opens the sign-in modal
 * * @param veiled - VeiledAuth instance
 * @param target - CSS selector or HTMLElement where button should be rendered
 * @param config - Widget configuration
 * @returns WidgetInstance with button element
 */
export function renderButton(
  veiled: VeiledAuth,
  target: string | HTMLElement,
  config: WidgetConfig
): WidgetInstance {
  // * Resolve target element
  let targetElement: HTMLElement
  if (typeof target === 'string') {
    const element = document.querySelector(target)
    if (!element || !(element instanceof HTMLElement)) {
      throw new Error(`Target element not found: ${target}`)
    }
    targetElement = element
  } else {
    targetElement = target
  }

  // * Create button element
  const button = document.createElement('button')
  button.className = 'oauth-button'
  button.type = 'button'
  button.innerHTML = `<span class="oauth-button-text">${config.buttonText || '🔒 Sign in with Veiled'}</span>`

  // * Create widget container (hidden initially)
  const widgetContainer = document.createElement('div')
  widgetContainer.style.display = 'none'
  targetElement.appendChild(button)
  targetElement.appendChild(widgetContainer)

  // * Create widget instance
  const widget = createSignInWidget(veiled)
  widget.mount(widgetContainer, config)
  widget.setButton?.(button)

  // * Add click handler
  button.addEventListener('click', () => {
    widget.open()
  })

  return widget
}

/**
 * * Opens the sign-in modal programmatically
 * * @param veiled - VeiledAuth instance
 * * @param config - Widget configuration
 * * @returns WidgetInstance for controlling the modal
 */
export function openAuthModal(veiled: VeiledAuth, config: WidgetConfig): WidgetInstance {
  console.log('[openAuthModal] Creating modal...')
  
  // * Create modal container
  const modalContainer = document.createElement('div')
  modalContainer.id = 'veiled-auth-modal-container'
  modalContainer.style.position = 'fixed'
  modalContainer.style.inset = '0'
  modalContainer.style.zIndex = '10000'
  modalContainer.style.display = 'block'
  document.body.appendChild(modalContainer)
  console.log('[openAuthModal] Modal container created and appended to body')

  // * Create widget instance
  const widget = createSignInWidget(veiled)
  // * Store reference to modal container for cleanup
  widget.setModalContainer?.(modalContainer)
  widget.mount(modalContainer, config)
  widget.setModalMode?.(true)
  console.log('[openAuthModal] Widget mounted and modal mode set')

  // * Open immediately - use setTimeout to ensure React has rendered
  setTimeout(() => {
    console.log('[openAuthModal] Opening widget...')
    widget.open()
    console.log('[openAuthModal] Widget opened, state:', widget.getState())
  }, 100) // * Increased delay to ensure React has fully rendered

  return widget
}
