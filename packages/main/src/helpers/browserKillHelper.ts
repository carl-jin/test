// 处理 windwos 无法正确退出浏览器问题

import { platform } from "os";
import { exec } from "child_process";

function killChromeBrowserByWindowname(windowname: string) {
    if(platform() === 'win32') {
        const chromeProcess = exec(`taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq ${windowname}"`);
        chromeProcess.on('close', (code) => {
            console.log(`Chrome 浏览器已关闭，退出码 ${code}`);
        });
    }
    
}

export { killChromeBrowserByWindowname };