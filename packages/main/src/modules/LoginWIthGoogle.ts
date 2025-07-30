/**
 * Google登录模块
 * 提取的浏览器启动和Google登录逻辑
 */

import { ElementHandle, Page, chromium, Browser } from 'playwright-core';
import totp from 'totp-generator';
import path from 'path';
import { exec, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import getPort from 'get-port';
import { db } from '@main/db/DBServer';
import { app } from 'electron';
import { bringToFront } from '@main/helpers/bringToFrontHelper';

// 账户信息接口
export interface AccountInfo {
  email: string;
  password: string;
  twoFactorCode?: string;
}

// 浏览器会话接口
export interface BrowserSession {
  browser: Browser;
  page: Page;
  port: number;
  profilePath: string;
  process: ChildProcess;
  closeBrowser: () => Promise<void>;
}

// 回调函数接口
export interface LoginCallbacks {
  onSuccess?: () => void;
  onWaitingForActions?: () => void;
  onError?: (error: Error) => void;
}

// 选择器定义
const selectors: Record<string, Array<string>> = {
  '_cky-consent-container': ['.cky-consent-container'],
  '_sign-in-with-google': ["//*[contains(text(),'Sign in with Google')]"],
  'try-other-login-methods': [
    "//span[contains(text(),'Try another way') or contains(text(),'其他登录方式') or contains(text(),'其他登入方式')]",
  ],
  'get-a-verification-code-from-google-authenticator': [
    "//strong[contains(text(),'Google Authenticator') or contains(text(),'Google 验证器') or contains(text(),'Google 驗證器')]",
  ],
  'next-button': ["//span[text()='Next' or text()='下一步']"],
  'continue-button': ["//span[text()='Continue' or text()='继续' or text()='繼續']"],
  'create-an-account-button': [
    "//div[contains(@class,'md:flex')]//span[text()='Create an account' or text()='创建账户' or text()='建立帳號']",
  ],
};

type SelectorType = keyof typeof selectors;

// 工具函数
function sleep(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

async function checkPortAvailable(port: number, timeout = 120000): Promise<boolean> {
  const maxAttempts = Math.ceil(timeout / 1000);
  let attempts = 0;

  const checkPort = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        const data = await response.json();
        if (data && data.webSocketDebuggerUrl) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  do {
    if (await checkPort()) {
      return true;
    }
    attempts++;
    if (attempts < maxAttempts) {
      await sleep(1);
    }
  } while (attempts < maxAttempts);

  return false;
}

// 从 configs.json 加载配置
async function loadConfigs(): Promise<{
  executablePath: string;
}> {
  const settings = await db.Settings.getSettings();
  const executablePath = settings.chromeExecutablePath;

  return {
    executablePath,
  };
}

// 生成配置文件路径
function generateProfilePath(email: string): string {
  const folderPath = path.join(app.getPath('userData'), 'tmp-profiles');
  const profilePath = path.join(
    folderPath,
    `${email.replaceAll('@', '_').replaceAll('.', '_').trim()}`,
    `profile-${Math.random().toString(36).substring(2, 15)}`,
  );

  return profilePath;
}

// 计算窗口位置
function calculateWindowPosition(port: number, email?: string): { x: number; y: number } {
  let hash = port;
  if (email) {
    for (let i = 0; i < email.length; i++) {
      hash = ((hash << 5) - hash + email.charCodeAt(i)) & 0xffffffff;
    }
  }

  const xOffset = Math.abs(hash) % 8;
  const yOffset = Math.abs(hash >> 8) % 6;

  const baseX = 50;
  const baseY = 50;
  const xOffsetStep = 150;
  const yOffsetStep = 120;

  const x = baseX + xOffset * xOffsetStep;
  const y = baseY + yOffset * yOffsetStep;

  const maxX = 1920 - 1080 - 50;
  const maxY = 1080 - 720 - 100;

  return {
    x: Math.min(x, maxX),
    y: Math.min(y, maxY),
  };
}

// 启动浏览器进程
function launchBrowserProcess(
  port: number,
  profilePath: string,
  configs: any,
  email: string,
): ChildProcess {
  const windowPosition = calculateWindowPosition(port, email);

  const launchArgs = [
    `--user-data-dir="${path.dirname(profilePath)}"`,
    `--profile-directory="${path.basename(profilePath)}"`,
    `--remote-debugging-port=${port}`,
    `--no-first-run`,
    `--width=1080`,
    `--height=720`,
    `--window-position=${windowPosition.x},${windowPosition.y}`,
    `--window-name=${path.basename(profilePath)}`,
    `--no-default-browser-check`,
    `--disable-extensions-file-access-check`,
    `--disable-save-password-bubble`,
    `--disable-prompt-on-repost`,
    `--window-size=1080,720`,
    `--lang=en-US`,
    `--window-name=${btoa(email).replace(/=/g, '')}`,
  ];

  const executablePath = configs.executablePath;

  if (!configs.executablePath) {
    throw new Error('executablePath 未配置！');
  }

  const command = [`"${executablePath}"`, ...launchArgs].join(' ');

  const browserProcess = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行命令时出错: ${error.message}`);
      return;
    }
  });

  return browserProcess;
}

// 获取可用端口
async function getAvailablePort(): Promise<number> {
  const port = await getPort();
  return port;
}

// 启动浏览器会话
async function launchBrowserSession(email: string): Promise<BrowserSession> {
  const configs = await loadConfigs();
  const port = await getAvailablePort();
  const profilePath = generateProfilePath(email);

  const browserProcess = launchBrowserProcess(port, profilePath, configs, email);

  const isPortAvailable = await checkPortAvailable(port, 30_000);
  if (!isPortAvailable) {
    throw new Error(`浏览器启动超时 端口 ${port} 未能成功打开`);
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
    timeout: 10_000,
  });

  const context = browser.contexts()[0];
  const page = await context.newPage();

  const closeBrowser = async () => {
    try {
      browserProcess.kill();
      await browser.close();
    } catch (error) {
      // 忽略关闭错误
    }
  };

  return {
    browser,
    page,
    port,
    profilePath,
    process: browserProcess,
    closeBrowser,
  };
}

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

  function clickBySelector(selector: SelectorType): Promise<void> {
    return page.click(selectors[selector].join(','));
  }

  async function isElementExist(selector: SelectorType): Promise<boolean> {
    return (await page.$$(selectors[selector].join(','))).length > 0;
  }

  async function getElement(selector: SelectorType): Promise<ElementHandle<HTMLDivElement>> {
    return (await page.$$(selectors[selector].join(',')))[0] as ElementHandle<HTMLDivElement>;
  }

  async function deleteCookieConfirm() {
    if (await isElementExist('_cky-consent-container')) {
      const el = await getElement('_cky-consent-container');
      await el.evaluate((el) => el.remove());
    }
  }

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

  callbacks?.onSuccess?.();
}

async function addHighlightBorder(page: Page) {
  await page.addStyleTag({
    content: `
          @keyframes redBorderBlink {
            0% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, inset 0 0 20px #ff0000; }
            50% { border-color: #ffaaaa; box-shadow: 0 0 30px #ffaaaa, inset 0 0 30px #ffaaaa; }
            100% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, inset 0 0 20px #ff0000; }
          }
          
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 8px solid #ff0000;
            box-shadow: inset 0 0 20px #ff0000, 0 0 20px #ff0000;
            pointer-events: none;
            z-index: 999999;
            animation: redBorderBlink 2s infinite;
          }
        `,
  });
}

async function removeHighlightBorder(page: Page) {
  try {
    await page.evaluate(() => {
      const styleEl = document.querySelectorAll('style');
      for (const style of styleEl) {
        if (style.textContent?.includes('redBorderBlink')) {
          style.remove();
        }
      }
    });
  } catch (error) {
    // 如果页面跳转的话，这个可能会报错
  }
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
    const browserSession = await launchBrowserSession(accountInfo.email);

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
