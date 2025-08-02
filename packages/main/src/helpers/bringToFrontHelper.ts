import { Page } from "playwright-core";
import { exec } from "child_process";
import { platform } from "os";
import { app } from 'electron';
import path from 'node:path';

const isDev = app ? !app.isPackaged : false;

// 处理 window 无法将 chrome 窗口置顶问题
function bringToFront(page:Page, email: string) {
    if(platform() === 'win32') {
        const devPath = path.join(app.getAppPath(), "buildResources","nircmdc.exe")
        const prodPath = path.join(app.getAppPath(), "buildResources","nircmdc.exe")
        const nircmdcPath = isDev ? devPath : prodPath;
        exec(`${nircmdcPath} win activate title "${btoa(email).replace(/=/g, '')}"`);
    }
    page.bringToFront();
}

export { bringToFront };