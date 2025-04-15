import { Application, Trace, TraceErrorHandler } from "@nativescript/core";
import * as Sentry from "@nativescript-community/sentry";

declare const __SENTRY_DIST__: string;
declare const __SENTRY_RELEASE__: string;
declare const __SENTRY_ENVIRONMENT__: string;
declare const __ENABLE_SENTRY__: boolean;
declare const __SENTRY_PREFIX__: string;
declare const __SENTRY_DSN_IOS__: string;
declare const __SENTRY_DSN_ANDROID__: string;

let initialized = false;

export function initSentry() {
  if (initialized || !__ENABLE_SENTRY__) {
    return;
  }
  initialized = true;
  Sentry.init({
    dsn: __APPLE__ ? __SENTRY_DSN_IOS__ : __SENTRY_DSN_ANDROID__,
    debug: __DEV__,
    enableAppHangTracking: false,
    enableNativeCrashHandling: true,
    enableAutoPerformanceTracking: true,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    dist: __SENTRY_DIST__,
    release: __SENTRY_RELEASE__,
    environment: __SENTRY_ENVIRONMENT__,
    appPrefix: __SENTRY_PREFIX__,
    appHangsTimeoutInterval: 5,
  });

  Application.on("uncaughtError", (event) => {
    Sentry.captureException(event.error);
  });

  Application.on("discardedError", (event) => {
    Sentry.captureException(event.error);
  });

  // Register errorHandler
  Trace.setErrorHandler(errorHandler);
}

const errorHandler: TraceErrorHandler = {
  handlerError(error: Error) {
    if (__DEV__) {
      // (development) - log it
      console.error(error);
      // (development) - or use Trace writing (categorical logging)
      Trace.write(error, Trace.categories.Error);
      // (development) - throw it
      throw error;
    }

    // (production) - send it to sentry
    Sentry.captureException(error);
  },
};

export function isInitialized() {
  return __ENABLE_SENTRY__ && initialized;
}
