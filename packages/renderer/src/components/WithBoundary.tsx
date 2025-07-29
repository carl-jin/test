import { ErrorBoundary } from 'react-error-boundary';
import { Result, Space, Button, message } from 'antd';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { copyTextToClipboard } from '@renderer/utils/utils';

let pathName: string = '';
let error: TypeError = null;
function FallbackRender() {
  function handleCopyErrors() {
    copyTextToClipboard(
      JSON.stringify({
        pathname: pathName,
        msg: error.toString(),
        stack: error.stack,
      }),
    );

    message.success('复制成功，请发送给开发者。');
  }
  return (
    <Result
      status={500}
      title="错误"
      subTitle={
        <Space direction={'vertical'}>
          <div>你遇到了一个致命性的错误，请保留现场并与开发者联系</div>
          <Button
            type={'primary'}
            onClick={handleCopyErrors}
          >
            复制报错信息
          </Button>
        </Space>
      }
    />
  );
}

export function WithBoundary(props) {
  const location = useLocation();

  useEffect(() => {
    pathName = location.pathname;
  }, [location.pathname]);

  function handleError(err) {
    error = err;
  }

  return (
    <ErrorBoundary
      onError={handleError}
      fallbackRender={FallbackRender}
    >
      {props.children}
    </ErrorBoundary>
  );
}
