import Home from '@renderer/views/Home';
import { createMemoryRouter, redirect } from 'react-router-dom';
import { RouterNameEnum } from '../enums';
import Settings from '@renderer/views/Settings';
import Accounts from '@renderer/views/Accounts';

const router = createMemoryRouter([
  {
    path: '/',
    element: <Home />,
    loader: () => redirect(`/${RouterNameEnum.ACCOUNTS}`),
  },
  {
    path: `/${RouterNameEnum.ACCOUNTS}`,
    element: <Accounts />,
  },
  {
    path: `/${RouterNameEnum.SETTINGS}`,
    element: <Settings />,
  },
]);

export default router;
