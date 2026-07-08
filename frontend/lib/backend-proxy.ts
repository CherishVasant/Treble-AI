import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

/**
 * Appends or updates cookies in a Cookie header string.
 */
function mergeCookies(cookieHeader: string, setCookieHeader: string | null): string {
  if (!setCookieHeader) return cookieHeader;
  
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const parts = c.split('=');
      if (parts.length >= 2) {
        cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
  
  // Extract key-value pairs from Set-Cookie headers
  const matches = setCookieHeader.matchAll(/([^=\s,]+)=([^;\s]+)/g);
  for (const match of matches) {
    const key = match[1];
    const val = match[2];
    if (key === 'access_token' || key === 'refresh_token') {
      cookies[key] = val;
    }
  }
  
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

export async function proxyToBackend(
  request: NextRequest,
  path: string,
  options: {
    method?: string;
    body?: any;
    isMultipart?: boolean;
  } = {}
): Promise<NextResponse> {
  const method = options.method ?? request.method;
  const url = `${BACKEND_URL}${path}`;
  
  const headers = new Headers();
  
  const originalCookie = request.headers.get('cookie') || '';
  if (originalCookie) {
    headers.set('Cookie', originalCookie);
  }

  const range = request.headers.get('range');
  if (range) {
    headers.set('Range', range);
  }
  
  if (!options.isMultipart) {
    headers.set('Content-Type', 'application/json');
  }
  
  let fetchBody: any = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (options.body !== undefined) {
      fetchBody = options.isMultipart ? options.body : JSON.stringify(options.body);
    } else {
      try {
        if (options.isMultipart) {
          fetchBody = await request.formData();
        } else {
          fetchBody = await request.text();
        }
      } catch {
        fetchBody = undefined;
      }
    }
  }
  
  const executeFetch = async (cookieVal: string) => {
    const runHeaders = new Headers(headers);
    if (cookieVal) {
      runHeaders.set('Cookie', cookieVal);
    }
    return fetch(url, {
      method,
      headers: runHeaders,
      body: fetchBody,
      cache: 'no-store'
    });
  };
  
  try {
    let response = await executeFetch(originalCookie);
    let newSetCookie: string | null = null;
    
    let refreshSetCookies: string[] = [];
    
    // Auto-refresh token if unauthorized
    if (response.status === 401) {
      const refreshResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Cookie': originalCookie
        },
        cache: 'no-store'
      });
      
      if (refreshResponse.ok) {
        newSetCookie = refreshResponse.headers.get('set-cookie');
        refreshSetCookies = refreshResponse.headers.getSetCookie();
        
        const updatedCookie = mergeCookies(originalCookie, newSetCookie);
        response = await executeFetch(updatedCookie);
      }
    }
    
    const contentType = response.headers.get('content-type') || '';
    let responseBody: any;
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = Buffer.from(await response.arrayBuffer());
    }
    
    let nextResponse: NextResponse;
    if (contentType.includes('application/json')) {
      nextResponse = NextResponse.json(responseBody, { status: response.status });
    } else {
      const responseHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Disposition': response.headers.get('content-disposition') || '',
        'Cache-Control': response.headers.get('cache-control') || ''
      };
      if (response.headers.has('accept-ranges')) {
        responseHeaders['Accept-Ranges'] = response.headers.get('accept-ranges')!;
      }
      if (response.headers.has('content-range')) {
        responseHeaders['Content-Range'] = response.headers.get('content-range')!;
      }
      if (response.headers.has('content-length')) {
        responseHeaders['Content-Length'] = response.headers.get('content-length')!;
      }
      nextResponse = new NextResponse(responseBody, {
        status: response.status,
        headers: responseHeaders
      });
    }
    
    // Clear standard Set-Cookie headers on nextResponse before appending
    nextResponse.headers.delete('Set-Cookie');

    if (refreshSetCookies.length > 0) {
      refreshSetCookies.forEach(cookieStr => {
        nextResponse.headers.append('Set-Cookie', cookieStr);
      });
    }
    
    const responseSetCookies = response.headers.getSetCookie();
    if (responseSetCookies.length > 0) {
      responseSetCookies.forEach(cookieStr => {
        nextResponse.headers.append('Set-Cookie', cookieStr);
      });
    }
    
    return nextResponse;
  } catch (error) {
    console.error(`[Proxy] Error proxying to backend ${url}:`, error);
    return NextResponse.json(
      { error: 'Failed to reach backend service', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
