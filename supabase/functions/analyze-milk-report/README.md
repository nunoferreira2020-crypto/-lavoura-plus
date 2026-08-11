# Leitura de análises do leite

Esta Edge Function recebe uma imagem JPEG autenticada, envia-a ao serviço de visão e devolve apenas campos com confiança mínima de 75%.

Antes do deploy, configure a chave exclusivamente nos secrets do Supabase:

```sh
supabase secrets set OPENAI_API_KEY=...
supabase functions deploy analyze-milk-report
```

Opcionalmente, `OPENAI_VISION_MODEL` permite alterar o modelo sem modificar o frontend. A imagem não é guardada pela função e o pedido ao modelo usa `store: false`.
