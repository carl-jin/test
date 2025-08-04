import { useState, useEffect, useReducer } from 'react';
import { Alert, Button, Flex, message, Modal, Spin } from 'antd';

export function IfNeedInstallVpnExt() {
  const [isShowInstallPage, setIsShowInstallPage] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isHaveError, setIsHaveError] = useState(false);

  useEffect(() => {
    window.IPC.send('checkIfNeedInstallVpnExt').then((res) => {
      setIsShowInstallPage(res);
      if (res) {
        window.IPC.send('installVpnExtIfNeeded')
          .then(() => {
            // 3s 后提示安装成功，不然太快了
            setTimeout(() => {
              setIsDone(true);
              message.success('安装成功');
            }, 3000);
          })
          .catch((err) => {
            console.error(err);
            message.error('安装失败, 请联系开发者');
            setIsHaveError(true);
          });
      }
    });
  }, []);

  return (
    <Modal
      open={isShowInstallPage}
      closable={false}
      title="安装 VPN 中..."
      footer={
        isDone || isHaveError ? (
          <Button
            type="primary"
            onClick={() => setIsShowInstallPage(false)}
          >
            关闭
          </Button>
        ) : null
      }
    >
      <Flex
        justify="center"
        align="center"
        className="h-full"
        style={{ height: '100%' }}
      >
        {isHaveError ? (
          <Alert
            message="安装失败, 请联系开发者"
            type="error"
          />
        ) : isDone ? (
          <Alert
            message="安装成功"
            type="success"
          />
        ) : (
          <Spin
            tip="安装中，请稍后"
            size="large"
          />
        )}
      </Flex>
    </Modal>
  );
}
