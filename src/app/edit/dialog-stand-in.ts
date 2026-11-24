type DialogMethod = 'showModal' | 'close';

/**
 * A stand-in for modal dialogs in the unit tests, whose page has none. `showModal` marks the
 * dialog open, and `close` marks it closed and tells of it, as a browser does.
 * It returns the function that puts the page back as it was.
 */
export function standInForDialog(): () => void {
  const prototype = HTMLDialogElement.prototype;
  const before: Record<DialogMethod, PropertyDescriptor | undefined> = {
    showModal: Object.getOwnPropertyDescriptor(prototype, 'showModal'),
    close: Object.getOwnPropertyDescriptor(prototype, 'close'),
  };
  Object.defineProperty(prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
  return () => {
    for (const name of ['showModal', 'close'] as const) {
      const descriptor = before[name];
      if (descriptor) {
        Object.defineProperty(prototype, name, descriptor);
      } else {
        Reflect.deleteProperty(prototype, name);
      }
    }
  };
}
