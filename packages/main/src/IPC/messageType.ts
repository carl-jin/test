import { message } from 'antd';

export type RenderMessage = {
  //  打开一个浏览器地址
  openLink(link: string): Promise<void>;
  //  获取一些需要注入到 renderer 的 window 变量上的值
  getInjectGlobalVars(): Promise<any>;

  //  尝试根据系统不同，猜测 chrome 浏览器位置
  guessChromeExecutablePath(): Promise<string | undefined>;

  //  检查浏览器路径是否存在且可执行
  browserPathExistAndExecutable(path: string): Promise<boolean>;
  (path: string): Promise<boolean>;

  runAccountsByIDs(ids: number[], type: 'google' | 'email'): Promise<void>;

  //  根据账号 ID 置顶浏览器
  bringBrowserToFrontByAccountId(id: number): Promise<void>;

  checkFileExist(filePath: string): Promise<boolean>;

  showFileInFinder(filePath: string): Promise<void>;
};

export type MainMessage = {
  //  前端显示消息
  showMessage(type: keyof typeof message, msg: string): void;
  //  告诉前端有新的错误信息（logger）
  haveNewError(): void;

  reloadTasks(): void;

  // 通知前端账号数据有变化
  accountDataChange(): void;

  // downloa history change
  downloadHistoryChange(): void;
};
