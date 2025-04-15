import { Observable } from '@nativescript/core'

export class HelloWorldModel extends Observable {
  private _counter: number
  private _message: string

  constructor() {
    super()

    // Initialize default values.
    this._counter = 42
    this.updateMessage()
  }

  get message(): string {
    return this._message
  }

  set message(value: string) {
    if (this._message !== value) {
      this._message = value
      this.notifyPropertyChange('message', value)
    }
  }

  onTap() {
    this._counter--
    this.updateMessage()

    // Test A: Test JavaScript crash
    throw new Error('Intentional crash for Sentry testing');

    // Test B: Test Native crash
    // comment test a above and uncomment below
    // if (__ANDROID__) {
    //   const crash = new java.lang.String(null);
    // } else if (__APPLE__) {
    //   const crash = NSString.stringWithString(null);
    // }
  }

  private updateMessage() {
    if (this._counter <= 0) {
      this.message = 'Hoorraaay! You unlocked the NativeScript clicker achievement!'
    } else {
      this.message = `${this._counter} taps left`
    }
  }
}
