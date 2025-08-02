/**
 * Google登录模块
 * 提取的浏览器启动和Google登录逻辑
 */

import { ElementHandle, Page } from 'playwright-core';
import totp from 'totp-generator';
import { bringToFront } from '@main/helpers/bringToFrontHelper';
import {
  AccountInfo,
  BrowserSession,
  LoginCallbacks,
  launchBrowserSession,
  sleep,
  addHighlightBorder,
  removeHighlightBorder,
} from './LoginCommon';
import { selectors, useSelector } from './CommonSelector';

// 执行Google登录流程
async function performGoogleLogin(
  page: Page,
  accountInfo: AccountInfo,
  callbacks?: LoginCallbacks,
): Promise<void> {
  if (!accountInfo) {
    throw new Error('账户信息是必需的！请提供 email、password 和 twoStepCode');
  }

  const {
    email: loginEmail,
    password: loginPassword,
    twoFactorCode: loginTwoStepCode,
  } = accountInfo;

  const { clickBySelector, isElementExist, deleteCookieConfirm } = useSelector(page);

  // 处理手动验证等待的通用函数
  async function waitForManualVerification(urlPattern: string) {
    await bringToFront(page, loginEmail);
    await addHighlightBorder(page);

    let isPassed = false;
    while (!isPassed) {
      try {
        await sleep(1);
        const url = await page.url();
        if (!url.includes(urlPattern)) {
          isPassed = true;
          break;
        }
      } catch (error) {
        await sleep(1);
      }
    }
    await removeHighlightBorder(page);
  }

  // 导航到Gmail
  await page.goto('https://www.hedra.com/login');

  await deleteCookieConfirm();

  // 点击 Sign in with Google
  await clickBySelector('_sign-in-with-google');

  // 开始处理 google 登入的逻辑
  await page.waitForURL('https://accounts.google.com/**');
  let isGoogleLogined = false;
  let lastUrl = '';
  let retryCount = 0;
  const noNeedCountUrlMatch = [
    'challenge/kpe',
    'challenge/ipe/verify',
    'challenge/iap',
    'challenge/recaptcha',
    'challenge/ipp/consent',
    'accounts/SetSID',
    'challenge/ipp/verify',
  ];

  while (!isGoogleLogined) {
    const url = (await page.url()).split('?')[0];
    if (url === lastUrl && retryCount != -1) {
      if (retryCount > 15) {
        if (url.includes('challenge/pwd')) {
          const error = new Error('账号或者密码错误！');
          callbacks?.onError?.(error);
          throw error;
        } else if (url.includes('challenge/totp')) {
          const error = new Error('二步验证码错误！');
          callbacks?.onError?.(error);
          throw error;
        }
        const error = new Error('重试次数过多，无法继续！');
        callbacks?.onError?.(error);
        throw error;
      }

      if (retryCount > 5 && url.includes('signin/identifier')) {
        retryCount = -1;
        await page.reload();
        continue;
      }

      if (!noNeedCountUrlMatch.some((_url) => url.includes(_url))) {
        retryCount++;
      }

      await sleep(1);
      continue;
    }
    retryCount = 0;

    lastUrl = url;

    if (
      !url.startsWith('https://accounts.google.com/') &&
      !url.includes('challenge/ipp/verify') &&
      !url.includes('accounts/SetSID')
    ) {
      isGoogleLogined = true;
      break;
    }

    // 输入邮箱操作
    if (url.includes(`signin/identifier`)) {
      await page.click('input[type="email"]');
      await sleep(0.5);
      await page.keyboard.type(loginEmail);
      await page.click('#identifierNext');
      continue;
    }

    // 输入密码操作
    if (url.includes(`challenge/pwd`)) {
      await page.focus('input[type="password"]');
      await sleep(0.5);
      await page.keyboard.type(loginPassword);
      await page.click('#passwordNext');
      continue;
    }

    // 输入 二步验证
    if (url.includes(`challenge/totp`)) {
      if (!loginTwoStepCode) {
        const error = new Error('二步验证码未配置！但却要输入二步验证码！');
        callbacks?.onError?.(error);
        throw error;
      }

      const telInput = page.locator('input[type="tel"]');
      await telInput.waitFor({ state: 'visible' });

      const code = totp(loginTwoStepCode.replaceAll(' ', ''));

      await telInput.fill(code);
      await sleep(0.5);

      await clickBySelector('next-button');
      continue;
    }

    // 同意授权
    if (url.includes('signin/oauth/id')) {
      await clickBySelector('continue-button');
      continue;
    }

    // 使用 passkey 登入的页面
    if (url.includes('signin/challenge/pk/presend')) {
      await clickBySelector('try-other-login-methods');
      continue;
    }

    // 选择其他验证方式（这里可以选择使用 二步验证）
    if (url.includes('challenge/selection')) {
      await sleep(2);
      const isTwoStepOptionExist = await isElementExist(
        'get-a-verification-code-from-google-authenticator',
      );
      if (isTwoStepOptionExist) {
        await clickBySelector('get-a-verification-code-from-google-authenticator');
      } else {
        await waitForManualVerification('challenge/selection');
      }
      continue;
    }

    // Confirm the recovery email address you added to your account:
    if (url.includes('challenge/kpe')) {
      await waitForManualVerification('challenge/kpe');
      continue;
    }

    // An email with a verification code was just sent to your email address
    if (url.includes('challenge/ipe/verify')) {
      await waitForManualVerification('challenge/ipe/verify');
      continue;
    }

    // 需要用户绑定手机号了
    if (url.includes('challenge/iap')) {
      await waitForManualVerification('challenge/iap');
      continue;
    }

    // 需要用户输入验证码
    if (url.includes('challenge/recaptcha')) {
      await waitForManualVerification('challenge/recaptcha');
      continue;
    }

    // 需要用户发送手机验证码
    if (url.includes('challenge/ipp/consent')) {
      await waitForManualVerification('challenge/ipp/consent');
      continue;
    }

    // 授权后重定向的链接
    if (url.includes('accounts/SetSID') || url.includes('challenge/ipp/verify')) {
      continue;
    }

    const error = new Error('未配置的链接');
    callbacks?.onError?.(error);
    throw error;
  }

  await page.waitForURL('https://www.hedra.com/app/home');

  await sleep(2);

  // 同意所有条款
  const checkboxes = await page.$$('.lucide-circle');
  await deleteCookieConfirm();

  for (const checkbox of checkboxes) {
    await checkbox.click();
  }

  // 点击创建账号
  await addHighlightBorder(page);
}

/**
 * 主要的登录方法
 * @param accountInfo 账户信息
 * @param callbacks 回调函数
 * @returns 浏览器会话信息
 */
export async function loginWithGoogle(
  accountInfo: AccountInfo,
  callbacks?: LoginCallbacks,
): Promise<BrowserSession> {
  let closeMenuall = false;
  try {
    // 启动浏览器会话
    const browserSession = await launchBrowserSession(accountInfo.email, callbacks);

    performGoogleLogin(browserSession.page, accountInfo, callbacks)
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
