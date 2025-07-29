import { App } from 'antd';

export default function InjectGlobalAntdApp() {
  window.antdApp = App.useApp();

  return <></>;
}
