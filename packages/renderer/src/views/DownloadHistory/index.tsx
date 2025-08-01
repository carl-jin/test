import { useDBSWR } from '@renderer/hooks/useDBSWR';
import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Input, message, Tooltip, Space, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons';
import { IPC } from '@renderer/IPC';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface DownloadHistoryItem {
  id: number;
  filePath: string;
  accountEmail: string;
  createdAt: string | Date;
}

export default function DownloadHistory() {
  const { data, isLoading, mutate } = useDBSWR<'DownloadHistory', 'getAll'>([
    'DownloadHistory.getAll',
  ]);

  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const remover = IPC.on('downloadHistoryChange', () => {
      mutate();
    });

    return () => {
      remover();
    };
  }, []);

  // 从文件路径中提取文件名
  const getFileName = (filePath: string) => {
    return filePath.split(/[/\\]/).pop() || filePath;
  };

  // 处理文件操作按钮点击
  const handleFileAction = async (filePath: string) => {
    try {
      const fileExists = await IPC.send('checkFileExist', filePath);
      if (!fileExists) {
        message.error('文件不存在');
        return;
      }
      await IPC.send('showFileInFinder', filePath);
    } catch (error) {
      message.error('操作失败');
      console.error('File action error:', error);
    }
  };

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!data || !searchText) return data || [];

    return data.filter((item: DownloadHistoryItem) => {
      const fileName = getFileName(item.filePath);
      return (
        fileName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.filePath.toLowerCase().includes(searchText.toLowerCase()) ||
        item.accountEmail.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [data, searchText]);

  // 表格列定义
  const columns: ColumnsType<DownloadHistoryItem> = [
    {
      title: '文件名称',
      dataIndex: 'filePath',
      key: 'fileName',
      render: (filePath: string) => getFileName(filePath),
      ellipsis: true,
    },
    {
      title: '路径',
      dataIndex: 'filePath',
      key: 'filePath',
      ellipsis: {
        showTitle: true,
      },
    },
    {
      title: '账号',
      dataIndex: 'accountEmail',
      key: 'accountEmail',
      ellipsis: true,
    },
    {
      title: '下载时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend',
      render: (createdAt: string | Date) => {
        return <JustInTimeRender date={createdAt} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<FolderOpenOutlined />}
          onClick={() => handleFileAction(record.filePath)}
        >
          打开
        </Button>
      ),
    },
  ];

  useEffect(() => {
    console.log('DownloadHistory data:', data);
  }, [data]);

  return (
    <div style={{ padding: '16px' }}>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
      >
        <Table
          title={() => {
            return (
              <Flex style={{ width: '100%' }} justify="space-between">
                <div>
                  <Input
                    placeholder="搜索文件名、路径或账号..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: '300px' }}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      window.db.DownloadHistory.deleteAll().then(() => {
                        mutate();
                        message.success('删除成功');
                      });
                    }}
                    danger
                  >
                    删除全部
                  </Button>
                </Space>
              </Flex>
            );
          }}
          dataSource={filteredData}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          bordered
          pagination={false}
          scroll={{
            y: 'calc(100vh - 280px)',
            scrollToFirstRowOnChange: true,
          }}
          virtual
          size="small"
        />
      </Space>
    </div>
  );
}

function JustInTimeRender({ date }: { date: string | Date }) {
  const [time, setTime] = useState(dayjs(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(dayjs(date));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [date]);

  return <Tooltip title={time.format('YYYY-MM-DD HH:mm:ss')}>{time.fromNow()}</Tooltip>;
}
