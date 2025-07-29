import './styles/tailwind.css';
import './styles/global.less';
import './styles/antd.less';
import 'antd/dist/reset.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn.js';
import relativeTime from 'dayjs/plugin/relativeTime';
import { injectDBClient } from '@renderer/helpers/InjectDBClient';
import { injectGlobalVars } from '@renderer/helpers/injectGlobalVars';
import { SWRProvider } from '@renderer/providers/SWRProvider';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

(async () => {
  await injectGlobalVars();
  await injectDBClient();

  const container = window.document.getElementById('root') as HTMLDivElement;
  const root = createRoot(container);
  root.render(
    <SWRProvider>
      <App />
    </SWRProvider>,
  );
})();
