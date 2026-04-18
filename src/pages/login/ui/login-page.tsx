import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="flex h-screen w-full">
        {/* Cover area - skeleton */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 dark:from-slate-900 dark:to-slate-800 items-center justify-center p-12">
          <Skeleton className="h-20 w-48 mb-4" />
          <Skeleton className="h-6 w-64" />
        </div>
        {/* Form area - skeleton */}
        <div className="w-full lg:w-1/2 bg-muted/30 dark:bg-muted/10 flex items-center justify-center p-4 lg:p-12 relative">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }} />
          </div>
          <Card className="w-full max-w-md shadow-2xl shadow-foreground/10 border-2 border-border/80 bg-background relative z-10">
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-48 mx-auto mb-4" />
              <Skeleton className="h-4 w-64 mx-auto mb-2" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
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
    <div className="flex h-screen w-full lg:flex-row">
      {/* Left: Cover Area */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 dark:bg-primary/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 dark:bg-primary/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="text-center text-white space-y-6 relative z-10">
          <h1 className="text-6xl font-bold tracking-tight">FleetGo</h1>
          <p className="text-xl opacity-90 max-w-md">Hệ thống quản lý đội xe chuyên nghiệp</p>
          <div className="pt-8">
            <div className="inline-flex items-center gap-2 text-sm opacity-70">
              <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-primary-foreground/80" />
              <span>Đáng tin cậy</span>
              <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-primary-foreground/80" />
              <span>Hiệu quả</span>
              <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-primary-foreground/80" />
              <span>An toàn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="w-full lg:w-1/2 bg-muted/30 dark:bg-muted/10 flex items-center justify-center p-4 lg:p-12 relative">
        {/* Subtle background pattern for depth */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        <Card className="w-full max-w-md shadow-2xl shadow-foreground/10 border-2 border-border/80 bg-background relative z-10">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-3xl font-bold tracking-tight">FleetGo</CardTitle>
            <CardDescription>Hệ thống quản lý đội xe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormFieldWrapper
                label="Email"
                error={errors.email?.message}
                required
              >
                <Input
                  type="email"
                  placeholder="email@example.com"
                  autoFocus
                  className="border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('email')}
                  disabled={isSubmitting}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Mật khẩu"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    className="border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
                    {...register('password')}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormFieldWrapper>

              <Button
                type="submit"
                className="w-full shadow-md"
                disabled={isSubmitting || authLoading}
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
