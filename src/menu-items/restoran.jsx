// assets
import {
    TableOutlined,
    EditOutlined,
    QrcodeOutlined,
    ShoppingCartOutlined,
    BellOutlined,
    UserAddOutlined,
    BarChartOutlined,
    SettingOutlined
} from '@ant-design/icons';

// icons
const icons = {
    TableOutlined,
    EditOutlined,
    QrcodeOutlined,
    ShoppingCartOutlined,
    BellOutlined,
    UserAddOutlined,
    BarChartOutlined,
    SettingOutlined
};

// ==============================|| MENU ITEMS - RESTORAN ||============================== //

const restoran = {
    id: 'group-restoran',
    title: 'Restoran',
    type: 'group',
    children: [
        {
            id: 'menu',
            title: 'Menü Yönetimi',
            type: 'item',
            url: '/menu',
            icon: icons.EditOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        },
        {
            id: 'garson',
            title: 'Masalar & Sipariş',
            type: 'item',
            url: '/garson',
            icon: icons.TableOutlined,
            breadcrumbs: false
        },
        {
            id: 'salonlar',
            title: 'Salon Haritası',
            type: 'item',
            url: '/salonlar',
            icon: icons.TableOutlined,
            breadcrumbs: false
        },
        {
            id: 'salon-yonetim',
            title: 'Salon/Masa Yönetimi',
            type: 'item',
            url: '/salon-yonetim',
            icon: icons.SettingOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        },
        {
            id: 'qr-yonetim',
            title: 'QR Kod Yönetimi',
            type: 'item',
            url: '/qr-yonetim',
            icon: icons.QrcodeOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        },
        {
            id: 'siparisler',
            title: 'Siparişler',
            type: 'item',
            url: '/siparisler',
            icon: icons.ShoppingCartOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        },
        {
            id: 'talepler',
            title: 'Sipariş Talepleri',
            type: 'item',
            url: '/talepler',
            icon: icons.BellOutlined,
            breadcrumbs: false
        },
        {
            id: 'raporlar',
            title: 'Raporlar',
            type: 'item',
            url: '/raporlar',
            icon: icons.BarChartOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        },
        {
            id: 'kullanicilar',
            title: 'Kullanıcı Yönetimi',
            type: 'item',
            url: '/kullanicilar',
            icon: icons.UserAddOutlined,
            breadcrumbs: false,
            roles: ['Admin', 'SubAdmin']
        }
    ]
};

export default restoran;
