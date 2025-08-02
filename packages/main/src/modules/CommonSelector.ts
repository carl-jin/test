import { Page, ElementHandle } from 'playwright-core';

// 选择器定义
export const selectors: Record<string, Array<string>> = {
  '_cky-consent-container': ['.cky-consent-container'],
  '_sign-in-with-google': ["//*[contains(text(),'Sign in with Google')]"],
  '_sign-in-with-email': ["//*[contains(text(),'Sign in with e-mail')]"],
  '_create-account-button': ["//button[contains(text(),'Create an account')]"],
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

export function useSelector(page: Page) {
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

  return {
    clickBySelector,
    isElementExist,
    getElement,
    deleteCookieConfirm,
  };
}
