import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { evdRemoteUrl } from '@main/const';
import AdmZip from 'adm-zip';

const extFolderPath = path.join(app.getPath('userData'), 'ext');
const indexJsonUri = `${evdRemoteUrl}/ext/index.json`;

if (!fs.existsSync(extFolderPath)) {
  fs.mkdirSync(extFolderPath, { recursive: true });
}

type IndexJson = {
  vpnExtension: {
    path: string;
    version: string;
  };
};

async function downloadFile(url: string, filePath: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));
}

export async function checkIfNeedInstallVpnExt() {
  const localIndexJson = await getLocalIndexJson();
  if (!localIndexJson) {
    return true;
  }

  const remoteIndexJson = await getRemoteIndexJson();
  if (remoteIndexJson.vpnExtension.version !== localIndexJson.vpnExtension.version) {
    return true;
  }

  return false;
}

export async function installVpnExtIfNeeded() {
  const localIndexJson = await getLocalIndexJson();
  // 远程 ext 的内容，请看 buildResources/ext
  if (!localIndexJson) {
    // 创建 ext 文件夹
    const remoteIndexJson = await getRemoteIndexJson();

    // 确保 extFolderPath 目录存在
    if (!fs.existsSync(extFolderPath)) {
      fs.mkdirSync(extFolderPath, { recursive: true });
    }

    // 写入 index.json 文件
    fs.writeFileSync(
      path.join(extFolderPath, 'index.json'),
      JSON.stringify(remoteIndexJson, null, 2),
    );

    // 下载 vpnExtension.zip 文件
    const vpnExtUri = `${evdRemoteUrl}/ext/${remoteIndexJson.vpnExtension.path}`;
    const vpnDestPath = path.join(extFolderPath, remoteIndexJson.vpnExtension.path);
    await downloadFile(vpnExtUri, vpnDestPath);

    // 解压 vpnExtPath 到 extFolderPath
    const zip = new AdmZip(vpnDestPath);
    zip.extractAllTo(path.join(path.dirname(vpnDestPath), 'vpnExtension'), true);

    // 删除 vpnExtension.zip 文件
    fs.unlinkSync(vpnDestPath);
    return;
  }

  // 判断是否有新版本
  const remoteIndexJson = await getRemoteIndexJson();
  if (remoteIndexJson.vpnExtension.version !== localIndexJson.vpnExtension.version) {
    // 删除旧的 vpnExtension 文件夹
    fs.rmdirSync(path.join(extFolderPath, 'vpnExtension'), { recursive: true });

    // 下载 vpnExtension.zip 文件
    const vpnExtUri = `${evdRemoteUrl}/ext/${remoteIndexJson.vpnExtension.path}`;
    const vpnDestPath = path.join(extFolderPath, remoteIndexJson.vpnExtension.path);
    if (fs.existsSync(path.join(path.dirname(vpnDestPath), 'vpnExtension'))) {
      fs.rmdirSync(path.join(path.dirname(vpnDestPath), 'vpnExtension'), { recursive: true });
    }

    // 下载 vpnExtension.zip 文件
    await downloadFile(vpnExtUri, vpnDestPath);

    // 解压 vpnExtPath 到 extFolderPath
    const zip = new AdmZip(vpnDestPath);
    zip.extractAllTo(path.join(path.dirname(vpnDestPath), 'vpnExtension'), true);

    // 写入 index.json 文件
    fs.writeFileSync(
      path.join(extFolderPath, 'index.json'),
      JSON.stringify(remoteIndexJson, null, 2),
    );

    // 删除 vpnExtension.zip 文件
    fs.unlinkSync(vpnDestPath);
    return;
  }

  // 没有新版本，直接返回
  return;
}

async function getRemoteIndexJson(): Promise<IndexJson> {
  const indexJsonData = await fetch(indexJsonUri);
  const indexJson = await indexJsonData.json();
  return indexJson;
}

async function getLocalIndexJson(): Promise<IndexJson | null> {
  const indexJsonPath = path.join(extFolderPath, 'index.json');
  if (!fs.existsSync(indexJsonPath)) {
    return null;
  }
  const indexJsonData = fs.readFileSync(indexJsonPath, 'utf-8');
  const indexJson = JSON.parse(indexJsonData);
  return indexJson;
}
