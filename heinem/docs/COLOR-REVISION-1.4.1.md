# HEINEM: calibração de cor 1.4.1 → 1.4.2

## Referência e intenção
Feedback direto do usuário com fotografia de gramado, nuvens e céu azul acinzentado: o visual é **Frutiger Aero mais contido**, esverdeado e levemente azulado, com menos cores fortes e menos realces chamativos. Não deve parecer tropical, neon, dourado ou sombrio.

A revisão 1.4.1 ainda parecia saturada porque `contrast(1.045)` foi aplicado à folhagem e `contrast(1.04)` ao campo, reacentuando altas luzes e verdes mesmo com saturação .78/.80.

## Novo ajuste por camada

| Camada | Saturação | Hue rotate | Brilho | Contraste |
| --- | ---: | ---: | ---: | ---: |
| Céu | .64 | -5° | .94 | .94 |
| Folhagem distante, intermediária e árvore | .56 | 14° | .92 | .92 |
| Campo contínuo, incluindo tiles de detalhe | .63 | 11° | .92 | .94 |

Fundo de fallback do mundo: `#455a56`. As cores são modulações CSS sobre os assets aprovados; **não há novas imagens, máscaras, gradientes de camada ou mudança de profundidade**.

A bolha reproduz uma aproximação dessaturada por camada amostrada em GLSL. O filme, elasticidade, glifos, brilho, malha e orçamentos gráficos permanecem iguais. O RGB original de rosto, capas, controles e texto não recebe filtros globais.

## QA
- Testes do navegador verificam que saturação de todos os planos é <=.65, contraste é <1, retrato e bolha não recebem filtro CSS externo, quatro perfis sociais permanecem e existe apenas um campo contínuo.
- Conferência de desempenho: é a mesma passagem WebGL, sem nova textura, framebuffer ou animação; o trabalho de correção é uma operação aritmética local.
- Parâmetros são escolhas artísticas orientadas pela referência. Sem screenshot da versão publicada e comparativo pixel a pixel não alegar fidelidade perfeita; monitores físicos podem exibir intensidades diferentes.

## Deploy
GitHub main → integração Git da Vercel → confirmação de commit SHA em produção. Não executar upload manual paralelo.
