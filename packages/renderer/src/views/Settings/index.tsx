import { memo, ReactNode } from 'react';
import { Card, Col, Row } from 'antd';  
import ChromeExecutablePath from './ChromeExecutablePath';

export default function Settings() {
  return (
    <Row
      className={'w-full'}
      gutter={12}
    >
      <Col span={14}>
        <SettingItem title={'Chrome 浏览器可执行路径'}>
          <ChromeExecutablePath />
        </SettingItem>
      </Col>
    </Row>
  );
}

const SettingItem = memo((props: { title: string; children: ReactNode }) => {
  return (
    <Card
      size="small"
      title={props.title}
      style={{ marginBottom: 12 }}
    >
      {props.children}
    </Card>
  );
});
