import { ReactElement, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../../features/auth/store/auth.store';

type AdminRouteProps = {
  children: ReactNode;
};

export function AdminRoute({ children }: AdminRouteProps): ReactElement {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== 'admin') {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}
