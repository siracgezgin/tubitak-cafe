// material-ui
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project import
import NavGroup from './NavGroup';
import menuItem from 'menu-items';
import { useAuth } from 'contexts/AuthContext';

// ==============================|| DRAWER CONTENT - NAVIGATION ||============================== //

export default function Navigation() {
  const { user } = useAuth();
  const userRol = user?.rol || user?.Rol || 'Garson';

  // Rol bazlı filtreleme
  const filteredItems = menuItem.items
    .filter(group => {
      // Grup seviyesinde roles kontrolü
      if (group.roles && !group.roles.includes(userRol)) return false;
      return true;
    })
    .map(group => ({
      ...group,
      children: group.children?.filter(item => {
        // Item seviyesinde roles kontrolü
        if (item.roles && !item.roles.includes(userRol)) return false;
        return true;
      })
    }))
    .filter(group => group.children && group.children.length > 0);

  const navGroups = filteredItems.map((item) => {
    switch (item.type) {
      case 'group':
        return <NavGroup key={item.id} item={item} />;
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Fix - Navigation Group
          </Typography>
        );
    }
  });

  return <Box sx={{ pt: 2 }}>{navGroups}</Box>;
}
