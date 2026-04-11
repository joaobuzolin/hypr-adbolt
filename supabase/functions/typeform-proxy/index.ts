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
    const token = Deno.env.get('TYPEFORM_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'TYPEFORM_TOKEN not configured' }), {
        status: 500, headers: CORS_HEADERS,
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get';

    // ── List forms from the "Survey" workspace ──
    if (action === 'list') {
      const pageSize = url.searchParams.get('page_size') || '50';
      let workspaceId = url.searchParams.get('workspace_id') || Deno.env.get('TYPEFORM_SURVEY_WORKSPACE_ID') || '';

      // Auto-discover workspace named "Survey"
      if (!workspaceId) {
        const wsRes = await fetch('https://api.typeform.com/workspaces?page_size=200', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!wsRes.ok) {
          return new Response(JSON.stringify({ error: `Workspaces API ${wsRes.status}` }), {
            status: wsRes.status, headers: CORS_HEADERS,
          });
        }
        const wsData = await wsRes.json();
        const surveyWs = (wsData.items || []).find((ws: { name: string }) =>
          ws.name.toLowerCase() === 'survey' || ws.name.toLowerCase() === 'surveys'
        );
        if (!surveyWs) {
          return new Response(JSON.stringify({
            error: 'Workspace "Survey" não encontrado',
            workspaces: (wsData.items || []).map((ws: { id: string; name: string }) => ({ id: ws.id, name: ws.name })),
          }), { status: 404, headers: CORS_HEADERS });
        }
        workspaceId = surveyWs.id;
      }

      const formsRes = await fetch(
        `https://api.typeform.com/forms?workspace_id=${workspaceId}&page_size=${pageSize}&sort_by=last_updated_at&order_by=desc`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      if (!formsRes.ok) {
        return new Response(JSON.stringify({ error: `Forms API ${formsRes.status}` }), {
          status: formsRes.status, headers: CORS_HEADERS,
        });
      }
      const formsData = await formsRes.json();
      return new Response(JSON.stringify({
        workspace_id: workspaceId,
        forms: (formsData.items || []).map((f: { id: string; title: string; last_updated_at: string; created_at: string; _links?: { display?: string } }) => ({
          id: f.id,
          title: f.title,
          last_updated_at: f.last_updated_at,
          created_at: f.created_at,
          url: f._links?.display || `https://form.typeform.com/to/${f.id}`,
        })),
        total: formsData.total_items || 0,
      }), { headers: CORS_HEADERS });
    }

    // ── Get single form (original behavior) ──
    let formId = url.searchParams.get('form_id') || '';

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
