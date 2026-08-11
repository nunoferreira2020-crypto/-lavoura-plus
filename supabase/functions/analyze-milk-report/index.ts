import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const json = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  }
)

const fieldSchema = (type: 'number' | 'string') => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: [type, 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: ['value', 'confidence']
})

const extractedFieldNames = [
  'analysis_date',
  'fat',
  'protein',
  'somatic_cells',
  'cfu'
] as const

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405)
  }

  const authorization = request.headers.get('Authorization')

  if (!authorization) {
    return json({ error: 'Sessão inválida.' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } }
  )
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    return json({ error: 'Sessão inválida.' }, 401)
  }

  try {
    const { image } = await request.json()

    if (
      typeof image !== 'string' ||
      !image.startsWith('data:image/jpeg;base64,') ||
      image.length > 8_000_000
    ) {
      return json({ error: 'Imagem inválida ou demasiado grande.' }, 400)
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured')
      return json({ error: 'O serviço de leitura não está configurado.' }, 503)
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4.1-mini',
        store: false,
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Extract values only when explicitly visible in this milk laboratory report. Never infer or invent values. Date must be YYYY-MM-DD. fat and protein are percentages. somatic_cells and cfu are integer counts. Give confidence from 0 to 1 for each field; use null and confidence 0 when absent or ambiguous.'
            },
            { type: 'input_image', image_url: image, detail: 'high' }
          ]
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'milk_report',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                analysis_date: fieldSchema('string'),
                fat: fieldSchema('number'),
                protein: fieldSchema('number'),
                somatic_cells: fieldSchema('number'),
                cfu: fieldSchema('number')
              },
              required: ['analysis_date', 'fat', 'protein', 'somatic_cells', 'cfu']
            }
          }
        }
      })
    })

    if (!response.ok) {
      console.error('Vision provider error', response.status)
      return json({ error: 'O serviço não conseguiu analisar a imagem.' }, 502)
    }

    const result = await response.json()
    const outputText = result.output
      ?.flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content || [])
      .find((item: { type: string }) => item.type === 'output_text')
      ?.text

    if (!outputText) {
      return json({ error: 'Não foi possível interpretar a resposta da análise.' }, 502)
    }

    const extracted = JSON.parse(outputText)
    const threshold = 0.75
    const validValue = (name: string, value: unknown) => {
      if (name === 'analysis_date') {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false
        }

        const [year, month, day] = value.split('-').map(Number)
        const parsed = new Date(Date.UTC(year, month - 1, day))

        return parsed.getUTCFullYear() === year &&
          parsed.getUTCMonth() === month - 1 &&
          parsed.getUTCDate() === day
      }

      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return false
      }

      if (name === 'fat' || name === 'protein') {
        return value <= 100
      }

      return Number.isInteger(value) && value <= 2_147_483_647
    }
    const fields = Object.fromEntries(
      extractedFieldNames.map(name => {
        const field = extracted?.[name]
        const candidate = field as { value?: unknown; confidence?: unknown } | null
        const confidence = typeof candidate?.confidence === 'number' &&
          Number.isFinite(candidate.confidence)
          ? candidate.confidence
          : 0
        return [name, confidence >= threshold && validValue(name, candidate?.value)
          ? candidate
          : { value: null, confidence }]
      })
    )
    const missing = Object.values(fields)
      .filter(field => (field as { value: unknown }).value === null)
      .length

    return json({
      fields,
      warning: missing
        ? `${missing} campo(s) não foram reconhecidos com confiança suficiente e ficaram vazios.`
        : null
    })
  } catch (error) {
    console.error('analyze-milk-report', error)
    return json({ error: 'Não foi possível processar a imagem.' }, 500)
  }
})
