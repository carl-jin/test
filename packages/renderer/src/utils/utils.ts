export function getCurrentTimestamp() {
  return Math.ceil(Date.now() / 1000);
}

export function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getStorage(key, defaultValue) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : defaultValue;
}

export function copyTextToClipboard(text) {
  let textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
