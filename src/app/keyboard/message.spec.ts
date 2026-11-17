import { TestBed } from '@angular/core/testing';
import { Message } from './message';

describe('Message', () => {
  let message: Message;

  beforeEach(() => {
    message = TestBed.inject(Message);
  });

  it('G1: starts empty with caps lock off', () => {
    expect(message.text()).toBe('');
    expect(message.caps()).toBe(false);
  });

  it('G2: adds typed text to the end', () => {
    message.type('h');
    message.type('i');
    expect(message.text()).toBe('hi');
  });

  it('G3: backspace removes the last character', () => {
    message.type('hi');
    message.backspace();
    expect(message.text()).toBe('h');
  });

  it('G4: backspace on an empty message does nothing', () => {
    expect(() => message.backspace()).not.toThrow();
    expect(message.text()).toBe('');
  });

  it('G5: clear empties the message', () => {
    message.type('hi there');
    message.clear();
    expect(message.text()).toBe('');
  });

  it('G6: caps lock stays on until it is turned off', () => {
    message.toggleCaps();
    expect(message.caps()).toBe(true);
    message.type('h');
    expect(message.caps()).toBe(true);
    message.toggleCaps();
    expect(message.caps()).toBe(false);
    message.type('i');
    expect(message.text()).toBe('Hi');
  });

  it('G7: caps lock leaves numbers and spaces as they are', () => {
    message.toggleCaps();
    message.type('1');
    message.type(' ');
    expect(message.text()).toBe('1 ');
  });
});
