import { loginWithEmail } from '../src/modules/LoginWithEmail';

loginWithEmail({
  email: 'test@test.com',
  password: 'test',
}).then(() => {
  console.log('login success');
});
