const html = String.raw
const css = String.raw
const holdButtonStyles = new CSSStyleSheet()
holdButtonStyles.replaceSync(css`
  button {
    padding-block: 1rem;
    background-image: linear-gradient(0, rgba(0, 0, 0, 0.25) 0% 50%, transparent 50% 100%);
    background-size: 100% 200%;
  }
  button:active {
    animation-duration: var(--activation-delay, 1000ms);
    animation-fill-mode: forwards;
    animation-name: activate;
    animation-iteration-count: 1;
    animation-timing-function: linear;
  }
  @keyframes activate {
    from {
      background-position-y: 0%;
    }
    to {
      background-position-y: 100%;
    }
  }
`)

const timer = (ms: number, signal: AbortSignal) => new Promise((resolve, reject) => {
  const timerId = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => {
    clearTimeout(timerId)
    reject(new Error(signal.reason))
  })
})

/**
 * An example Custom Element. This documentation ends up in the
 * README so describe how this elements works here.
 *
 * You can event add examples on the element is used with Markdown.
 *
 * ```
 * <hold-button></hold-button>
 * ```
 */
class HoldButtonElement extends HTMLElement {
  static observedAttributes = ['activation-delay']

  #counter = 0
  #activationController: AbortController | null = null
  #renderRoot!: ShadowRoot
  #stylesheet = new CSSStyleSheet()

  get #button () {
    return this.#renderRoot.querySelector('button')
  }

  get activationDelay() {
    return Number(this.getAttribute('activation-delay')) || 1000
  }

  set activationDelay(value: number) {
    this.setAttribute('activation-delay', `${value}`)
  }

  connectedCallback(): void {
    this.#renderRoot = this.attachShadow({mode: 'open', delegatesFocus: true})
    this.#renderRoot.adoptedStyleSheets.push(holdButtonStyles, this.#stylesheet)
    this.#renderRoot.innerHTML = html`<button><slot></slot></button>`
    this.addEventListener('click', this)
    this.addEventListener('keydown', this)
    this.addEventListener('keyup', this)
    this.addEventListener('pointerdown', this)
    this.addEventListener('pointerup', this)
    this.addEventListener('pointercancel', this)
    this.addEventListener('mouseleave', this)
  }

  async handleEvent(event: Event) {
    if (event.type === 'pointerdown' || (event.type === 'keydown' && !(event as KeyboardEvent).repeat)) {
      console.log(event.type, event)
      this.#counter = Date.now()
      this.#activationController?.abort()
      const {signal} = this.#activationController = new AbortController()
      try {
        await timer(this.activationDelay, signal)
      } catch (e: Error) {
        if (e.name !== 'AbortError) throw e
      }
      this.#activate(event.type)
    } else if (event.type === 'pointercancel' || event.type === 'mouseleave') {
      this.#counter = 0
    } else if (event.type === 'keyup') {
      this.#activationController?.abort()
    } else if (event.type === 'click') {
      this.#activationController?.abort()
      const time = this.#counter && Date.now() - this.#counter
      console.log('click', event, time)
      if (time < this.activationDelay) {
        console.log('timed out')
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }
  }

  #activate(from: 'pointerdown' | 'keydown') {
    if (from === 'keydown') {
      this.dispatchEvent(new Event('click'))
    }
  }

  attributeChangedCallback(name: 'activation-delay', oldValue: string|null, newValue: string|null) {
    this.#stylesheet.replaceSync(`:host {
      --activation-delay: ${newValue}ms
    }`)
  }
}

declare global {
  interface Window {
    HoldButtonElement: typeof HoldButtonElement
  }
}

export default HoldButtonElement

if (!window.customElements.get('hold-button')) {
  window.HoldButtonElement = HoldButtonElement
  window.customElements.define('hold-button', HoldButtonElement)
}
