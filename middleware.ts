import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/demo') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/client/login') ||
    path.startsWith('/api/client') ||
    path.startsWith('/_next') ||
    path === '/manifest.json' ||
    path === '/favicon.ico' ||
    path.startsWith('/icon-');

  const isClientRoute = path.startsWith('/client') && !path.startsWith('/client/login') && !path.startsWith('/api/client');
  const isInternalRoute = !isClientRoute && !isPublic;

  // Only check client_accounts when the route actually needs it
  let clientAccount: { id: string; is_active: boolean } | null = null;
  const needsClientCheck = user && (isClientRoute || path === '/login' || path.startsWith('/client/login'));
  if (needsClientCheck) {
    const { data } = await supabase
      .from('client_accounts')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    clientAccount = data;
  }

  if (isClientRoute) {
    if (!user) return NextResponse.redirect(new URL('/client/login', request.url));
    if (!clientAccount || !clientAccount.is_active) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }
    return response;
  }

  if (isInternalRoute) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    if (clientAccount) return NextResponse.redirect(new URL('/client', request.url));
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && path.startsWith('/client/login') && clientAccount) {
    return NextResponse.redirect(new URL('/client', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
