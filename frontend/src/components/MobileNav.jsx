import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react';

const routes = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/companies', icon: Building2, label: 'Companies' },
  { path: '/deals', icon: Handshake, label: 'Deals' },
  { path: '/activities', icon: Calendar, label: 'Activities' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav md:hidden">
      <div className="flex justify-around items-center h-16">
        {routes.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors duration-200 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}