const webpack = require("@nativescript/webpack");
const { resolve, join, relative } = require("path");
const { readFileSync } = require("fs");
const { parse } = require("plist");
require("dotenv").config();

const SentryCliPlugin = require("@sentry/webpack-plugin").sentryWebpackPlugin;
const SourceMapDevToolPlugin = require("webpack").SourceMapDevToolPlugin;

const SENTRY_PREFIX = process.env.SENTRY_PREFIX || "app:///";
const SENTRY_SOURCE_MAP_PATH = join(__dirname, "dist", "sourcemaps");

module.exports = (env) => {
  webpack.init(env);

  webpack.chainWebpack((config) => {
    const isStoreBuild = !!env.production;
    const sentryDev = !isStoreBuild;
    let projectSlug;
    let versionString;
    if (webpack.Utils.platform.getPlatformName() === "android") {
      projectSlug = process.env.SENTRY_PROJECT_SLUG_ANDROID;
      const appGradle = readFileSync(
        resolve(__dirname, "App_Resources/Android/app.gradle"),
        "utf8"
      );
      const match = appGradle.match(/versionName\s+"([^"]+)"/);
      versionString = match ? match[1] : null;
    } else {
      projectSlug = process.env.SENTRY_PROJECT_SLUG_IOS;
      versionString = parse(
        readFileSync(resolve(__dirname, "App_Resources/iOS/Info.plist"), "utf8")
      )["CFBundleShortVersionString"];
    }
    const SENTRY_DIST = sentryDev
      ? `dev-${Date.now()}`
      : `${Date.now()}` || "0";
    const SENTRY_RELEASE = sentryDev
      ? `dev-${Date.now()}`
      : versionString || "0";

    config.plugin("DefinePlugin").tap((args) => {
      Object.assign(args[0], {
        __SENTRY_DIST__: `'${SENTRY_DIST}'`,
        __SENTRY_RELEASE__: `'${SENTRY_RELEASE}'`,
        __SENTRY_ENVIRONMENT__: `'${
          isStoreBuild ? "production" : "development"
        }'`,
        __ENABLE_SENTRY__: true,
        __SENTRY_PREFIX__: `'${SENTRY_PREFIX}'`,
        __SENTRY_DSN_IOS__: JSON.stringify(process.env.SENTRY_DSN_IOS),
        __SENTRY_DSN_ANDROID__: JSON.stringify(process.env.SENTRY_DSN_ANDROID),
      });
      return args;
    });

    config.devtool(false);

    config.plugin("SourceMapDevToolPlugin|sentry").use(SourceMapDevToolPlugin, [
      {
        append: `\n//# sourceMappingURL=${SENTRY_PREFIX}[name].js.map`,
        filename: relative(
          webpack.Utils.platform.getAbsoluteDistPath(),
          join(SENTRY_SOURCE_MAP_PATH, "[name].js.map")
        ),
      },
    ]);

    config
      .plugin("SentryCliPlugin")
      .init(() =>
        SentryCliPlugin({
          org: process.env.SENTRY_ORG_SLUG,
          project: projectSlug,
          // force ignore non-legacy sourcemaps
          sourcemaps: {
            assets: "/dev/null",
          },
          release: {
            uploadLegacySourcemaps: {
              paths: [
                join(__dirname, "dist", "sourcemaps"),
                webpack.Utils.platform.getAbsoluteDistPath(),
              ],
              urlPrefix: SENTRY_PREFIX,
            },
            dist: SENTRY_DIST,
            cleanArtifacts: true,
            deploy: {
              env: sentryDev ? "development" : "production",
            },
            setCommits: {
              auto: true,
              ignoreMissing: true,
            },
            ...(SENTRY_RELEASE ? { name: SENTRY_RELEASE } : {}),
          },
          authToken: process.env.SENTRY_AUTH_TOKEN,
        })
      )
      .use(SentryCliPlugin);

    config.optimization.minimizer("TerserPlugin").tap((args) => {
      // we format here otherwise the sourcemaps will be broken
      args[0].terserOptions.format = {
        ...args[0].terserOptions.format,
        max_line_len: 1000,
        indent_level: 1,
      };
      return args;
    });
  });

  return webpack.resolveConfig();
};
