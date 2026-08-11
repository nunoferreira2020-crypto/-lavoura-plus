# Leitura automática de análises do leite

A Edge Function `analyze-milk-report` recebe uma imagem JPEG autenticada, envia-a ao serviço de visão e devolve apenas os campos `analysis_date`, `fat`, `protein`, `somatic_cells` e `cfu` com confiança mínima de 75%.

A função nunca guarda automaticamente uma análise. O frontend usa os valores apenas para preencher o formulário, que continua dependente da confirmação do utilizador antes de guardar.

## Configuração

Configure a chave exclusivamente nos secrets do Supabase:

```sh
supabase secrets set OPENAI_API_KEY=...
supabase functions deploy analyze-milk-report
```

Opcionalmente, pode definir o modelo sem alterar o frontend:

```sh
supabase secrets set OPENAI_VISION_MODEL=gpt-4.1-mini
```

A imagem não é guardada pela função e o pedido ao modelo usa `store: false`.
