import { lazy } from 'react';

// project imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import ProtectedRoute from 'components/ProtectedRoute';

// Dashboard
const CafeMLDashboard = Loadable(lazy(() => import('pages/dashboard/CafeMLDashboard')));

// ML Pages
const ForecastPage = Loadable(lazy(() => import('pages/ml/ForecastPage')));
const SegmentsPage = Loadable(lazy(() => import('pages/ml/SegmentsPage')));
const RecommendationsPage = Loadable(lazy(() => import('pages/ml/RecommendationsPage')));

// Restoran Pages
const SiparislerPage = Loadable(lazy(() => import('pages/restoran/SiparislerPage')));
const MusterilerPage = Loadable(lazy(() => import('pages/restoran/MusterilerPage')));
const SalonlarPage = Loadable(lazy(() => import('pages/restoran/SalonlarPage')));
const SalonMasaYonetimPage = Loadable(lazy(() => import('pages/restoran/SalonMasaYonetimPage')));
const RaporlarPage = Loadable(lazy(() => import('pages/restoran/RaporlarPage')));

// Sipariş Yönetimi Pages
const TaleplerPage = Loadable(lazy(() => import('pages/restoran/TaleplerPage')));
const GarsonPanelPage = Loadable(lazy(() => import('pages/restoran/GarsonPanelPage')));
const MutfakPage = Loadable(lazy(() => import('pages/restoran/MutfakBarPage').then(m => ({ default: m.MutfakPage }))));
const BarPage = Loadable(lazy(() => import('pages/restoran/MutfakBarPage').then(m => ({ default: m.BarPage }))));
const MenuDuzenlePage = Loadable(lazy(() => import('pages/restoran/MenuDuzenlePage')));
const QRYonetimPage = Loadable(lazy(() => import('pages/restoran/QRYonetimPage')));
const KullaniciYonetimPage = Loadable(lazy(() => import('pages/restoran/KullaniciYonetimPage')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
  children: [
    {
      path: '/',
      element: <CafeMLDashboard />
    },
    {
      path: 'cafeml',
      element: <CafeMLDashboard />
    },
    // ML Pages
    {
      path: 'forecast',
      element: <ForecastPage />
    },
    {
      path: 'segments',
      element: <SegmentsPage />
    },
    {
      path: 'recommendations',
      element: <RecommendationsPage />
    },
    // Restoran Pages
    {
      path: 'menu',
      element: <MenuDuzenlePage />
    },
    {
      path: 'menu-duzenle',
      element: <MenuDuzenlePage />
    },
    {
      path: 'siparisler',
      element: <SiparislerPage />
    },
    {
      path: 'musteriler',
      element: <MusterilerPage />
    },
    // Sipariş Yönetimi
    {
      path: 'talepler',
      element: <TaleplerPage />
    },
    {
      path: 'garson',
      element: <GarsonPanelPage />
    },
    {
      path: 'salonlar',
      element: <SalonlarPage />
    },
    {
      path: 'salon-yonetim',
      element: <SalonMasaYonetimPage />
    },
    {
      path: 'raporlar',
      element: <RaporlarPage />
    },
    {
      path: 'mutfak',
      element: <MutfakPage />
    },
    {
      path: 'bar',
      element: <BarPage />
    },
    {
      path: 'qr-yonetim',
      element: <QRYonetimPage />
    },
    {
      path: 'kullanicilar',
      element: <KullaniciYonetimPage />
    }
  ]
};

export default MainRoutes;
