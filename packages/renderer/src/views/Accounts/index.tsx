import React, { useState, useMemo, useEffect } from 'react';
import { useDBSWR } from '@renderer/hooks/useDBSWR';
import {
  Table,
  Input,
  Flex,
  Space,
  Tag,
  Spin,
  Typography,
  Card,
  message,
  Button,
  Modal,
  Switch,
} from 'antd';
import { PlayCircleOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import AddAccountsModal from './AddAccountsModal';
import { IPC } from '@renderer/IPC';
import { AccountStatusEnum } from '@mainTypes';

const { Search } = Input;
const { Title } = Typography;

// 账户状态的颜色映射
const statusColors = {
  waiting: 'default',
  running: 'processing',
  waiting_for_action: 'warning',
  error: 'error',
  success: 'success',
} as const;

// 账户状态的中文映射
const statusText = {
  waiting: '等待中',
  running: '运行中',
  waiting_for_action: '等待操作',
  error: '错误',
  success: '成功',
} as const;

interface AccountData {
  id: number;
  email: string;
  password: string;
  twoFactorCode: string;
  status: keyof typeof statusColors;
  logs: string;
  lastLoginTimestamp: number;
}

export default function Accounts() {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, isLoading, mutate } = useDBSWR<'Account', 'getAllAccounts'>([
    'Account.getAllAccounts',
  ]);
  const { data: settings, mutate: mutateSettings } = useDBSWR<'Settings', 'getSettings'>([
    'Settings.getSettings',
  ]);

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchText.trim()) return data;

    return data.filter(
      (account: AccountData) =>
        account.email.toLowerCase().includes(searchText.toLowerCase()) ||
        account.status.toLowerCase().includes(searchText.toLowerCase()) ||
        account.logs.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [data, searchText]);

  // 表格列定义
  const columns: ColumnsType<AccountData> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      render: (id: number) => <span style={{ fontSize: 12 }}>{id}</span>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 250,
      ellipsis: true,
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
      width: 150,
      ellipsis: true,
    },
    {
      title: '二步验证',
      dataIndex: 'twoFactorCode',
      key: 'twoFactorCode',
      width: 150,
      ellipsis: true,
      render: (code: string) => code || '',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: keyof typeof statusColors) => (
        <Tag color={statusColors[status]}>{statusText[status] || status}</Tag>
      ),
      filters: Object.keys(statusColors).map((status) => ({
        text: statusText[status as keyof typeof statusColors] || status,
        value: status,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '信息',
      dataIndex: 'logs',
      key: 'logs',
      ellipsis: true,
      render: (logs: string, record) => {
        if (
          record.status === AccountStatusEnum.WAITING_FOR_ACTION ||
          record.status === AccountStatusEnum.RUNNING
        ) {
          return (
            <Button
              type="link"
              size="small"
              onClick={() => {
                IPC.send('bringBrowserToFrontByAccountId', record.id);
              }}
            >
              查看
            </Button>
          );
        } else if (record.status === AccountStatusEnum.SUCCESS && record.lastLoginTimestamp) {
          return <span>{dayjs(record.lastLoginTimestamp).format('YYYY-MM-DD HH:mm:ss')}</span>;
        }
        return logs || '';
      },
    },
  ];

  // 行选择配置
  const rowSelection: TableRowSelection<AccountData> = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    onSelect: (record, selected, selectedRows) => {
      console.log('选择了账户:', record, selected, selectedRows);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      console.log('全选状态:', selected, selectedRows, changeRows);
    },
    columnWidth: 40,
  };

  useEffect(() => {
    const handleAccountDataChange = () => {
      mutate();
    };

    const remover = IPC.on('accountDataChange', handleAccountDataChange);

    return () => {
      remover();
    };
  }, []);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedRowKeys([]);
    message.success('已清空选择');
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Table<AccountData>
        title={() => (
          <Flex justify="space-between">
            <Space>
              <Space>
                <span>运行开关：</span>
                <Switch
                  checked={settings?.runFlag}
                  onChange={(checked) => {
                    window.db.Settings.updateRunFlag(checked).then(() => {
                      mutateSettings();
                    });
                  }}
                />
              </Space>
            </Space>
            <Space>
              <Search
                placeholder="搜索邮箱"
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%', maxWidth: 400 }}
              />
            </Space>
          </Flex>
        )}
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        pagination={false}
        scroll={{
          y: 540, // 固定表格高度
          x: 1000, // 水平滚动
        }}
        virtual // 启用虚拟滚动
        size="small"
        bordered
        showSorterTooltip={false}
        locale={{
          emptyText: searchText ? '没有找到匹配的数据' : '暂无数据',
        }}
        footer={() => (
          <Flex justify="space-between">
            <Space>
              <AddAccountsModal />
              <Button
                danger
                onClick={() => {
                  Modal.confirm({
                    title: '删除所选',
                    content: '确定要删除所选的账号吗？',
                    onOk: () => {
                      window.db.Account.deleteAccounts(selectedRowKeys.map(Number)).then(() => {
                        message.success('删除成功');
                        mutate();
                      });
                    },
                  });
                }}
                disabled={selectedRowKeys.length === 0}
                type="text"
              >
                删除所选
              </Button>
            </Space>

            <Space>
              <Button
                icon={<PlayCircleOutlined />}
                type="primary"
                disabled={!settings?.runFlag || selectedRowKeys.length === 0}
                onClick={() => {
                  const accountIDs = selectedRowKeys.map(Number);
                  const account = data?.filter((account) => accountIDs.includes(account.id));
                  const isHaveWaitingActionsAccount = account?.some(
                    (account) => account.status === AccountStatusEnum.WAITING_FOR_ACTION,
                  );

                  if (isHaveWaitingActionsAccount) {
                    Modal.confirm({
                      title: '有账号正在等待操作, 重新执行将会覆盖操作，是否继续？',
                      onOk: () => {
                        IPC.send('runAccountsByIDs', selectedRowKeys.map(Number));
                      },
                    });
                    return;
                  } else {
                    IPC.send('runAccountsByIDs', accountIDs);
                  }
                }}
              >
                运行选中账号
              </Button>
            </Space>
          </Flex>
        )}
      />
    </>
  );
}
