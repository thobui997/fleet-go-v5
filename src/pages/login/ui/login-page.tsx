import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@shared/auth';
import { useToast } from '@shared/ui/use-toast';
import { ROUTES } from '@shared/config/routes';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { FormFieldWrapper } from '@shared/ui/form-field-wrapper';
import { Skeleton } from '@shared/ui/skeleton';
import { loginSchema, type LoginFormData } from '../model/login-schema';

/**
 * Auth error messages map for Vietnamese users.
 * Maps Supabase error codes to user-friendly Vietnamese messages.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không chính xác',
  email_not_confirmed: 'Tài khoản chưa được xác nhận. Vui lòng liên hệ quản trị viên.',
  too_many_requests: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
  'Invalid login credentials': 'Email hoặc mật khẩu không chính xác',
};

interface AuthError {
  message?: string;
  code?: string;
}

function getAuthErrorMessage(error: AuthError): string {
  const message = error.message || error.code || '';
  return AUTH_ERROR_MESSAGES[message] || AUTH_ERROR_MESSAGES[error.code || ''] || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function LoginPage() {
  const { isLoading: authLoading, isAuthenticated, login } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Session loading guard: show loading state during initial auth check
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-64 mx-auto mb-2" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    const from = (location.state as LocationState)?.from?.pathname || ROUTES.DASHBOARD;
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      const from = (location.state as LocationState)?.from?.pathname || ROUTES.DASHBOARD;
      window.location.href = from; // Full navigation to refresh auth state
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error as AuthError);
      toast({
        variant: 'destructive',
        title: 'Đăng nhập thất bại',
        description: errorMessage,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">FleetGo</CardTitle>
          <CardDescription>Hệ thống quản lý đội xe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormFieldWrapper
              label="Email"
              error={errors.email?.message}
              required
            >
              <Input
                type="email"
                placeholder="email@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Mật khẩu"
              error={errors.password?.message}
              required
            >
              <Input
                type="password"
                placeholder="•••••••••"
                {...register('password')}
                disabled={isSubmitting}
              />
            </FormFieldWrapper>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
