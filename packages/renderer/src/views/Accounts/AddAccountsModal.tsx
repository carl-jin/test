import { Alert, Button, Form, Input, message, Modal, Space } from 'antd';
import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';

export default function AddAccountsModal(props: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields(); 
  }, [open]);

  function handleOk() {
    form.validateFields().then((values) => {
      const data = values.data.split('\n').map((line) => line.split('\t'));
      const accounts = data.map(([email, password, twoFactorCode]) => ({
        email: email?.trim() || '',
        password: password?.trim() || '',
        twoFactorCode: twoFactorCode?.trim() || '',
      }));

      console.log(accounts);

      if (accounts.length === 0) {
        message.error('无法识别任何账号, 请确保粘贴的账号信息格式正确');
        return;
      }

      const oldAccounts = [...accounts];

      // 过滤掉不合法的账号
      const validAccounts = accounts
        .filter((account) => {
          return account.email && account.password;
        })
        .filter((account) => {
          return account.email.includes('@');
        });

      if (validAccounts.length !== oldAccounts.length) {
        if (validAccounts.length === 0) {
          message.error('无法识别任何账号, 请确保粘贴的账号信息格式正确');
          return;
        } else {
          message.warning('检测到有部分账号信息格式不正确, 已自动过滤');
        }
      }

      window.db.Account.addAccounts(validAccounts).then(() => {
        setOpen(false);
        message.success('添加账号成功');
        props.onSuccess?.();
      });
    });
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        title="添加账号"
        width={600}
        style={{ top: 20 }}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <Space direction="vertical">
          <Form
            layout="vertical"
            style={{ width: '100%' }}
            form={form}
            initialValues={{
              data: '',
            }}
          >
            <Form.Item
              label="账号信息:"
              name="data"
              required
            >
              <Input.TextArea
                rows={10}
                autoSize={{ minRows: 20, maxRows: 20 }}
              />
            </Form.Item>
          </Form>

          <Alert
            message="请将要添加的账号信息从 Google 表格中粘贴到此处，每行一个账号，格式为：邮箱,密码,二步验证码"
            type="info"
            showIcon
          />
        </Space>
      </Modal>

      <Button
        type="primary"
        onClick={() => setOpen(true)}
        icon={<PlusOutlined />}
      >
        添加账号
      </Button>
    </>
  );
}
