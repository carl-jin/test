import { defineEVDConfig } from 'electron-version-deployer-cli';

export default defineEVDConfig({
  compileCommand: 'evd:prepare',
  changelogsPath: 'CHANGELOG.md',
  sources: {
    folder: 'dist/mac-arm64/自动登入.app/Contents/Resources/app',
    nodeModules: 'node_modules',
    codes: 'packages',
    packageJSON: 'package.json',
  },
  cloudflare: {
    url: 'https://auto-login-software-main.pages.dev',
    token: `JnVMe6WzXThRx2veoHqtqIUV-oM6Jwm-FlPQElfr`,
    projectName: `auto-login-software-main`,
  },
  prebuiltConfig: {
    sqlite3: {
      files: [
        'napi-v6-darwin-unknown-arm64.tar.gz',
        'napi-v6-darwin-unknown-x64.tar.gz',
        'napi-v6-win32-unknown-x64.tar.gz',
        'napi-v6-linux-glibc-x64.tar.gz',
      ],
      //  相对于 sqlite3 这个包的存放位置
      outputPath: ['lib', 'binding'],
    },
  },
});
