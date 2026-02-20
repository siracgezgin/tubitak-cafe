import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import Loadable from 'components/Loadable';

// project imports
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';

const QRMenuPage = Loadable(lazy(() => import('pages/public/QRMenuPage')));

const QRRoute = {
    path: '/qr/:masaId',
    element: <QRMenuPage />
};

const QRKodRoute = {
    path: '/qr/kod/:qrKod',
    element: <QRMenuPage />
};

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([MainRoutes, LoginRoutes, QRRoute, QRKodRoute], { basename: import.meta.env.VITE_APP_BASE_NAME });

export default router;
