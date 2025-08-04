/**
 * 登录模块公共逻辑
 * 包含共享的类型定义、工具函数和浏览器会话管理
 */

import { Page, chromium, Browser } from 'playwright-core';
import path from 'path';
import { exec, ChildProcess } from 'child_process';
import getPort from 'get-port';
import { db } from '@main/db/DBServer';
import { app } from 'electron';
import { existsSync } from 'fs';

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
  onFileDownloaded?: (filePath: string) => void;
}

// 工具函数
export function sleep(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

export async function checkPortAvailable(port: number, timeout = 120000): Promise<boolean> {
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
export async function loadConfigs(): Promise<{
  executablePath: string;
}> {
  const settings = await db.Settings.getSettings();
  const executablePath = settings.chromeExecutablePath;

  return {
    executablePath,
  };
}

// 生成配置文件路径
export function generateProfilePath(email: string): string {
  const folderPath = path.join(app.getPath('userData'), 'tmp-profiles');
  const profilePath = path.join(
    folderPath,
    `${email.replaceAll('@', '_').replaceAll('.', '_').trim()}`,
    `profile-${Math.random().toString(36).substring(2, 15)}`,
  );

  return profilePath;
}

// 计算窗口位置
export function calculateWindowPosition(port: number, email?: string): { x: number; y: number } {
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
export function launchBrowserProcess(
  port: number,
  profilePath: string,
  configs: any,
  email: string,
): ChildProcess {
  const windowPosition = calculateWindowPosition(port, email);
  let extPaths: string[] = [];

  if (ifVpnExtExist()) {
    extPaths.push(path.join(app.getPath('userData'), 'ext', 'vpnExtension'));
  }

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

    ...(extPaths.length > 0
      ? ['--disable-extensions-except=' + extPaths.map((str) => `"${str}"`).join(',')]
      : []),
    ...(extPaths.length > 0 ? ['--load-extension=' + extPaths.map((str) => `"${str}"`).join(',')] : []),
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
export async function getAvailablePort(): Promise<number> {
  const port = await getPort();
  return port;
}

// 启动浏览器会话
export async function launchBrowserSession(
  email: string,
  callbacks?: LoginCallbacks,
): Promise<BrowserSession> {
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

  // 链接 VPN
  {
    if (ifVpnExtExist()) {
      await page.goto('chrome-extension://omghfjlpggmjjaagoclmmobgdodcjboh/popup/popup.html');
      // 等待页面加载完成
      await page.waitForLoadState('networkidle');

      if (await page.$(`input[value="Accept"]`)) {
        await page.click(`input[value="Accept"]`);
      }

      await page.waitForSelector("//*[contains(text(),'Start VPN')]");
      await page.click("//*[contains(text(),'Start VPN')]");

      await page.waitForSelector('text=Your Privacy is protected');
    }
  }

  // >>>>>>>>>>>>>> WORKAROUND TO MAKE chrome.downloads.onDeterminingFilename WORK
  const session = await context.newCDPSession(page);
  session.on('Browser.downloadProgress', (event) => {
    if (event.state === 'completed' && event.filePath) {
      callbacks?.onFileDownloaded?.(event.filePath);
    }
  });
  await session.send('Browser.setDownloadBehavior', {
    behavior: 'default',
    eventsEnabled: true,
  });
  // <<<<<<<<<<<<<<

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

export async function addHighlightBorder(page: Page) {
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

export async function removeHighlightBorder(page: Page) {
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

function ifVpnExtExist() {
  const vpnExtPath = path.join(app.getPath('userData'), 'ext', 'vpnExtension');
  if (existsSync(vpnExtPath)) {
    return true;
  }
  return false;
}
