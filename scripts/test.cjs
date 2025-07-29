const { autoLogin } = require('../packages/main/dist/workers/autoLogin.cjs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { name } = require('../package.json');

const userTmpFolderPath = join(tmpdir(), name);

//  贴文任务
async function main() {
  const account = JSON.parse(
    decodeURIComponent(
      atob(
        `JTdCJTIyaWQlMjIlM0E5NDglMkMlMjJuYW1lJTIyJTNBJTIyJUU3JUIzJUJCJUU3JUJCJTlGJUU1JUI4JTkwJUU2JTg4JUI3JTIwLSUyMENsb25lJTIyJTJDJTIyZW1haWwlMjIlM0ElMjJ0b21ncmltbTIwMTclNDBvdXRsb29rLmNvbSUyMiUyQyUyMnBhc3N3b3JkJTIyJTNBJTIySndzeWxlMTM5NyUyQiUyMiUyQyUyMnR3b1N0ZXBDb2RlJTIyJTNBJTIyJTIyJTJDJTIyY3VycmVudFN0ZXAlMjIlM0ElMjIlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJET05FJTIyJTJDJTIyZXJyb3IlMjIlM0FudWxsJTJDJTIyc2hvdWxkRGVsZXRlJTIyJTNBZmFsc2UlMkMlMjJ0eXBlJTIyJTNBJTIyT1VUTE9PSyUyMiU3RA==`,
      ),
    ),
  );

  console.log(account);

  await autoLogin({
    props: {
      debug: true,
      account,
      onSucceeded(taskId) {
        console.log('onSucceeded', taskId);
      },
      onAccountUpdate() {},
      onBringToFrontFnSet() {},
    },
    browserOptions: {
      headless: false,
    },
    logger: console,
    onError: (e) => {
      console.error('终止任务', e.toString());
    },
  });
}

main();
