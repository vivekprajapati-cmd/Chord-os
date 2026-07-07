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

  // Refresh session — keeps cookies alive across navigations
  await supabase.auth.getUser();
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public paths — no auth required for anyone
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/demo') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/client/login') ||
    path.startsWith('/api/client/auth') ||
    path.startsWith('/_next') ||
    path === '/manifest.json' ||
    path === '/favicon.ico' ||
    path.startsWith('/icon-');

  const isClientRoute = path.startsWith('/client') && !path.startsWith('/client/login');
  const isInternalRoute = !isClientRoute && !isPublic;

  if (isClientRoute) {
    // Client portal: must be authenticated AND have a client_accounts record
    if (!user) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }

    // Verify this user has a client_accounts record (not an internal staff member)
    const { data: clientAccount } = await supabase
      .from('client_accounts')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!clientAccount || !clientAccount.is_active) {
      // Authenticated but no client account — could be a staff member trying to access client portal
      return NextResponse.redirect(new URL('/client/login', request.url));
    }

    return response;
  }

  if (isInternalRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Prevent client accounts from accessing internal dashboard
    const { data: clientAccount } = await supabase
      .from('client_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (clientAccount) {
      // This is a client user — block internal access, send to client portal
      return NextResponse.redirect(new URL('/client', request.url));
    }
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && path === '/client/login') {
    // Check if they have a client account
    const { data: clientAccount } = await supabase
      .from('client_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (clientAccount) {
      return NextResponse.redirect(new URL('/client', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
