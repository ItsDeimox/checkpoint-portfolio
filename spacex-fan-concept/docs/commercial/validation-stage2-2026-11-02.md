# Validação entre navegadores e controle de origem | 02/11/2026

## Implementado

- Recuperação após perda temporária do contexto WebGL. O renderizador para durante a perda, libera os recursos da GPU no momento correto e reconstrói environment, reflexos e bloom quando o navegador restaura o contexto. A seleção, rotação, zoom e modo interno são preservados. Os buffers e imagens originais ficam em CPU; nenhuma geometria de substituição é criada.
- Correção da descrição acessível e da API: a variante Dragon era anunciada como PAYLOAD FAIRING. Agora o estado contém variante e título efetivamente selecionados, sem inserir regras SpaceX no módulo genérico de sessão.
- Verificação de autor, licença e origem contidos nos oito GLBs publicados, além dos hashes existentes. Ausência ou divergência interrompe o build. Metadados consistentes não equivalem a aprovação jurídica ou precisão de engenharia.

## Evidência

95 testes unitários passaram. A matriz compilada passou em 12 cenários por motor, totalizando 36 verificações: Chromium 156.0.8078.4, Firefox 157.0 e WebKit 27.2, instalados por Playwright 1.64.0. O JSON adjacente registra cada cenário e versão.

Cobertura: environment HDR, bloom Alto, rotação XY, módulos internos existentes, descrição da Dragon, teclado, retorno após navegação, carrossel seguindo o toque, enquadramento vertical, pausa em repouso, duas perdas/restaurações de contexto por motor e identidade dos assets. Nenhum erro de página ou shader permaneceu na execução final. Capturas de tela reais foram geradas; o estado recuperado do WebKit foi inspecionado visualmente.

A implementação inicial da recuperação gerou erros WebKit ao tentar apagar objetos do contexto anterior depois da restauração. A liberação foi movida para o evento de perda, e o teste voltou a passar sem suprimir mensagens de erro.

## Ambiente e limites

Ubuntu 26.04, renderização por software. Firefox foi executado com interface sob Xvfb: no modo headless desse ambiente, a criação de WebGL2 foi bloqueada. Não foram usados flags para desativar a segurança web nem preferências especiais do Firefox. WebKit em Linux não é o Safari distribuído pela Apple nem um iPhone físico.

Estes testes não certificam FPS em aparelhos, todos os navegadores ou acessibilidade com leitores de tela reais. A recuperação depende de o navegador restaurar o contexto; quando isso não ocorre, recarregar e abrir o catálogo textual continuam disponíveis.

## Modelos

Nenhum asset ou material de foguete foi alterado. O candidato gratuito de Crew Dragon foi avaliado e rejeitado como substituição, conforme `model-acceptance-2026-11-02.md`. Continuam pendentes a fidelidade técnica completa, os interiores ausentes, dispositivos físicos, avaliação manual com tecnologias assistivas e revisão de direitos/contrato. Nenhum contato ou compra foi realizado.
