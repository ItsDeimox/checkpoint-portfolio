# Borboletas: voo natural contido (HEINEM 1.5.6)

## Observação e objetivos
O usuário pediu voo mais natural e **menos poluição visual**, mantendo o HEINEM já aprovado. Antes eram **14 sprites** em trajetórias lineares muito parecidas (8 no Hero, 6 na seção de CD), com batidas individuais lentas e asas direita/esquerda propositalmente defasadas em meio período. O resultado parecia um enxame de partículas decorativas.

## Base biomecânica
- Fei & Yang (2015), *Physical Review E* 92, 033004: borboletas variam significativamente a velocidade translacional dentro do ciclo de batidas; o deslocamento não é constante. DOI: https://doi.org/10.1103/PhysRevE.92.033004
- Johansson et al. (2021), *Journal of the Royal Society Interface* 18, 20200854: as asas flexíveis atuam como um par no clap no upstroke; downstroke fornece suporte de peso, e o impulso muda ao longo do ciclo. DOI: https://doi.org/10.1098/rsif.2020.0854
- Fei & Yang (2016), *Physical Review E* 93, 033124: inclinação/rotação do corpo altera o controle da direção. DOI: https://doi.org/10.1103/PhysRevE.93.033124
- Brackenbury (1991), *Journal of Zoology* 224, 251–270: flexão e movimentos tridimensionais das asas no voo. DOI: https://doi.org/10.1111/j.1469-7998.1991.tb04803.x

**Nota:** isto é animação inspirada em mecânica, não simulação aerodinâmica por CFD nem parametrização de uma espécie específica. Os 6–7 Hz são valores visuais de design para a escala reduzida dos sprites; não constituem medição de frequência da espécie.

## Implementação
- Exatamente **3 sprites no Hero e 1 no Music** (somente 2 Hero no mobile; qualidade Low mostra só 1), distribuídos pelas bordas, longe do rosto/bolha/letras/controles.
- Uma trajetória distinta por sprite com spline Catmull-Rom fechada e avanço suave no tempo; variações de aceleração são contínuas e determinísticas, sem aleatoriedade por frame.
- Uma única fase de batida aciona as asas esquerda/direita **sincronizadas**, com amplitudes opostas ao redor do tórax; pequeno pitch do corpo e bobbing sincronizado, banking nas curvas e micro-glides eventuais.
- Um único RAF ativo quando o setor está visível. Sem redesenhar imagens, sem múltiplas animações CSS simultâneas por asa, sem WebGL adicional. Retângulos de seções são medidos somente em resize/ResizeObserver, nunca dentro do quadro de animação.
- Preferências gráficas e redução de movimento respeitadas; listeners, observadores e RAF são liberados em destroy.

## Validação
- Testes de Node: número máximo de sprites, fechamento da curva, continuidade numérica, amplitude e periodicidade da batida, glide, velocidade variável e determinismo.
- Testes de browser: sprites sem hit targets, asas espelhadas sincronizadas, mudança real de posição, pausa fora do setor, CD clicável e movimento reduzido.
- Isto não garante correspondência com a filmagem de uma espécie específica nem FPS constante em todo hardware. Aceite final visual em desktop/celular.
- Publicação por commit na main do GitHub e integração Git da Vercel, sem deploy manual paralelo.
