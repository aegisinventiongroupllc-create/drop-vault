export const BUNNY_LIBRARY = 799618;
export const BUNNY_HOST = 'vz-2138444b-8e3.b-cdn.net';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function bunnyApi(path: string, method = 'GET', body?: unknown) {
  const apiKey = Deno.env.get('BUNNY_STREAM_LIBRARY_API_KEY');
  if (!apiKey) throw new Error('Video upload configuration unavailable');
  const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY}${path}`, {
    method, headers: { AccessKey: apiKey, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    // Do not log headers, credentials or signed URLs.
    const details = await response.text();
    throw new Error(`Bunny request failed [${response.status}]: ${details}`);
  }
  return response.status === 204 ? null : response.json();
}
export async function bunnyPlaybackUrl(videoId: string, seconds: number) {
  const key = Deno.env.get('BUNNY_STREAM_TOKEN_KEY');
  if (!key || !UUID.test(videoId) || seconds < 1 || seconds > 300) throw new Error('Protected playback unavailable');
  const path = `/${videoId}/`;
  const expires = Math.floor(Date.now() / 1000) + seconds;
  const signingData = `token_path=${path}`;
  const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${path}${expires}${signingData}`)));
  const token = `HS256-${btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  return `https://${BUNNY_HOST}/bcdn_token=${token}&expires=${expires}&token_path=${encodeURIComponent(path)}${path}playlist.m3u8`;
}

// Call only after the caller has independently authorized the original object.
export async function deliveryUrl(db: any, bucket: string, path: string, seconds: number): Promise<string | null> {
  const { data: copy, error } = await db.from('bunny_video_deliveries').select('id,video_id,state').eq('bucket', bucket).eq('storage_path', path).maybeSingle();
  if (error) throw new Error('Video delivery unavailable');
  if (!copy) return null; // Legacy files continue using their original storage.
  if (copy.state === 'deleting' || copy.state === 'failed') throw new Error('Video delivery unavailable');
  const { data: current, error: sourceError } = await db.rpc('bunny_source_current', { _id: copy.id });
  if (sourceError || current !== true) throw new Error('Video version unavailable');
  const video = await bunnyApi(`/videos/${copy.video_id}`);
  if (video.status !== 3 && video.status !== 4) throw new Error('Video is still processing');
  if (bucket === 'teasers' && (!(video.length > 0) || video.length > 60.5)) throw new Error('Teaser exceeds the permitted duration');
  return bunnyPlaybackUrl(copy.video_id, seconds);
}