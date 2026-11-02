# Validação executada | 02/11/2026

## Resultados

- 83 testes unitários passaram. Incluem os 70 testes anteriores e 13 regressões de integração, permissões, orçamento de renderização, HTML seguro, CSP e contexto do dispositivo.
- 14 verificações comerciais no build compilado passaram: teclado, comandos e estado da interface, iframe de origem autorizada, rejeição de janela incorreta, catálogo sem JavaScript, falha de WebGL, economia de dados, créditos e ausência de requisições externas de runtime.
- Axe-core 4.11.0 não apontou violações automáticas nos seis estados examinados: visão geral, detalhe, menu, sobre, busca e catálogo textual. Contraste sobre o canvas nas duas primeiras vistas requer revisão manual. Isso não certifica WCAG nem substitui NVDA/VoiceOver.
- 15 verificações de interiores e 15 regressões de movimento passaram no build compilado. Um timeout da suíte de movimento com dois browsers concorrentes por CPU não se repetiu na execução isolada. Nenhuma correção foi feita no renderizador para acomodar o teste.
- `npm ci --ignore-scripts`, testes e build concluídos. Vite atualizado de 7.1.12 para 7.3.7, na mesma versão principal. `npm audit` completo, incluindo dependências de desenvolvimento, reportou zero vulnerabilidades conhecidas na verificação desta data. Isso não constitui certificação de segurança.
- Integridade dos nove arquivos do manifesto e seus metadados de origem/licença verificada; textos de quatro pacotes de software/fontes incluídos nos avisos. Hashes comprovam identidade de bytes, não titularidade jurídica.

## Tamanho e apresentação

O build mediu 945.739 bytes de JavaScript combinado, ou 291.154 bytes em gzip. Esses valores não incluem modelos, texturas, fontes ou HTML. A soma de todos os modelos, incluindo variantes high/eco, é 14.700.288 bytes e não representa o download inicial. O bootstrap separado mantém a rota textual disponível sem iniciar WebGL.

Comparação do recorte central da cena (600×570 em tela 1366×768, qualidade baixa, DPR 1): diferença média por canal 0 em relação à versão pública anterior. Isso valida somente essa captura, não todas as vistas. O arquivo do renderizador e os assets permaneceram inalterados; foco/contraste e acesso ao catálogo são mudanças intencionais na interface.

## Ambiente e limitações

Chromium 141 e Playwright 1.56.1, renderização por software em sandbox Linux. A suíte de integração executou sem desabilitar a segurança web do navegador e com os cabeçalhos CSP planejados para produção. Tempos locais isolados de inicialização não são apresentados como SLA ou desempenho de celular.

Ainda pendentes: medições em aparelhos físicos, Safari/WebKit, testes manuais de acessibilidade, revisão técnica da geometria/textos, direitos de código/assets/marca, contrato e autorização do destinatário antes de envio de proposta. A camada de comandos é genérica; a generalização completa do renderizador ainda não foi concluída.

Nenhum e-mail, proposta, imagem, código ou link foi enviado à SpaceX nesta etapa. O arquivo de abordagem é apenas um rascunho local do projeto.
