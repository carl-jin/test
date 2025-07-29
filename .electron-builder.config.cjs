/**
 * But currently electron-builder doesn't support ESM configs
 * @see https://github.com/develar/read-config-file/issues/10
 */

/**
 * @type {() => import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = async function () {
  const { getVersion } = await import('./version/getVersion.mjs');

  return {
    productName: '自动登入',
    appId: 'com.simple-marker.autologinsoftware',
    artifactName: '自动登入.${version}-${arch}.${ext}',
    files: ['packages/**/dist/**', 'autoUpdateInstaller'],
    asar: false,
    mac: {
      category: 'public.app-category.utilities',
      icon: 'buildResources/icon.icns',
      target: {
        target: 'default',
        arch: ['x64', 'arm64'],
        // arch: ['arm64'],
      },
      type: 'distribution',
      hardenedRuntime: true,
      gatekeeperAssess: false,
    },
    linux: {
      target: [
        {
          target: 'deb',
          arch: 'x64',
        },
      ],
      maintainer: 'AutoLoginSoftware',
      icon: 'buildResources/icon.png',
    },
    deb: {
      artifactName: '自动登入.${version}-${arch}.${ext}',
    },
    win: {
      target: [
        {
          target: 'NSIS',
          arch: ['x64'],
        },
      ],
      icon: 'buildResources/icon.ico',
    },
    nsis: {
      deleteAppDataOnUninstall: false,
      artifactName: '自动登入.${version}-${arch}.${ext}',
    },
    extraMetadata: {
      version: getVersion(),
    },
  };
};
