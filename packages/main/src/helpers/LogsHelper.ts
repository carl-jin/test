import { inspect } from 'util';
import { mainWindow } from '../mainWindow';

export function renderLog(...data) {
  if (!mainWindow) return;
  let dataStr = data.toString();
  try {
    dataStr = JSON.stringify(data);
  } catch (e) {
    try {
      dataStr = JSON.stringify(inspect(data));
    } catch (e) {}
  }

  try {
    mainWindow.webContents.executeJavaScript(
      `  try {
          console.log('%cFROM MAIN', 'color: #800', JSON.parse(${dataStr}));
        } catch (e) {
          console.log('%cFROM MAIN', 'color: #800', ${dataStr});
        }`,
    );
  } catch (e) {}
}
