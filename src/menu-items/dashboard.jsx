// assets
import {
  DashboardOutlined,
  LineChartOutlined,
  TeamOutlined,
  ShoppingOutlined,
  UserAddOutlined,
  TableOutlined,
  EditOutlined,
  QrcodeOutlined,
  ShoppingCartOutlined,
  BellOutlined
} from '@ant-design/icons';

// icons
const icons = {
  DashboardOutlined,
  LineChartOutlined,
  TeamOutlined,
  ShoppingOutlined,
  UserAddOutlined,
  TableOutlined,
  EditOutlined,
  QrcodeOutlined,
  ShoppingCartOutlined,
  BellOutlined
};

// ==============================|| MENU ITEMS - DASHBOARD ||============================== //

const dashboard = {
  id: 'group-dashboard',
  title: 'CafeML',
  type: 'group',
  roles: ['Admin', 'SubAdmin'],
  children: [
    {
      id: 'cafeml',
      title: 'Dashboard',
      type: 'item',
      url: '/cafeml',
      icon: icons.DashboardOutlined,
      breadcrumbs: false,
      roles: ['Admin', 'SubAdmin']
    },
    {
      id: 'forecast',
      title: 'Satış Tahmini',
      type: 'item',
      url: '/forecast',
      icon: icons.LineChartOutlined,
      breadcrumbs: false,
      roles: ['Admin', 'SubAdmin']
    },
    {
      id: 'segments',
      title: 'Müşteri Segmentleri',
      type: 'item',
      url: '/segments',
      icon: icons.TeamOutlined,
      breadcrumbs: false,
      roles: ['Admin', 'SubAdmin']
    },
    {
      id: 'recommendations',
      title: 'Ürün Önerileri',
      type: 'item',
      url: '/recommendations',
      icon: icons.ShoppingOutlined,
      breadcrumbs: false,
      roles: ['Admin', 'SubAdmin']
    }
  ]
};

export default dashboard;
