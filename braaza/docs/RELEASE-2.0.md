# BRAAZA / Cinematic 2.0: entrega e verificação

Base: `f0e603c9a37e22e47566797becbd042e9edf87a3`. Escopo restrito a `braaza/`. A recuperação retoma a direção da prévia de implementação aprovada pelo usuário, mantendo a concept escura como referência visual. Não é uma certificação de identidade pixel a pixel.

## Implementado

Arquitetura dirigida em malhas: fornalhas superior/inferior, escadaria, pontes, arcos, colunas trabalhadas, torres, fragmentos e banners. Os quatro grupos de correntes usam instancing com 56 elos por grupo, movimento em sentidos opostos e reciclagem fora do enquadramento. O vidro tem volume fechado de 0,31 unidade, chanfros, mídia interna, transmissão e reflexos seletivos. O piso usa uma câmera refletida, não somente uma mancha procedural de luz.

O renderer integra seis luzes, duas projeções de sombra PCF, BRDF GGX, probe HDR do próprio ambiente, AO, lava com fluxo, fogo premultiplicado, atmosfera em resolução reduzida e distorção térmica localizada. Partículas permanecem em uma camada separada para não herdar o desfoque da parede. O resolve óptico usa velocidade atual/anterior de objetos e câmera; o warp da lente também é aplicado ao picking. O bloom tem cinco escalas com filtros normalizados e ganho artístico independente. O lens flare das duas fontes principais consulta a profundidade da câmera.

Pausa, redução de movimento, scroll, arraste, toque, teclado, Home, galeria, modal e escolha de qualidade permanecem. Há invalidação de histórico em Home, resize e retorno de visibilidade. A restauração real de contexto foi exercitada. Corrigida também a consulta de estado durante uma inicialização ainda incompleta: `inspect()` retorna `ready: false` em vez de acessar uma projeção inexistente.

## Resultados desta execução

| Verificação | Resultado |
| --- | --- |
| Node, incluindo os 21 testes originais | 41/41 |
| Renderização, pixels e interação desktop/mobile | 46/46 |
| Ciclo de vida, contexto, memória, velocidade e caminho sem HDR | 10/10 |
| Build estático | 49 arquivos; 123960 bytes antes de compressão HTTP |

As verificações de GPU usam Chromium/WebGL2 real com renderização por software neste ambiente. Nenhum erro JavaScript ou WebGL apareceu nos cenários aprovados. Foram lidos os attachments reais, verificadas radiâncias finitas, emissão acima de 1, efeito da reflexão, sombras, bloom e atmosfera, visibilidade do flare e contraste de centelhas. O teste de prontidão foi visto falhar antes da correção e passar depois.

As 46 verificações são executadas por `tests/browser-cinematic.py`; as 10 adicionais por `tests/lifecycle.py`. Os scripts antigos são aliases, não testes adicionais. Logs, medições completas e capturas reais acompanham o ZIP de entrega. Os relatórios em `docs/audit/` pertencem à versão anterior e não foram reapresentados como resultados desta versão.

A navegação de rede do Chromium foi bloqueada pela política do ambiente, inclusive em localhost. O harness modifica apenas o transporte de módulos, shaders e assets para Blob URLs. Não substitui shaders ou renderização por mocks. A publicação deve ser conferida separadamente por estado READY, SHA do commit e manifesto de fontes, sem afirmar que esses checks equivalem a uma captura 3D direta do domínio público.

## Limites e decisões de implementação

A prévia atual preserva o conjunto visual aprovado, mas a arquitetura e alguns detalhes de material continuam sendo aproximações da concept. A torre/céu muito distantes usam um pequeno recorte documentado em uma malha a z=-65; cards, correntes, primeiro e segundo planos não são uma imagem de fundo.

O reflexo do vidro combina cubemap, luzes locais e captura de cena; não é ray tracing. Os mipmaps do probe aproximam rugosidade, sem convolução GGX completa. A dinâmica visual usa molas e deslocamento dirigido, não colisões físicas entre todos os elos. O modo automático escolhe o perfil por viewport e limita memória; não há alegação de ajuste de FPS ativo. Motion blur é limitado e desligado no perfil mobile/leve.

Não foi medido desempenho em GPU física, celular real, Safari ou Firefox; não se promete 60 FPS com base nos testes por software. Não há validação de vídeos reais do portfólio, pois os quatro itens publicados continuam sendo demos explicitamente identificadas. A suíte verifica o modal e decodificação das demos, não atribui mídia fictícia como trabalho real.

Revisão final feita pelo próprio implementador, sem revisor independente. Código, shaders e assets enviados ao repositório devem corresponder aos hashes da build testada. Não há alteração autorizada nos outros sites do monorepo.
