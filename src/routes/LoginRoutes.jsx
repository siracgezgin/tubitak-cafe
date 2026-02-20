import { lazy } from 'react';

// project imports
import Loadable from 'components/Loadable';

const LoginPage = Loadable(lazy(() => import('pages/auth/LoginPage')));

// ==============================|| AUTH ROUTING ||============================== //

const LoginRoutes = {
  path: '/',
  children: [
    {
      path: 'login',
      element: <LoginPage />
    }
  ]
};

export default LoginRoutes;

