import { memo, useEffect, useState } from 'react';
import { Input, Row, Space, Button, Alert } from 'antd';
import { YoutubeOutlined } from '@ant-design/icons';
import { useCopyToClipboard, useDebounce } from 'react-use';
import { IPC } from '@renderer/IPC';
import { useDBSWR } from '@renderer/hooks/useDBSWR';

const ChromeExecutablePath = memo(() => {
  const { data, isLoading, mutate } = useDBSWR<'Settings', 'getSettings'>(['Settings.getSettings']);
  const [isHaveGuessError, setIsHaveGuessError] = useState<boolean>(false);
  const [inputStr, setInputStr] = useState<string>('');
  const [isPathExist, setIsPathExist] = useState<boolean>(true);

  const [_, copyToClipboard] = useCopyToClipboard();
  const [, cancel] = useDebounce(
    () => {
      checkIfPathExist();
    },
    600,
    [inputStr],
  );

  useEffect(() => {
    setIsHaveGuessError(false);
  }, [inputStr]);

  useEffect(() => {
    setInputStr(data ? data.chromeExecutablePath ?? '' : '');

    if (!data || !data.chromeExecutablePath) {
      setIsHaveGuessError(false);
      //  尝试自动获取
      IPC.send('guessChromeExecutablePath').then((res) => {
        if (res) {
          setInputStr(res);
        } else {
          setIsHaveGuessError(true);
        }
      });
    }
  }, [data]);

  function handleCheckVideo() {
    IPC.send('openLink', 'https://www.youtube.com/watch?v=14IeZYocYVg');
    copyToClipboard('chrome://version/');
  }

  function checkIfPathExist() {
    IPC.send('browserPathExistAndExecutable', inputStr).then((res) => {
      setIsPathExist(res);

      if (res) {
        window.db.Settings.updateSettings({ chromeExecutablePath: inputStr });
      }
    });
  }

  function handleOnChange(ev) {
    setInputStr(ev.target.value);
  }

  if (!data) return <></>;
  return (
    <Space
      direction={'vertical'}
      className={'w-full'}
    >
      <Input
        placeholder={'请输入可执行的 Chrome 浏览器位置'}
        value={inputStr}
        onBlur={checkIfPathExist}
        onChange={handleOnChange}
      />
      {!isPathExist && inputStr && (
        <Alert
          type={'error'}
          description={'请输入正确的文件夹位置或检查该文件夹是否存在'}
        />
      )}
      {isHaveGuessError && (
        <div className={'text-red-500'}>无法自动获取可执行浏览器的位置，请手动设置。</div>
      )}

      <Row
        className={'w-full'}
        justify={'end'}
      >
        <Button
          icon={<YoutubeOutlined />}
          onClick={handleCheckVideo}
          type={'link'}
        >
          查看视频教程
        </Button>
      </Row>
    </Space>
  );
});

export default ChromeExecutablePath;
