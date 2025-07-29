export function ErrorMessage(msg: string) {
  window.antdApp.message.error({
    content: msg,
    key: 'errorMessageKey',
  });
}
