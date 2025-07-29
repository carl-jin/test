import { colorPrimary } from '@renderer/const';
import { RouterNameEnum } from '@renderer/enums';
import { useOpenLinkHooks } from '@renderer/hooks/useOpenLinkHooks';
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme, Layout, Menu, App as AntdApp, Flex } from 'antd';
import MenuItems from './menu';
import Router from './router';
import useThemeStore from '@renderer/store/theme';
import InjectGlobalAntdApp from '@renderer/components/InjectGlobalAntdApp';
import ZhCn from 'antd/locale/zh_CN';
import { useBackgroundMessage } from '@renderer/hooks/useBackgroundMessage';

const { Content, Sider } = Layout;

export default function App() {
  const { isDarkMode } = useThemeStore();

  useOpenLinkHooks();
  useBackgroundMessage();

  const [selectedKeys, setSelectedKeys] = useState<string[]>([RouterNameEnum.ACCOUNTS]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const customTheme = {
    token: {
      colorPrimary: colorPrimary,
      colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
      colorBgLayout: isDarkMode ? '#141414' : '#f0f2f5',
      colorText: isDarkMode ? '#ffffff' : '#000000',
    },
    components: {
      Menu: {
        darkItemBg: '#1a1a1a',
        darkSubMenuItemBg: '#1a1a1a',
        darkItemHoverBg: '#2c2c2c',
        darkItemSelectedBg: colorPrimary,
      },
      Layout: {
        siderBg: isDarkMode ? '#1a1a1a' : '#ffffff',
        headerBg: isDarkMode ? '#1a1a1a' : '#ffffff',
      },
    },
  };

  function handleRouterChange(ev) {
    setSelectedKeys(ev.key);
    Router.navigate(`/${ev.keyPath.reverse().join('/')}`);
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        ...customTheme,
      }}
      locale={ZhCn}
    >
      <AntdApp>
        <InjectGlobalAntdApp />
        <Layout style={{ minHeight: '100vh' }}>
          <Layout>
            <Sider
              collapsible={false}
              style={{
                background: customTheme.components.Layout.siderBg,
              }}
            >
              <div className={'flex flex-col justify-between h-full'}>
                <Menu
                  selectedKeys={selectedKeys}
                  theme={isDarkMode ? 'dark' : 'light'}
                  mode="inline"
                  multiple={false}
                  items={MenuItems}
                  onClick={handleRouterChange}
                  inlineIndent={18}
                  onOpenChange={(keys) => setOpenKeys(keys)}
                  openKeys={openKeys}
                />
              </div>
            </Sider>
            <Content
              className={'p-4'}
              style={{
                maxHeight: '100vh',
                overflow: 'auto',
                background: customTheme.token.colorBgContainer,
              }}
            >
              <RouterProvider router={Router} />
            </Content>
          </Layout>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}
