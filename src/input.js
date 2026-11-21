/* ═══════════════════════════════════════════════════════════════
   RC RUSH — input (touch buttons + keyboard)
   ═══════════════════════════════════════════════════════════════ */

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.brake = false;
    this.boost = false;
    this.steer = 0;
    this.steerTarget = 0;
    this.enabled = false;
    this.onPause = null;
    this.onAny = null;
    this.pointers = new Map();
    this.buttons = [];
    this.keyMap = new Map();
    this._bindKeys();
  }

  _bindKeys() {
    const down = e => {
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        if (this.onPause) { e.preventDefault(); this.onPause(); }
        return;
      }
      if (!this.enabled) return;
      if (['arrowleft', 'a', 'arrowright', 'd', 'arrowdown', 's', ' ', 'shift'].includes(k)) e.preventDefault();
      if (k === 'arrowleft' || k === 'a') this.left = true;
      if (k === 'arrowright' || k === 'd') this.right = true;
      if (k === 'arrowdown' || k === 's' || k === 'shift') this.brake = true;
      if (k === ' ' || k === 'arrowup' || k === 'w') this.boost = true;
      if (this.onAny) this.onAny();
    };
    const up = e => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.left = false;
      if (k === 'arrowright' || k === 'd') this.right = false;
      if (k === 'arrowdown' || k === 's' || k === 'shift') this.brake = false;
      if (k === ' ' || k === 'arrowup' || k === 'w') this.boost = false;
    };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => this.releaseAll());
  }

  bindButtons(root = document) {
    this.buttons = [...root.querySelectorAll('[data-action]')];
    for (const btn of this.buttons) {
      const action = btn.dataset.action;
      const press = e => {
        if (!this.enabled) return;
        e.preventDefault();
        btn.classList.add('pressed');
        try { btn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        this.pointers.set(e.pointerId, action);
        this._setAction(action, true);
        if (this.onAny) this.onAny();
      };
      const release = e => {
        const act = this.pointers.get(e.pointerId);
        if (act) {
          this.pointers.delete(e.pointerId);
          const still = [...this.pointers.values()].includes(act);
          if (!still) {
            btn.classList.remove('pressed');
            this._setAction(act, false);
          }
        } else {
          btn.classList.remove('pressed');
          this._setAction(action, false);
        }
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    }
  }

  _setAction(action, on) {
    if (action === 'left') this.left = on;
    if (action === 'right') this.right = on;
    if (action === 'brake') this.brake = on;
    if (action === 'boost') this.boost = on;
  }

  update(dt) {
    this.steerTarget = (this.right ? 1 : 0) - (this.left ? 1 : 0);
    const rate = this.steerTarget === 0 ? 11 : 9.5;
    this.steer += (this.steerTarget - this.steer) * Math.min(1, dt * rate);
    if (Math.abs(this.steer) < 0.002) this.steer = 0;
    return this.steer;
  }

  releaseAll() {
    this.left = this.right = this.brake = this.boost = false;
    this.pointers.clear();
    for (const b of this.buttons) b.classList.remove('pressed');
  }

  reset() {
    this.releaseAll();
    this.steer = 0;
    this.steerTarget = 0;
  }
}
