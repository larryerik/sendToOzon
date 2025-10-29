import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/shipping-plans', label: '发货计划' },
    { path: '/cluster-settings', label: '设置集群' },
    { path: '/shipping-point-settings', label: '设置发货点' },
    { path: '/account-settings', label: '账号设置' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">O</span>
                </div>
                <span className="text-lg font-semibold">发货管理系统</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  登出
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 移动端导航菜单 */}
        <div className="md:hidden border-b bg-background">
          <div className="container flex overflow-x-auto px-4 py-2 space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link text-xs ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* 主要内容区域 */}
        <main className="container px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default Layout;