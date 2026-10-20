# Revisão de qualidade antes de publicar um portfólio/site

**Finalidade:** roteiro para o site publicado pelo Checkpoint Portfolio e para outros sites estáticos do projeto. É uma lista de verificação, **não uma afirmação de que o app ou os sites publicados já estão legalmente conformes**. Revisão documental iniciada em 20/10/2026, a partir de 17 pontos fornecidos pelo autor.

## 17 verificações, com aplicabilidade
| # | Tema | Verificação prática |
| --- | --- | --- |
| 1 | Política de privacidade | Descrever **coleta real** de dados, hospedagem, formulários, terceiros, finalidades, contatos e direitos. |
| 2 | Termos de serviço | Criar termos adequados quando contas, serviços contratados ou compras justificarem; não inserir termos artificiais. |
| 3 | Aviso de cookies | Inventariar cookies e armazenamento; comunicar e oferecer opções/consentimento quando aplicável. Site sem cookies não exige banner ornamental. |
| 4 | Reembolso | Para venda de produtos/serviços, descrever política sem restringir direitos legais; fora de comércio pode ser N/A. |
| 5 | Formulários e LGPD | Minimizar campos, informar finalidade, proteger dados e validar o fluxo de envio. |
| 6 | Minimização | Coletar e reter somente o necessário para finalidades legítimas. |
| 7 | Scripts de tracking | Auditar pixels, analytics, embeds, gerenciadores de tags e tráfego antes de consentimento quando exigido. |
| 8 | Acessibilidade | Verificar semântica, rótulos, leitura assistiva, foco, formulários, zoom e animação reduzida. |
| 9 | Alt nas imagens | Descrever imagens significativas; para puramente decorativas usar `alt=""`. |
| 10 | Contraste | Avaliar texto sobre fundos reais: WCAG AA, em regra 4,5:1 (texto normal) e 3:1 (grande); verificar elementos não textuais pertinentes. |
| 11 | Teclado | Toda navegação funcional por Tab/Shift+Tab, Enter, Espaço e Esc conforme o componente; foco visível. |
| 12 | Avaliações falsas | Não fabricar depoimentos, notas, clientes nem screenshots de resultados. |
| 13 | Promessas falsas | Confirmar disponibilidade, prazos e resultados alegados; diferenciar demo e entrega real. |
| 14 | Copyright de imagens | Confirmar autorizações/licenças de fotos, vídeos, fontes e outros assets; crédito sozinho não concede direito. |
| 15 | Dados da empresa | Exibir informações verdadeiras e exigidas pelo tipo de serviço/comércio; nunca inventar CNPJ ou endereço. |
| 16 | Conformidade LGPD | Rever bases legais, direitos dos titulares, fornecedores, segurança e retenção; banner não equivale a conformidade. |
| 17 | Riscos jurídicos | Registrar riscos e pendências por jurisdição, acessibilidade, consumo, publicidade, privacidade e autoria. Não prometer risco zero. |

## Adaptação ao Checkpoint Portfolio
- O editor pode gerar portfólios estáticos sem login do visitante, checkout ou formulário. **Não adicionar automaticamente** popup de cookies, termos ou política de reembolso quando não há fato que os justifique; primeiro verificar o projeto e os serviços de hospedagem/terceiros.
- Se o proprietário configurar botões de contato, formulários, analytics, embeds, pixels ou vendas, reavaliar os tópicos pertinentes. A responsabilidade pelo conteúdo comercial e pela identidade do titular precisa ser confirmada com ele.
- No pipeline de publicação, separar: **código íntegro**, **deploy pronto**, **acessibilidade verificada**, **coleta de dados verificada** e **revisão jurídica**. Um não prova os outros.

## Checklist de execução
1. Registrar perfil do site, jurisdições, serviços externos e inventário de dados.
2. Marcar os itens `APLICÁVEL`, `N/A (motivo)`, `PENDENTE` e salvar fontes/evidências.
3. Testar com teclado e zoom, conferir contraste e alternativas de imagens.
4. Examinar DevTools Network/Storage em sessão limpa, antes/depois de escolhas de privacidade.
5. Verificar licenças, depoimentos, promessas, contatos e textos contra informações reais.
6. Documentar URL final, commit, testes e pendências; solicitar revisão jurídica quando necessário.

## Referências
- [Guia ANPD para cookies e proteção de dados](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais)
- [Princípios da LGPD](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd/principios)
- [Código de Defesa do Consumidor, art. 49 quando pertinente](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [W3C WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)

**Limites:** os 17 tópicos têm origem na imagem fornecida pelo autor; a interpretação e o protocolo são síntese técnica, não uma declaração de conformidade nem uma atribuição de cada detalhe ao autor.
