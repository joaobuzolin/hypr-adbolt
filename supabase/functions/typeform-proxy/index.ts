import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    let formId = '';
    const url = new URL(req.url);
    formId = url.searchParams.get('form_id') || '';

    if (!formId && req.method === 'POST') {
      const body = await req.json();
      formId = body.form_id || '';
    }

    if (formId.includes('typeform.com')) {
      const match = formId.match(/\/to\/([a-zA-Z0-9]+)/);
      if (match) formId = match[1];
    }

    if (!formId) {
      return new Response(JSON.stringify({ error: 'form_id is required' }), {
        status: 400, headers: CORS_HEADERS,
      });
    }

    const token = Deno.env.get('TYPEFORM_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'TYPEFORM_TOKEN not configured' }), {
        status: 500, headers: CORS_HEADERS,
      });
    }

    const tfRes = await fetch(`https://api.typeform.com/forms/${formId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!tfRes.ok) {
      return new Response(JSON.stringify({ error: `Typeform API error: ${tfRes.status}` }), {
        status: tfRes.status, headers: CORS_HEADERS,
      });
    }

    const tfData = await tfRes.json();

    const result = {
      id: tfData.id,
      title: tfData.title,
      fields_count: tfData.fields?.length || 0,
      created_at: tfData.created_at,
      _links: { display: tfData._links?.display },
    };

    return new Response(JSON.stringify(result), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
});
