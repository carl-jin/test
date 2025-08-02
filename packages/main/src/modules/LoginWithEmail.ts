import { bringToFront } from '@main/helpers/bringToFrontHelper';
import type { AccountInfo, LoginCallbacks } from './LoginCommon';
import { addHighlightBorder, launchBrowserSession } from './LoginCommon';
import type { Page } from 'playwright-core';
import { useSelector } from './CommonSelector';
import { sleep } from './LoginCommon';

export async function loginWithEmail(accountInfo: AccountInfo, callbacks?: LoginCallbacks) {
  let closeMenuall = false;
  try {
    // 启动浏览器会话
    const browserSession = await launchBrowserSession(accountInfo.email, callbacks);

    performLoginWithEmail(browserSession.page, accountInfo, callbacks)
      .then(() => {
        if (closeMenuall) {
          return;
        }
        bringToFront(browserSession.page, accountInfo.email);
        callbacks?.onWaitingForActions?.();

        browserSession.page.on('close', () => {
          callbacks?.onSuccess?.();
        });
        browserSession.browser.on('disconnected', () => {
          callbacks?.onSuccess?.();
        });
      })
      .catch((error) => {
        if (closeMenuall) {
          return;
        }
        callbacks?.onError?.(error as Error);
        browserSession.closeBrowser();
      });

    return {
      ...browserSession,
      closeBrowser: async () => {
        closeMenuall = true;
        await browserSession.closeBrowser();
      },
    };
  } catch (error) {
    callbacks?.onError?.(error as Error);
    throw error;
  }
}

async function performLoginWithEmail(
  page: Page,
  accountInfo: AccountInfo,
  callbacks?: LoginCallbacks,
) {
  if (!accountInfo) {
    throw new Error('账户信息是必需的！请提供 email、password 和 twoStepCode');
  }

  const {
    email: loginEmail,
    password: loginPassword,
    twoFactorCode: loginTwoStepCode,
  } = accountInfo;

  const { clickBySelector, isElementExist, deleteCookieConfirm } = useSelector(page);

  const passwordValidate = validatePassword(loginPassword);
  if (!passwordValidate.isValid) {
    // todo 弹出密码不符合要求
    const error = new Error(passwordValidate.errors.join('\n'));
    callbacks?.onError?.(error);
    throw error;
  }

  // 导航到 sign-up 页面
  await page.goto('https://www.hedra.com/sign-up');

  await sleep(2);

  await deleteCookieConfirm();

  // 先输入账号密码
  const emailInput = await page.$('input[placeholder="E-mail"]');
  await emailInput?.fill(loginEmail);
  const passwordInput = await page.$('input[placeholder="Password"]');
  await passwordInput?.fill(loginPassword);
  const confirmPasswordInput = await page.$('input[placeholder="Confirm password"]');
  await confirmPasswordInput?.fill(loginPassword);

  await sleep(1);
  // 点击 使用 email登入
  await clickBySelector('_create-account-button');

  const res = await Promise.race([
    page
      .waitForSelector('input[placeholder="Enter verification code"]', {
        timeout: 30_000,
      })
      .then(() => ({ type: 'verification-code', element: null })),
    page
      .waitForSelector("//*[contains(text(),'This account already exists')]", {
        timeout: 30_000,
      })
      .then(() => ({ type: 'account-exists', element: null })),
  ]);

  // 根据返回的结果判断是哪个 promise 先返回
  if (res.type === 'account-exists') {
    throw new Error('该账户已存在');
  } else if (res.type === 'verification-code') {
    // 显示验证码输入框，继续后续流程
    console.log('验证码输入框已显示');
  }

  await page.waitForSelector('input[placeholder="Enter verification code"]', {
    timeout: 30_000,
  });

  // 在页面顶部注入一个提示div
  await page.evaluate(
    (loginEmail) => {
      const div = document.createElement('div');
      div.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background-color: white;
      color: red;
      text-align: center;
      padding: 10px;
      z-index: 9999;
      font-size: 16px;
      border-bottom: 1px solid #ccc;
    `;
      div.textContent = '邮箱：' + loginEmail;
      document.body.insertBefore(div, document.body.firstChild);
    },
    [loginEmail],
  );

  await addHighlightBorder(page);

  // 等待跳转回登入页面
  // 收到验证码通过后会返回 https://www.hedra.com/login?auth_state=confirmed
  setTimeout(async () => {
    let isLoginPage = false;
    while (!isLoginPage) {
      try {
        const res = await page.waitForURL('https://www.hedra.com/login?auth_state=confirmed', {
          timeout: 1_000,
        });
        isLoginPage = true;

        await sleep(1);
        await deleteCookieConfirm();

        // 输入密码登入
        const passwordInput = await page.$('input[placeholder="Password"]');
        await passwordInput?.fill(loginPassword);
        await sleep(1);
        await clickBySelector('_sign-in-with-email');

        await page.waitForURL('https://www.hedra.com/app/home');

        await sleep(2);

        // 同意所有条款
        const checkboxes = await page.$$('.lucide-circle');
        await deleteCookieConfirm();

        for (const checkbox of checkboxes) {
          await checkbox.click();
        }
      } catch (e) {
        isLoginPage = false;
      }
    }
  }, 1);
}

// 密码验证函数 - 检查密码是否符合要求
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查长度（至少8个字符）
  if (password.length < 8) {
    errors.push('密码长度至少需要8个字符');
  }

  // 检查是否包含至少1个小写字母
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少1个小写字母');
  }

  // 检查是否包含至少1个大写字母
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少1个大写字母');
  }

  // 检查是否包含至少1个数字
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少1个数字');
  }

  // 检查是否包含至少1个特殊字符
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少1个特殊字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
