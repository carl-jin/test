import { FolderOpenOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons';
import { RouterNameEnum } from '@renderer/enums';
import { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

export default [
  {
    key: RouterNameEnum.ACCOUNTS,
    icon: <HomeOutlined />,
    label: '账号管理',
  },
  {
    key: RouterNameEnum.SETTINGS,
    icon: <SettingOutlined />,
    label: '设置',
  },
  {
    key: RouterNameEnum.DOWNLOAD_HISTORY,
    icon: <FolderOpenOutlined />,
    label: '下载历史',
  },
] as MenuItem[];
